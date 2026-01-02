import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Smartphone,
  Key,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface TwoFactorStatus {
  enabled: boolean;
  method: string | null;
  totpEnabled: boolean;
  smsEnabled: boolean;
  backupCodesRemaining: number;
}

export function TwoFactorSetup() {
  const { token } = useAuth();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'choose' | 'totp-setup' | 'totp-verify' | 'sms-setup' | 'complete'>('choose');
  const [totpData, setTotpData] = useState<{ secret: string; uri: string; backupCodes: string[] } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState<number | null>(null);

  // Fetch 2FA status on mount
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/2fa/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch 2FA status:', err);
    }
  };

  // Initialize TOTP setup
  const startTotpSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/2fa/totp/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.success) {
        setTotpData({
          secret: data.secret,
          uri: data.otpauthUri,
          backupCodes: data.backupCodes,
        });
        setStep('totp-setup');
      } else {
        setError(data.message || 'Failed to initialize TOTP setup');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Verify TOTP setup
  const verifyTotp = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/2fa/totp/verify-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: verificationCode }),
      });
      const data = await res.json();

      if (data.success) {
        setStep('complete');
        setSuccess('Two-factor authentication has been enabled!');
        fetchStatus();
      } else {
        setError(data.message || 'Invalid verification code');
      }
    } catch (err) {
      setError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  // Enable SMS 2FA
  const enableSms = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/2fa/sms/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (data.success) {
        setStep('complete');
        setSuccess('SMS two-factor authentication has been enabled!');
        fetchStatus();
      } else {
        setError(data.message || 'Failed to enable SMS 2FA');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Disable 2FA
  const disable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication?')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: 'placeholder' }), // Would need actual password
      });
      const data = await res.json();

      if (data.success) {
        setStatus(null);
        setStep('choose');
        setSuccess('Two-factor authentication has been disabled');
        fetchStatus();
      } else {
        setError(data.message || 'Failed to disable 2FA');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Regenerate backup codes
  const regenerateBackupCodes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/2fa/backup-codes/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: 'placeholder' }),
      });
      const data = await res.json();

      if (data.success) {
        setTotpData(prev => prev ? { ...prev, backupCodes: data.backupCodes } : null);
        setSuccess('New backup codes generated!');
      } else {
        setError(data.message || 'Failed to regenerate backup codes');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Copy backup code to clipboard
  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(index);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Download backup codes as text file
  const downloadBackupCodes = () => {
    if (!totpData?.backupCodes) return;
    const content = `HospitalERP Backup Codes\n\nKeep these codes safe. Each code can only be used once.\n\n${totpData.backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nGenerated: ${new Date().toISOString()}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hospitalerp-backup-codes.txt';
    a.click();
  };

  // Generate QR code URL (using QR code API)
  const getQRCodeUrl = (uri: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;
  };

  // Fetch status on component mount
  useState(() => {
    fetchStatus();
  });

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Status display when 2FA is enabled */}
      {status?.enabled && step === 'choose' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                  <CardDescription>Your account is protected</CardDescription>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Enabled</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium">Method</p>
                  <p className="text-sm text-slate-500">
                    {status.totpEnabled ? 'Authenticator App' : 'SMS'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium">Backup Codes</p>
                  <p className="text-sm text-slate-500">
                    {status.backupCodesRemaining} codes remaining
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={regenerateBackupCodes} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>
            <div className="pt-4 flex justify-end">
              <Button variant="destructive" onClick={disable2FA} disabled={loading}>
                Disable 2FA
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup wizard when 2FA is not enabled */}
      {!status?.enabled && step === 'choose' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Enable Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="totp" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="totp">Authenticator App</TabsTrigger>
                <TabsTrigger value="sms">SMS</TabsTrigger>
              </TabsList>
              <TabsContent value="totp" className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <h4 className="font-medium">How it works:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                    <li>Download an authenticator app (Google Authenticator, Authy, etc.)</li>
                    <li>Scan the QR code with the app</li>
                    <li>Enter the 6-digit code to verify</li>
                  </ol>
                </div>
                <Button onClick={startTotpSetup} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}
                  Set Up Authenticator
                </Button>
              </TabsContent>
              <TabsContent value="sms" className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <h4 className="font-medium">How it works:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                    <li>Enter your phone number</li>
                    <li>Receive a code via SMS when logging in</li>
                    <li>Enter the code to verify your identity</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button onClick={() => setStep('sms-setup')} disabled={!phone || loading} className="w-full">
                  Enable SMS 2FA
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* TOTP Setup - QR Code */}
      {step === 'totp-setup' && totpData && (
        <Card>
          <CardHeader>
            <CardTitle>Scan QR Code</CardTitle>
            <CardDescription>
              Scan this code with your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg shadow-inner">
                <img
                  src={getQRCodeUrl(totpData.uri)}
                  alt="TOTP QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Manual Entry Code</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-slate-100 rounded font-mono text-sm break-all">
                  {totpData.secret}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(totpData.secret);
                    setSuccess('Secret copied!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button onClick={() => setStep('totp-verify')} className="w-full">
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* TOTP Verify */}
      {step === 'totp-verify' && (
        <Card>
          <CardHeader>
            <CardTitle>Verify Setup</CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('totp-setup')} className="flex-1">
                Back
              </Button>
              <Button onClick={verifyTotp} disabled={loading || verificationCode.length !== 6} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Verify
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SMS Setup */}
      {step === 'sms-setup' && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Phone Number</CardTitle>
            <CardDescription>
              We'll send verification codes to this number
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-confirm">Phone Number</Label>
              <Input
                id="phone-confirm"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('choose')} className="flex-1">
                Back
              </Button>
              <Button onClick={enableSms} disabled={loading || !phone} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Enable SMS 2FA
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete - Show Backup Codes */}
      {step === 'complete' && totpData?.backupCodes && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Save Your Backup Codes</CardTitle>
                <CardDescription>
                  Store these codes in a safe place. Each code can only be used once.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                These codes won't be shown again. Save them now!
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2">
              {totpData.backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-100 rounded font-mono text-sm"
                >
                  <span>{code}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCode(code, index)}
                    className="h-6 w-6 p-0"
                  >
                    {copiedCode === index ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadBackupCodes} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={() => { setStep('choose'); fetchStatus(); }} className="flex-1">
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TwoFactorSetup;
