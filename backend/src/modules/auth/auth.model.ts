import { z } from 'zod';

// Mobile login uses the same User table as the desktop portal so a doctor or
// patient-linked account can move between web and mobile. We keep a separate
// Zod schema (rather than reusing the desktop loginSchema) because mobile
// inputs may add a `deviceId` later for FCM/APNS registration in one call.
export const mobileLoginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  deviceId: z.string().max(200).optional(),
  platform: z.enum(['ios', 'android']).optional(),
});
export type MobileLoginInput = z.infer<typeof mobileLoginSchema>;

// Phase-2 OTP login. SMS provider has to be live for these to work; the
// route handlers are wired and return a clear "not configured" if the
// provider is still 'mock'.
export const requestOtpSchema = z.object({
  phone: z.string().min(7).max(20),
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: z.string().min(7).max(20),
  code: z.string().length(6),
  deviceId: z.string().max(200).optional(),
  platform: z.enum(['ios', 'android']).optional(),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// Self-signup — a new patient creating their own account + Patient record
// from the mobile app, mirroring the fields staff fill in on the desktop
// registration form (frontend/src/pages/PatientRegistration.tsx).
const phoneRegex = /^[+]?[\d\s-]{10,15}$/;

export const signupSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  name: z.string().min(1).max(200),
  email: z.string().email('Invalid email'),
  contact: z.string().regex(phoneRegex, 'Invalid phone number'),
  dob: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  bloodGroup: z.string().max(10).optional().nullable(),
  allergies: z.string().max(1000).optional().nullable(),
  emergencyContact: z.string().max(200).optional().nullable(),
  deviceId: z.string().max(200).optional(),
  platform: z.enum(['ios', 'android']).optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;

export interface MobileLoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    roleIds: string[];
    permissions: string[];
    tenantId: string;
    branchId: string;
    // For patient-app users, this points at their Patient row. Doctor-app
    // users won't have this set.
    patientId: string | null;
    // Display flags so the mobile shell can decide which app surface to show.
    isDoctor: boolean;
    isPatient: boolean;
  };
}
