import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { SMSService } from './notification';

const prisma = new PrismaClient();

// TOTP Configuration
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // seconds
const TOTP_ALGORITHM = 'sha1';
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

// Generate a base32-encoded secret for TOTP
export function generateTotpSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

// Base32 encoding (RFC 4648)
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += alphabet[(value >>> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

// Base32 decoding
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanInput = encoded.toUpperCase().replace(/=+$/, '');

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of cleanInput) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }

  return Buffer.from(output);
}

// Generate TOTP token
function generateTotp(secret: string, timestamp?: number): string {
  const time = timestamp ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(time / TOTP_PERIOD);

  const counterBuffer = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = counter & 0xff;
    // Counter right shift by 8
  }
  // Properly handle 64-bit counter
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  const key = base32Decode(secret);
  const hmac = crypto.createHmac(TOTP_ALGORITHM, key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_DIGITS);

  return code.toString().padStart(TOTP_DIGITS, '0');
}

// Verify TOTP token (with time window for clock drift)
export function verifyTotp(secret: string, token: string): boolean {
  const now = Math.floor(Date.now() / 1000);

  // Allow 1 period before and after for clock drift
  for (let i = -1; i <= 1; i++) {
    const expectedToken = generateTotp(secret, now + (i * TOTP_PERIOD));
    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
      return true;
    }
  }

  return false;
}

// Generate otpauth URI for QR code
export function generateTotpUri(secret: string, email: string, issuer: string = 'HospitalERP'): string {
  const encodedEmail = encodeURIComponent(email);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=${TOTP_ALGORITHM.toUpperCase()}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

// Generate backup codes
export function generateBackupCodes(): { codes: string[]; hashedCodes: string[] } {
  const codes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = crypto.randomBytes(BACKUP_CODE_LENGTH / 2).toString('hex').toUpperCase();
    codes.push(code);
    hashedCodes.push(hashBackupCode(code));
  }

  return { codes, hashedCodes };
}

// Hash a backup code
function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

// Verify and consume a backup code
export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const twoFactor = await prisma.userTwoFactor.findUnique({
    where: { userId },
  });

  if (!twoFactor || !twoFactor.backupCodes.length) {
    return false;
  }

  const hashedCode = hashBackupCode(code);
  const codeIndex = twoFactor.backupCodes.findIndex(bc => bc === hashedCode);

  if (codeIndex === -1) {
    return false;
  }

  // Remove used backup code
  const updatedCodes = [...twoFactor.backupCodes];
  updatedCodes.splice(codeIndex, 1);

  await prisma.userTwoFactor.update({
    where: { userId },
    data: {
      backupCodes: updatedCodes,
      lastUsedAt: new Date(),
    },
  });

  return true;
}

// Generate SMS OTP
export function generateSmsOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Send SMS OTP
export async function sendSmsOtp(phone: string, userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const otp = generateSmsOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in Redis or database (using simple in-memory for now)
    // In production, use Redis with TTL
    await prisma.$executeRaw`
      INSERT INTO sms_otps (user_id, otp_hash, expires_at)
      VALUES (${userId}, ${hashBackupCode(otp)}, ${expiresAt})
      ON CONFLICT (user_id)
      DO UPDATE SET otp_hash = ${hashBackupCode(otp)}, expires_at = ${expiresAt}
    `.catch(() => {
      // Table might not exist, fall back to notification service
    });

    // Send via SMS service
    const smsService = new SMSService();
    await smsService.send(
      phone,
      `Your HospitalERP verification code is: ${otp}. Valid for 5 minutes.`,
      'HIGH'
    );

    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Failed to send SMS OTP:', error);
    return { success: false, message: 'Failed to send OTP' };
  }
}

