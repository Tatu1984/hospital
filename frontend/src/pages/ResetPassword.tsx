import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '../services/api';
import { useToast } from '../components/Toast';

export default function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Missing token', 'Open the reset link from your email.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password.length < 8) {
      toast.warning('Weak password', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      toast.warning('Passwords don\'t match', 'Re-enter the same password in both fields.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setDone(true);
      toast.success('Password updated', 'You can now log in with your new password.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (e: any) {
      toast.error(
        'Reset failed',
        e?.response?.data?.error || 'The token may be expired. Request a new reset link.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>
            Choose a password at least 8 characters long. The reset link is valid for 30 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-sm text-slate-700">
              Password changed. Redirecting you to the login page…
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={!token}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  disabled={!token}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !token}>
                {submitting ? 'Updating…' : 'Update password'}
              </Button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-blue-600 hover:underline">
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
