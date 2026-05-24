// Patient portal login — phone + OTP. Public route, no staff auth.
//
// Step 1: 10-digit phone (+ tenant). Hitting "Send OTP" calls
//         /api/public/portal/request-otp. In dev the response includes
//         an `otpDebug` field — we surface it as a hint so QA doesn't
//         need to look in server logs.
// Step 2: 6-digit OTP. "Verify" calls /api/public/portal/verify-otp,
//         persists {token, patient} into localStorage.patientPortalSession,
//         and routes to /me/home.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Heart, Phone, Lock } from 'lucide-react';
import { setSession, getSession } from '../../services/portalApi';

const API_URL = (import.meta as any).env?.VITE_API_URL || '';

export default function PatientPortalLogin() {
  const nav = useNavigate();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [tenantId, setTenantId] = useState('tenant-1');
  const [otp, setOtp] = useState('');
  const [otpDebug, setOtpDebug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Already logged in? Skip straight to the home tiles.
  useEffect(() => {
    if (getSession()) nav('/me/home', { replace: true });
  }, [nav]);

  async function requestOtp() {
    setError(null);
    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    try {
      const r = await axios.post(`${API_URL}/api/public/portal/request-otp`, { phone, tenantId });
      setOtpDebug(r.data?.otpDebug || null);
      setStep('otp');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Unable to send OTP — check the number and try again');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    if (!/^\d{4,8}$/.test(otp)) {
      setError('Enter the OTP you received');
      return;
    }
    setLoading(true);
    try {
      const r = await axios.post(`${API_URL}/api/public/portal/verify-otp`, { phone, tenantId, otp });
      const { token, patient } = r.data || {};
      if (!token || !patient) throw new Error('Login response was empty');
      setSession({ token, patient });
      nav('/me/home', { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Verification failed — check the code and try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand block */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 flex items-center justify-center">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-100" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-4">My Health</h1>
          <p className="text-sm text-slate-500 mt-1">Your personal health record — labs, prescriptions, appointments.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 p-7">
          {step === 'phone' ? (
            <>
              <h2 className="text-lg font-semibold text-slate-900">Sign in with your phone</h2>
              <p className="text-xs text-slate-500 mt-0.5">We'll send a one-time code by SMS.</p>

              <div className="mt-5 space-y-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Phone number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 tabular-nums"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Hospital</label>
                  <select
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                  >
                    <option value="tenant-1">HospitalPro (default)</option>
                  </select>
                </div>

                {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

                <button
                  type="button"
                  onClick={requestOtp}
                  disabled={loading || !phone}
                  className="w-full h-11 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? 'Sending…' : 'Send OTP'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-900">Enter the code</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sent to <span className="font-medium text-slate-700">{phone}</span>{' '}
                <button type="button" onClick={() => { setStep('phone'); setOtp(''); }} className="ml-1 text-sky-600 hover:underline">change</button>
              </p>

              <div className="mt-5 space-y-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">One-time code</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-base tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                    />
                  </div>
                </div>

                {otpDebug && (
                  <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    Dev OTP: <span className="font-mono text-slate-800">{otpDebug}</span>
                  </div>
                )}

                {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={loading || !otp}
                  className="w-full h-11 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? 'Verifying…' : 'Verify & continue'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={requestOtp}
                  disabled={loading}
                  className="w-full text-xs text-slate-500 hover:text-slate-900"
                >
                  Didn't get the code? Resend
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-center text-slate-400 mt-5">
          Hospital staff?{' '}
          <a href="/login" className="text-sky-600 hover:underline">Sign in here</a>
        </p>
      </div>
    </div>
  );
}
