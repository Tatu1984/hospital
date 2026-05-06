// Comprehensive Add/Edit User dialog used by SystemControl.
//
// Five sections behind tabs:
//   Identity   — username, name, email, phone, password, role(s), departments, status
//   Personal   — DOB, gender, blood group, address, emergency contact
//   KYC        — dynamic list of identity proofs (Aadhaar/PAN/Passport/etc)
//   Education  — degrees + licenses (clinical staff specifically need these)
//   Doctor     — qualifications, specialization, registration #, experience (only when a doctor role is picked)
//   Banking    — account details for payroll
//
// Submits a single consolidated payload:
//   { username, name, email, phone, password (create only), bloodGroup,
//     roleIds[], departmentIds[], branchId, isActive,
//     profile: { dob, gender, address{}, emergencyContact{}, kycDocuments[],
//                education[], licenses[], banking{}, doctor{} } }
//
// The backend's createUserSchema/updateUserSchema accepts this shape and
// stores `profile` as a JSON column.

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import api from '../services/api';

// Canonical role IDs match backend rbac.ts ROLE_PERMISSIONS keys.
const ROLES: Array<{ id: string; label: string }> = [
  { id: 'ADMIN', label: 'Admin' },
  { id: 'DOCTOR', label: 'Doctor' },
  { id: 'CONSULTANT', label: 'Consultant' },
  { id: 'SURGEON', label: 'Surgeon' },
  { id: 'NURSE', label: 'Nurse' },
  { id: 'FRONT_OFFICE', label: 'Receptionist (Front Office)' },
  { id: 'PHARMACIST', label: 'Pharmacist' },
  { id: 'LAB_TECH', label: 'Lab Technician' },
  { id: 'RADIOLOGY_TECH', label: 'Radiology Technician' },
  { id: 'BILLING', label: 'Billing / Accountant' },
  { id: 'IPD_STAFF', label: 'IPD Staff' },
  { id: 'OT_STAFF', label: 'OT Staff' },
  { id: 'ICU', label: 'ICU Staff' },
  { id: 'EMERGENCY', label: 'Emergency Staff' },
];
const DOCTOR_ROLE_IDS = new Set(['DOCTOR', 'CONSULTANT', 'SURGEON']);

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const KYC_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Driving License', 'Voter ID', 'Other'];
const LICENSE_TYPES = ['Medical Council', 'Nursing Council', 'Pharmacy Council', 'State Medical Registration', 'Other'];

interface KycDoc { type: string; number: string; expiry?: string; fileUrl?: string }
interface Education { degree: string; institution: string; year: string; registrationNumber?: string }
interface License { type: string; number: string; issuingAuthority: string; issueDate?: string; expiry?: string }

export interface UserFormState {
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  bloodGroup?: string;
  roleIds: string[];
  departmentIds: string[];
  branchId?: string;
  isActive: boolean;
  profile: {
    dob?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    designation?: string;
    joiningDate?: string;
    address?: { line1?: string; line2?: string; city?: string; state?: string; country?: string; pincode?: string };
    emergencyContact?: { name?: string; relation?: string; phone?: string };
    kycDocuments?: KycDoc[];
    education?: Education[];
    licenses?: License[];
    banking?: { accountName?: string; accountNumber?: string; ifsc?: string; bankName?: string; branchName?: string; panNumber?: string };
    doctor?: { qualifications?: string; specialization?: string; registrationNumber?: string; experienceYears?: string; signatureUrl?: string };
  };
}

const EMPTY: UserFormState = {
  roleIds: [],
  departmentIds: [],
  isActive: true,
  profile: {},
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pass an id to load an existing user; null/undefined creates a new one.
  userId?: string | null;
  onSaved?: () => void;
}

