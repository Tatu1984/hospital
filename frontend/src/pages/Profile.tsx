import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, userAPI } from '../services/api';
import { User, Lock, Shield, Mail, Phone, Droplets, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Tab = 'overview' | 'security';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  DOCTOR: 'Doctor',
  CONSULTANT: 'Consultant',
  SURGEON: 'Surgeon',
  NURSE: 'Nurse',
  RECEPTIONIST: 'Receptionist',
  PHARMACIST: 'Pharmacist',
  LAB_TECHNICIAN: 'Lab Technician',
  RADIOLOGIST: 'Radiologist',
  BILLING: 'Billing Staff',
  HR: 'HR',
  MANAGEMENT: 'Management',
};

interface Toast {
  type: 'success' | 'error';
  message: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [toast, setToast] = useState<Toast | null>(null);

  // Profile edit state
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: (user as any)?.phone || '',
    bloodGroup: (user as any)?.bloodGroup || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleProfileSave = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await userAPI.update(user.id, {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        bloodGroup: profileForm.bloodGroup,
      });
      showToast('success', 'Profile updated successfully.');
      setEditMode(false);
    } catch (err: any) {
      showToast('error', err?.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwError('');
    if (!pwForm.current) { setPwError('Current password is required.'); return; }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }
    setSavingPw(true);
    try {
      await authAPI.changePassword(pwForm.current, pwForm.next);
      showToast('success', 'Password changed successfully.');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      setPwError(err?.response?.data?.error || 'Failed to change password.');
    } finally {
      setSavingPw(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
          <span className="text-xl font-semibold text-white">{initials}</span>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{user?.name}</h1>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {user?.roleIds?.map((r) => (
              <Badge key={r} variant="secondary" className="text-[11px] bg-slate-100 text-slate-700 border-0 px-2 py-0.5">
                {ROLE_LABELS[r] || r}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? 'text-slate-900 border-slate-900'
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <p className="font-medium text-slate-900 text-sm">Personal Information</p>
              <p className="text-xs text-slate-500 mt-0.5">Your account details and contact information.</p>
            </div>
            {!editMode ? (
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="text-xs h-8">
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditMode(false)} className="text-xs h-8">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleProfileSave} disabled={savingProfile} className="text-xs h-8 bg-slate-900 hover:bg-slate-800 text-white">
                  {savingProfile ? 'Saving…' : 'Save'}
                </Button>
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            <ProfileField
              icon={<User className="w-3.5 h-3.5" />}
              label="Full Name"
              value={profileForm.name}
              editing={editMode}
              onChange={(v) => setProfileForm((f) => ({ ...f, name: v }))}
            />
            <ProfileField
              icon={<Mail className="w-3.5 h-3.5" />}
              label="Email Address"
              value={profileForm.email}
              editing={editMode}
              onChange={(v) => setProfileForm((f) => ({ ...f, email: v }))}
              type="email"
            />
            <ProfileField
              icon={<Phone className="w-3.5 h-3.5" />}
              label="Phone"
              value={profileForm.phone}
              editing={editMode}
              onChange={(v) => setProfileForm((f) => ({ ...f, phone: v }))}
              placeholder="Not set"
              type="tel"
            />
            <ProfileField
              icon={<Droplets className="w-3.5 h-3.5" />}
              label="Blood Group"
              value={profileForm.bloodGroup}
              editing={editMode}
              onChange={(v) => setProfileForm((f) => ({ ...f, bloodGroup: v }))}
              placeholder="Not set"
            />
            <div className="flex items-center gap-3 px-5 py-4">
              <span className="text-slate-400 shrink-0"><Shield className="w-3.5 h-3.5" /></span>
              <span className="text-xs text-slate-500 w-32 shrink-0">Username</span>
              <span className="text-sm text-slate-700 font-mono">{user?.username}</span>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <span className="text-slate-400 shrink-0"><Building2 className="w-3.5 h-3.5" /></span>
              <span className="text-xs text-slate-500 w-32 shrink-0">Branch</span>
              <span className="text-sm text-slate-700">{(user as any)?.branch?.name || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-medium text-slate-900 text-sm">Change Password</p>
              <p className="text-xs text-slate-500 mt-0.5">New password must be at least 8 characters.</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Current Password</label>
                <Input
                  type="password"
                  value={pwForm.current}
                  onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                  className="h-9 text-sm"
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">New Password</label>
                <Input
                  type="password"
                  value={pwForm.next}
                  onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                  className="h-9 text-sm"
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Confirm New Password</label>
                <Input
                  type="password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                  className="h-9 text-sm"
                  placeholder="Repeat new password"
                />
              </div>

              {pwError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {pwError}
                </div>
              )}

              <div className="pt-1">
                <Button
                  onClick={handlePasswordChange}
                  disabled={savingPw}
                  className="h-9 text-sm bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {savingPw ? 'Updating…' : 'Update Password'}
                </Button>
              </div>
            </div>
          </div>

          {/* Account info card */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs font-medium text-slate-700 mb-3">Account Details</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Username</span>
                <span className="text-xs font-mono text-slate-700">{user?.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Roles</span>
                <div className="flex gap-1">
                  {user?.roleIds?.map((r) => (
                    <Badge key={r} variant="secondary" className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0">
                      {ROLE_LABELS[r] || r}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Tenant</span>
                <span className="text-xs text-slate-700">{(user as any)?.tenant?.name || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProfileFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}

function ProfileField({ icon, label, value, editing, onChange, placeholder = '—', type = 'text' }: ProfileFieldProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-xs text-slate-500 w-32 shrink-0">{label}</span>
      {editing ? (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm max-w-xs"
          placeholder={placeholder}
        />
      ) : (
        <span className="text-sm text-slate-700">{value || <span className="text-slate-400">{placeholder}</span>}</span>
      )}
    </div>
  );
}
