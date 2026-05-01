import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '../services/api';
import { useToast } from '../components/Toast';

export default function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.warning('Missing email', 'Enter the email associated with your account.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
      toast.success('Check your email', 'If the address is registered, we have sent a reset link.');
    } catch (e: any) {
      toast.error('Could not request reset', e?.response?.data?.error || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your account email and we'll send a reset link valid for 30 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-700">
                If <span className="font-medium">{email}</span> matches an account, a reset link has been
                generated. Check your inbox (and spam) for instructions.
              </p>
              <p className="text-xs text-slate-500">
                Demo deploys without an email gateway: ask the operator to fetch the token from the
                backend logs.
              </p>
              <Link to="/login" className="text-sm text-blue-600 hover:underline">
                ← Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send reset link'}
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
