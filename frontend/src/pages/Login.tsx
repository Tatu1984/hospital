import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, AlertCircle } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Already signed in? Skip the form and go straight to the portal. Keeps
  // navigation in this app symmetrical: anonymous → /, authenticated → /app.
  useEffect(() => {
    if (!authLoading && token) {
      navigate('/app', { replace: true });
    }
  }, [authLoading, token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      // / is the public marketing home now. The portal lives at /app.
      navigate('/app');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex items-center justify-center p-4">
      {/* Subtle grid background — adds personality without being noisy. */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(226 232 240) 1px, transparent 1px), linear-gradient(90deg, rgb(226 232 240) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <Card className="relative w-full max-w-md rounded-2xl border-slate-200/70 shadow-[0_8px_30px_rgb(0_0_0_/_0.06)]">
        <CardHeader className="space-y-4 text-center pb-6 pt-8">
          <div className="mx-auto w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm">
            <Stethoscope className="w-7 h-7 text-white" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-[22px] font-semibold text-slate-900 tracking-tight">HospitalPro</CardTitle>
            <CardDescription className="text-slate-500 text-sm">
              Busitema Referral Hospital
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-[13px] text-slate-700 font-medium">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] text-slate-700 font-medium">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-[12px] text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-10"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-[13px] text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg shadow-sm"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
