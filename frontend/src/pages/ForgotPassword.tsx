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
  const [username, setUsername] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      toast.warning('Missing username', 'Enter the username associated with your account.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/auth/forgot-password', { username });
      setSubmitted(true);
      toast.success('Request sent', 'If the username is registered, an administrator has been notified.');
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
            Enter your account username. An administrator will be notified and will reset your password
            for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-700">
                If <span className="font-medium">{username}</span> matches an account, an administrator has
                been notified of your request. They will verify your identity and reset your password,
                then share the new password with you directly.
              </p>
              <Link to="/login" className="text-sm text-blue-600 hover:underline">
                ← Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Sending…' : 'Notify administrator'}
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