export default function UserFormModal({ open, onOpenChange, userId, onSaved }: Props) {
  const isEditing = !!userId;
  const [tab, setTab] = useState('identity');
  const [form, setForm] = useState<UserFormState>(EMPTY);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show the doctor-specific tab whenever a doctor-style role is selected.
  const isDoctor = useMemo(() => form.roleIds.some((r) => DOCTOR_ROLE_IDS.has(r)), [form.roleIds]);

  // Reset + load whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setTab('identity');
    if (userId) {
      setLoading(true);
      api.get(`/api/users/${userId}`)
        .then((r) => {
          const u = r.data;
          setForm({
            username: u.username,
            name: u.name || u.fullName,
            email: u.email,
            phone: u.phone || '',
            bloodGroup: u.bloodGroup || '',
            roleIds: u.roleIds || (u.role ? [u.role] : []),
            departmentIds: u.departmentIds || [],
            branchId: u.branchId,
            isActive: u.status ? u.status === 'active' : !!u.isActive,
            profile: u.profile || {},
          });
        })
        .catch((e) => setError(e?.response?.data?.error || 'Could not load user.'))
        .finally(() => setLoading(false));
    } else {
      setForm({ ...EMPTY, profile: {} });
    }
    // Master data — departments. Best-effort; we degrade silently if it
    // 404s (some tenants don't expose this endpoint).
    api.get('/api/master/departments').then((r) => setDepartments(r.data || [])).catch(() => undefined);
  }, [open, userId]);

  function patch(p: Partial<UserFormState>) { setForm((prev) => ({ ...prev, ...p })); }
  function patchProfile(p: Partial<UserFormState['profile']>) {
    setForm((prev) => ({ ...prev, profile: { ...prev.profile, ...p } }));
  }

  function toggleRole(id: string) {
    patch({ roleIds: form.roleIds.includes(id) ? form.roleIds.filter((r) => r !== id) : [...form.roleIds, id] });
  }
  function toggleDept(id: string) {
    patch({ departmentIds: form.departmentIds.includes(id) ? form.departmentIds.filter((d) => d !== id) : [...form.departmentIds, id] });
  }

  // KYC list helpers
  function addKyc() {
    patchProfile({ kycDocuments: [...(form.profile.kycDocuments || []), { type: 'Aadhaar', number: '' }] });
  }
  function setKyc(idx: number, p: Partial<KycDoc>) {
    const list = [...(form.profile.kycDocuments || [])];
    list[idx] = { ...list[idx], ...p };
    patchProfile({ kycDocuments: list });
  }
  function removeKyc(idx: number) {
    patchProfile({ kycDocuments: (form.profile.kycDocuments || []).filter((_, i) => i !== idx) });
  }

  // Education list helpers
  function addEducation() {
    patchProfile({ education: [...(form.profile.education || []), { degree: '', institution: '', year: '' }] });
  }
  function setEducation(idx: number, p: Partial<Education>) {
    const list = [...(form.profile.education || [])];
    list[idx] = { ...list[idx], ...p };
    patchProfile({ education: list });
  }
  function removeEducation(idx: number) {
    patchProfile({ education: (form.profile.education || []).filter((_, i) => i !== idx) });
  }

  // License list helpers
  function addLicense() {
    patchProfile({ licenses: [...(form.profile.licenses || []), { type: 'Medical Council', number: '', issuingAuthority: '' }] });
  }
  function setLicense(idx: number, p: Partial<License>) {
    const list = [...(form.profile.licenses || [])];
    list[idx] = { ...list[idx], ...p };
    patchProfile({ licenses: list });
  }
  function removeLicense(idx: number) {
    patchProfile({ licenses: (form.profile.licenses || []).filter((_, i) => i !== idx) });
  }

  async function save() {
    setError(null);
    if (!form.username || !form.name || !form.email) {
      setError('Username, name, and email are required.'); setTab('identity'); return;
    }
    if (!form.roleIds.length) {
      setError('Pick at least one role.'); setTab('identity'); return;
    }
    if (!isEditing && (!form.password || form.password.length < 8)) {
      setError('Password is required (8+ characters) when creating a new user.'); setTab('identity'); return;
    }

    setSaving(true);
    try {
      const payload: any = {
        username: form.username,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        bloodGroup: form.bloodGroup || null,
        roleIds: form.roleIds,
        departmentIds: form.departmentIds,
        branchId: form.branchId,
        isActive: form.isActive,
        profile: form.profile,
      };
      if (!isEditing) payload.password = form.password;

      if (isEditing) {
        await api.put(`/api/users/${userId}`, payload);
      } else {
        await api.post('/api/users', payload);
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.response?.data?.message || 'Could not save user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit user' : 'Add new user'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update profile, roles, and credentials' : 'Create a system user — capture full identity, qualifications, KYC and banking details.'}
          </DialogDescription>
        </DialogHeader>

        {loading && <div className="py-12 text-center text-sm text-slate-500">Loading…</div>}

        {!loading && (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className={`grid w-full ${isDoctor ? 'grid-cols-6' : 'grid-cols-5'}`}>
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="kyc">KYC</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              {isDoctor && <TabsTrigger value="doctor">Doctor</TabsTrigger>}
              <TabsTrigger value="banking">Banking</TabsTrigger>
            </TabsList>

            {/* IDENTITY */}
            <TabsContent value="identity" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Username *</Label>
                  <Input value={form.username || ''} onChange={(e) => patch({ username: e.target.value })} placeholder="e.g. drsmith" disabled={isEditing} />
                </div>
                <div className="space-y-1.5">
                  <Label>Full name *</Label>
                  <Input value={form.name || ''} onChange={(e) => patch({ name: e.target.value })} placeholder="Dr. John Smith" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email || ''} onChange={(e) => patch({ email: e.target.value })} placeholder="user@hospital.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone || ''} onChange={(e) => patch({ phone: e.target.value })} placeholder="+91 9876543210" />
                </div>
                <div className="space-y-1.5">
                  <Label>Designation</Label>
                  <Input value={form.profile.designation || ''} onChange={(e) => patchProfile({ designation: e.target.value })} placeholder="Senior Consultant" />
                </div>
                <div className="space-y-1.5">
                  <Label>Joining date</Label>
                  <Input type="date" value={form.profile.joiningDate || ''} onChange={(e) => patchProfile({ joiningDate: e.target.value })} />
                </div>
                {!isEditing && (
                  <div className="space-y-1.5 col-span-2">
                    <Label>Password *</Label>
                    <Input type="password" value={form.password || ''} onChange={(e) => patch({ password: e.target.value })} placeholder="At least 8 characters" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Roles *</Label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((r) => {
                    const on = form.roleIds.includes(r.id);
                    return (
                      <button key={r.id} type="button" onClick={() => toggleRole(r.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300'}`}>
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {departments.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Departments</Label>
                  <div className="flex flex-wrap gap-2">
                    {departments.map((d) => {
                      const on = form.departmentIds.includes(d.id);
                      return (
                        <button key={d.id} type="button" onClick={() => toggleDept(d.id)}
                          className={`px-3 py-1.5 rounded-full text-xs border ${on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300'}`}>
                          {d.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => patch({ isActive: e.target.checked })} className="w-4 h-4" />
                <Label htmlFor="isActive" className="cursor-pointer">Account active</Label>
              </div>
            </TabsContent>

            {/* PERSONAL */}
            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Date of birth</Label>
                  <Input type="date" value={form.profile.dob || ''} onChange={(e) => patchProfile({ dob: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={form.profile.gender} onValueChange={(v: any) => patchProfile({ gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Blood group</Label>
                  <Select value={form.bloodGroup} onValueChange={(v) => patch({ bloodGroup: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {BLOOD_GROUPS.map((bg) => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block font-semibold">Address</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input className="col-span-2" placeholder="Line 1" value={form.profile.address?.line1 || ''}
                    onChange={(e) => patchProfile({ address: { ...form.profile.address, line1: e.target.value } })} />
                  <Input className="col-span-2" placeholder="Line 2 (optional)" value={form.profile.address?.line2 || ''}
                    onChange={(e) => patchProfile({ address: { ...form.profile.address, line2: e.target.value } })} />
                  <Input placeholder="City" value={form.profile.address?.city || ''}
                    onChange={(e) => patchProfile({ address: { ...form.profile.address, city: e.target.value } })} />
                  <Input placeholder="State" value={form.profile.address?.state || ''}
                    onChange={(e) => patchProfile({ address: { ...form.profile.address, state: e.target.value } })} />
                  <Input placeholder="Country" value={form.profile.address?.country || ''}
                    onChange={(e) => patchProfile({ address: { ...form.profile.address, country: e.target.value } })} />
                  <Input placeholder="PIN code" value={form.profile.address?.pincode || ''}
                    onChange={(e) => patchProfile({ address: { ...form.profile.address, pincode: e.target.value } })} />
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block font-semibold">Emergency contact</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder="Name" value={form.profile.emergencyContact?.name || ''}
                    onChange={(e) => patchProfile({ emergencyContact: { ...form.profile.emergencyContact, name: e.target.value } })} />
                  <Input placeholder="Relation (spouse, parent…)" value={form.profile.emergencyContact?.relation || ''}
                    onChange={(e) => patchProfile({ emergencyContact: { ...form.profile.emergencyContact, relation: e.target.value } })} />
                  <Input placeholder="Phone" value={form.profile.emergencyContact?.phone || ''}
                    onChange={(e) => patchProfile({ emergencyContact: { ...form.profile.emergencyContact, phone: e.target.value } })} />
                </div>
              </div>
            </TabsContent>

            {/* KYC */}
            <TabsContent value="kyc" className="space-y-3 mt-4">
              {(form.profile.kycDocuments || []).length === 0 && (
                <p className="text-sm text-slate-500">No KYC documents added yet.</p>
              )}
              {(form.profile.kycDocuments || []).map((doc, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                  <button onClick={() => removeKyc(i)} className="absolute top-2 right-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={doc.type} onValueChange={(v) => setKyc(i, { type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KYC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Document number" value={doc.number} onChange={(e) => setKyc(i, { number: e.target.value })} />
                    <Input type="date" placeholder="Expiry" value={doc.expiry || ''} onChange={(e) => setKyc(i, { expiry: e.target.value })} />
                  </div>
                  <Input placeholder="File URL or reference (optional)" value={doc.fileUrl || ''} onChange={(e) => setKyc(i, { fileUrl: e.target.value })} />
                </div>
              ))}
              <Button variant="outline" onClick={addKyc} className="w-full"><Plus className="w-4 h-4 mr-1" /> Add KYC document</Button>
            </TabsContent>

            {/* EDUCATION + LICENSES */}
            <TabsContent value="education" className="space-y-4 mt-4">
              <div>
                <Label className="mb-2 block font-semibold">Educational qualifications</Label>
                {(form.profile.education || []).length === 0 && (
                  <p className="text-sm text-slate-500 mb-2">No qualifications added yet.</p>
                )}
                {(form.profile.education || []).map((ed, i) => (
                  <div key={i} className="border rounded-lg p-3 mb-2 relative">
                    <button onClick={() => removeEducation(i)} className="absolute top-2 right-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Degree (e.g. MBBS)" value={ed.degree} onChange={(e) => setEducation(i, { degree: e.target.value })} />
                      <Input placeholder="Year" value={ed.year} onChange={(e) => setEducation(i, { year: e.target.value })} />
                      <Input className="col-span-2" placeholder="Institution" value={ed.institution} onChange={(e) => setEducation(i, { institution: e.target.value })} />
                      <Input className="col-span-2" placeholder="Registration number (optional)" value={ed.registrationNumber || ''} onChange={(e) => setEducation(i, { registrationNumber: e.target.value })} />
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addEducation} className="w-full"><Plus className="w-4 h-4 mr-1" /> Add qualification</Button>
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block font-semibold">Licenses / registrations</Label>
                {(form.profile.licenses || []).length === 0 && (
                  <p className="text-sm text-slate-500 mb-2">No licenses added yet.</p>
                )}
                {(form.profile.licenses || []).map((lic, i) => (
                  <div key={i} className="border rounded-lg p-3 mb-2 relative">
                    <button onClick={() => removeLicense(i)} className="absolute top-2 right-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={lic.type} onValueChange={(v) => setLicense(i, { type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LICENSE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input placeholder="License number" value={lic.number} onChange={(e) => setLicense(i, { number: e.target.value })} />
                      <Input className="col-span-2" placeholder="Issuing authority" value={lic.issuingAuthority} onChange={(e) => setLicense(i, { issuingAuthority: e.target.value })} />
                      <Input type="date" placeholder="Issue date" value={lic.issueDate || ''} onChange={(e) => setLicense(i, { issueDate: e.target.value })} />
                      <Input type="date" placeholder="Expiry" value={lic.expiry || ''} onChange={(e) => setLicense(i, { expiry: e.target.value })} />
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addLicense} className="w-full"><Plus className="w-4 h-4 mr-1" /> Add license</Button>
              </div>
            </TabsContent>

            {/* DOCTOR-only */}
            {isDoctor && (
              <TabsContent value="doctor" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Qualifications (display string)</Label>
                    <Input value={form.profile.doctor?.qualifications || ''}
                      onChange={(e) => patchProfile({ doctor: { ...form.profile.doctor, qualifications: e.target.value } })}
                      placeholder="e.g. MBBS, MD, DM (Cardiology)" />
                    <p className="text-xs text-slate-500">Shown alongside the doctor's name everywhere across portal + mobile.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Specialization</Label>
                    <Input value={form.profile.doctor?.specialization || ''}
                      onChange={(e) => patchProfile({ doctor: { ...form.profile.doctor, specialization: e.target.value } })}
                      placeholder="Cardiology" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Medical Council registration #</Label>
                    <Input value={form.profile.doctor?.registrationNumber || ''}
                      onChange={(e) => patchProfile({ doctor: { ...form.profile.doctor, registrationNumber: e.target.value } })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Years of experience</Label>
                    <Input type="number" value={form.profile.doctor?.experienceYears || ''}
                      onChange={(e) => patchProfile({ doctor: { ...form.profile.doctor, experienceYears: e.target.value } })} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Signature image URL (for prescriptions)</Label>
                    <Input value={form.profile.doctor?.signatureUrl || ''}
                      onChange={(e) => patchProfile({ doctor: { ...form.profile.doctor, signatureUrl: e.target.value } })} />
                  </div>
                </div>
              </TabsContent>
            )}

            {/* BANKING */}
            <TabsContent value="banking" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Account holder name" value={form.profile.banking?.accountName || ''}
                  onChange={(e) => patchProfile({ banking: { ...form.profile.banking, accountName: e.target.value } })} />
                <Input placeholder="Account number" value={form.profile.banking?.accountNumber || ''}
                  onChange={(e) => patchProfile({ banking: { ...form.profile.banking, accountNumber: e.target.value } })} />
                <Input placeholder="IFSC" value={form.profile.banking?.ifsc || ''}
                  onChange={(e) => patchProfile({ banking: { ...form.profile.banking, ifsc: e.target.value } })} />
                <Input placeholder="Bank name" value={form.profile.banking?.bankName || ''}
                  onChange={(e) => patchProfile({ banking: { ...form.profile.banking, bankName: e.target.value } })} />
                <Input placeholder="Branch name" value={form.profile.banking?.branchName || ''}
                  onChange={(e) => patchProfile({ banking: { ...form.profile.banking, branchName: e.target.value } })} />
                <Input placeholder="PAN number" value={form.profile.banking?.panNumber || ''}
                  onChange={(e) => patchProfile({ banking: { ...form.profile.banking, panNumber: e.target.value } })} />
              </div>
            </TabsContent>
          </Tabs>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : (isEditing ? 'Update user' : 'Add user')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
