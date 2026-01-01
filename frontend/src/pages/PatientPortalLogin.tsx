import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, AlertCircle, Phone } from 'lucide-react';
import api from '../services/api';

const PatientPortalLogin = () => {
  const [loginMethod, setLoginMethod] = useState<'mrn' | 'phone'>('mrn');
  const [mrn, setMrn] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const navigate = useNavigate();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/patient-portal/request-otp', {
        mrn: loginMethod === 'mrn' ? mrn : undefined,
        phone: loginMethod === 'phone' ? phone : undefined,
        dob,
      });
      setSessionId(response.data.sessionId);
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Patient not found. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/patient-portal/verify-otp', {
        sessionId,
        otp,
      });
      // Store patient portal token
      localStorage.setItem('patientPortalToken', response.data.token);
      localStorage.setItem('patientPortalUser', JSON.stringify(response.data.patient));
      navigate('/patient-portal');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl bg-white border-slate-200">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-slate-900">Patient Portal</CardTitle>
            <CardDescription className="text-slate-600 mt-2">
              Access your health records securely
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {step === 'credentials' ? (
            <form onSubmit={handleRequestOTP} className="space-y-5">
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant={loginMethod === 'mrn' ? 'default' : 'outline'}
                  onClick={() => setLoginMethod('mrn')}
                  className="flex-1"
                >
                  <User className="w-4 h-4 mr-2" />
                  MRN
                </Button>
                <Button
                  type="button"
                  variant={loginMethod === 'phone' ? 'default' : 'outline'}
                  onClick={() => setLoginMethod('phone')}
                  className="flex-1"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Phone
                </Button>
              </div>

              {loginMethod === 'mrn' ? (
                <div className="space-y-2">
                  <Label htmlFor="mrn" className="text-slate-900 font-medium">Medical Record Number (MRN)</Label>
                  <Input
                    id="mrn"
                    type="text"
                    placeholder="Enter your MRN"
                    value={mrn}
                    onChange={(e) => setMrn(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 bg-white border-slate-300"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-900 font-medium">Registered Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 bg-white border-slate-300"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="dob" className="text-slate-900 font-medium">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 bg-white border-slate-300"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md"
              >
                {loading ? 'Verifying...' : 'Get OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="text-center mb-4">
                <p className="text-slate-600">
                  An OTP has been sent to your registered phone/email.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp" className="text-slate-900 font-medium">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={6}
                  className="h-11 bg-white border-slate-300 text-center text-2xl tracking-widest"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => { setStep('credentials'); setError(''); }}
                className="w-full"
              >
                Back
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <a href="/login" className="text-sm text-emerald-600 hover:underline">
              Staff Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientPortalLogin;