// 2FA Service Functions
export const twoFactorService = {
  // Enable TOTP for a user
  async enableTotp(userId: string): Promise<{ secret: string; uri: string; backupCodes: string[] }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const secret = generateTotpSecret();
    const uri = generateTotpUri(secret, user.email);
    const { codes, hashedCodes } = generateBackupCodes();

    await prisma.userTwoFactor.upsert({
      where: { userId },
      create: {
        userId,
        method: 'totp',
        totpSecret: secret, // In production, encrypt this
        totpVerified: false,
        backupCodes: hashedCodes,
      },
      update: {
        totpSecret: secret,
        totpVerified: false,
        backupCodes: hashedCodes,
      },
    });

    return { secret, uri, backupCodes: codes };
  },

  // Verify TOTP setup (confirm user has set up authenticator)
  async verifyTotpSetup(userId: string, token: string): Promise<boolean> {
    const twoFactor = await prisma.userTwoFactor.findUnique({
      where: { userId },
    });

    if (!twoFactor?.totpSecret) {
      throw new Error('TOTP not set up');
    }

    if (!verifyTotp(twoFactor.totpSecret, token)) {
      return false;
    }

    await prisma.userTwoFactor.update({
      where: { userId },
      data: {
        totpVerified: true,
        enabledAt: new Date(),
      },
    });

    return true;
  },

  // Enable SMS 2FA
  async enableSms(userId: string, phone: string): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const { codes, hashedCodes } = generateBackupCodes();

    await prisma.userTwoFactor.upsert({
      where: { userId },
      create: {
        userId,
        method: 'sms',
        smsEnabled: true,
        smsPhone: phone,
        backupCodes: hashedCodes,
      },
      update: {
        method: 'sms',
        smsEnabled: true,
        smsPhone: phone,
        backupCodes: hashedCodes,
      },
    });

    return { success: true, message: 'SMS 2FA enabled' };
  },

  // Disable 2FA
  async disable2FA(userId: string): Promise<void> {
    await prisma.userTwoFactor.delete({
      where: { userId },
    }).catch(() => {
      // Ignore if doesn't exist
    });
  },

  // Get 2FA status for a user
  async getStatus(userId: string): Promise<{
    enabled: boolean;
    method: string | null;
    totpEnabled: boolean;
    smsEnabled: boolean;
    backupCodesRemaining: number;
  }> {
    const twoFactor = await prisma.userTwoFactor.findUnique({
      where: { userId },
    });

    if (!twoFactor) {
      return {
        enabled: false,
        method: null,
        totpEnabled: false,
        smsEnabled: false,
        backupCodesRemaining: 0,
      };
    }

    return {
      enabled: twoFactor.totpVerified || twoFactor.smsEnabled,
      method: twoFactor.method,
      totpEnabled: twoFactor.totpVerified,
      smsEnabled: twoFactor.smsEnabled,
      backupCodesRemaining: twoFactor.backupCodes.length,
    };
  },

  // Verify 2FA during login
  async verify(userId: string, token: string, method: 'totp' | 'sms' | 'backup'): Promise<boolean> {
    const twoFactor = await prisma.userTwoFactor.findUnique({
      where: { userId },
    });

    if (!twoFactor) {
      return false;
    }

    let isValid = false;

    if (method === 'totp' && twoFactor.totpSecret) {
      isValid = verifyTotp(twoFactor.totpSecret, token);
    } else if (method === 'backup') {
      isValid = await verifyBackupCode(userId, token);
    }
    // SMS verification would be handled separately with stored OTP

    if (isValid) {
      await prisma.userTwoFactor.update({
        where: { userId },
        data: { lastUsedAt: new Date() },
      });
    }

    return isValid;
  },

  // Regenerate backup codes
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const twoFactor = await prisma.userTwoFactor.findUnique({
      where: { userId },
    });

    if (!twoFactor) {
      throw new Error('2FA not enabled');
    }

    const { codes, hashedCodes } = generateBackupCodes();

    await prisma.userTwoFactor.update({
      where: { userId },
      data: { backupCodes: hashedCodes },
    });

    return codes;
  },
};

export default twoFactorService;
