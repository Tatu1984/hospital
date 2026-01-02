import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Smartphone, MessageSquare, Key, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface TwoFactorVerifyProps {
  userId: string;
  methods: {
    totp: boolean;
    sms: boolean;
  };
  phone?: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function TwoFactorVerify({ userId, methods, phone, onVerified, onCancel }: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');
  const [activeMethod, setActiveMethod] = useState<'totp' | 'sms' | 'backup'>(
    methods.totp ? 'totp' : 'sms'
  );
  const [loading, setLoading] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [error, setError] = useState('');

  // Send SMS OTP
  const sendSmsOtp = async () => {
    if (!phone) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/2fa/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, phone }),
      });
      const data = await res.json();

      if (data.success) {
        setSmsSent(true);
      } else {
        setError(data.message || 'Failed to send SMS');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Verify code
  const verifyCode = async () => {
    if (!code) {
      setError('Please enter a code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          token: code,
          method: activeMethod,
        }),
      });
      const data = await res.json();

      if (data.success) {
        onVerified();
      } else {
        setError(data.message || 'Invalid verification code');
      }
    } catch (err) {
      setError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const maskPhone = (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length < 4) return '****';
    return '*'.repeat(phoneNumber.length - 4) + phoneNumber.slice(-4);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Two-Factor Verification</CardTitle>
          <CardDescription>
            Enter the verification code to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeMethod} onValueChange={(v) => setActiveMethod(v as 'totp' | 'sms' | 'backup')}>
            <TabsList className="grid w-full grid-cols-3">
              {methods.totp && (
                <TabsTrigger value="totp">
                  <Smartphone className="w-4 h-4 mr-1" />
                  App
                </TabsTrigger>
              )}
              {methods.sms && (
                <TabsTrigger value="sms">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  SMS
                </TabsTrigger>
              )}
              <TabsTrigger value="backup">
                <Key className="w-4 h-4 mr-1" />
                Backup
              </TabsTrigger>
            </TabsList>

            <TabsContent value="totp" className="space-y-4 pt-4">
              <p className="text-sm text-slate-600 text-center">
                Open your authenticator app and enter the 6-digit code
              </p>
              <div className="space-y-2">
                <Label htmlFor="totp-code">Verification Code</Label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                />
              </div>
            </TabsContent>

            <TabsContent value="sms" className="space-y-4 pt-4">
              {!smsSent ? (
                <>
                  <p className="text-sm text-slate-600 text-center">
                    We'll send a verification code to {maskPhone(phone || '')}
                  </p>
                  <Button onClick={sendSmsOtp} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Send Code
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 text-center">
                    Enter the code sent to {maskPhone(phone || '')}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="sms-code">Verification Code</Label>
                    <Input
                      id="sms-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className="text-center text-2xl tracking-widest font-mono"
                      autoFocus
                    />
                  </div>
                  <Button
                    variant="link"
                    onClick={sendSmsOtp}
                    disabled={loading}
                    className="w-full text-sm"
                  >
                    Didn't receive code? Send again
                  </Button>
                </>
              )}
            </TabsContent>

            <TabsContent value="backup" className="space-y-4 pt-4">
              <p className="text-sm text-slate-600 text-center">
                Enter one of your backup codes
              </p>
              <div className="space-y-2">
                <Label htmlFor="backup-code">Backup Code</Label>
                <Input
                  id="backup-code"
                  type="text"
                  maxLength={10}
                  placeholder="XXXXXXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="text-center text-xl tracking-widest font-mono"
                  autoFocus
                />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Each backup code can only be used once
              </p>
            </TabsContent>
          </Tabs>

          {(activeMethod === 'totp' || (activeMethod === 'sms' && smsSent) || activeMethod === 'backup') && (
            <Button
              onClick={verifyCode}
              disabled={loading || !code}
              className="w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Verify
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full text-slate-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default TwoFactorVerify;
