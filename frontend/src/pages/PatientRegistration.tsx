import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Fingerprint, UserPlus } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { INDIA_STATES, INDIA_CITIES_BY_STATE, INDIA_ID_PROOF_TYPES, INDIA_INSURANCE_PROVIDERS } from '../config/india';

interface Patient {
  id: string;
  mrn: string;
  name: string;
  dob?: string | null;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  bloodGroup: string;
  registrationDate: string;
  status: string;
  referralSourceId?: string | null;
  referralDoctor?: string;
  purpose?: string;
}

// Backend stores `contact`, `dob`, `createdAt` and uses `allergies` as the
// free-text notes field. The UI thinks in `phone`, `age`, `registrationDate`
// and "Purpose of visit". Normalize once when the API responds so every
// downstream render reads from one consistent shape.
function ageFromDob(dob?: string | null): number {
  if (!dob) return 0;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const diffMs = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
}

function normalizePatient(raw: any, refMap: Record<string, string>): Patient {
  // Prefer the first-class `purpose` column; fall back to extracting it from
  // the legacy "Purpose: ..." prefix that older rows packed into `allergies`.
  // This supports records written before migration 20260501010000.
  let purpose: string = raw?.purpose || '';
  const allergies: string = raw?.allergies || '';
  if (!purpose) {
    const m = allergies.match(/(?:^|\b)Purpose\s*[:\-]\s*(.+?)(?:\n|$)/i);
    purpose = m ? m[1].trim() : '';
  }
  return {
    id: raw?.id,
    mrn: raw?.mrn || '',
    name: raw?.name || '',
    dob: raw?.dob ?? null,
    age: ageFromDob(raw?.dob),
    gender: raw?.gender || '',
    phone: raw?.contact || raw?.phone || '',
    email: raw?.email || '',
    address: raw?.address || '',
    bloodGroup: raw?.bloodGroup || '',
    registrationDate: raw?.createdAt
      ? new Date(raw.createdAt).toLocaleDateString()
      : (raw?.registrationDate || ''),
    status: raw?.status || (raw?.isActive === false ? 'Inactive' : 'Active'),
    referralSourceId: raw?.referralSourceId ?? null,
    referralDoctor: raw?.referralSourceId ? (refMap[raw.referralSourceId] || '') : '',
    purpose,
  };
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }
  return [];
}

// DOB helpers — we render a plain text DD/MM/YYYY input instead of the
// browser's native <input type="date"> because that control's 4-digit
// year segment auto-clamps partial input ("2" -> 0002), which is
// unusable when typing 2026. A text input lets the operator type
// freely; we auto-insert slashes, then validate + convert to the
// canonical YYYY-MM-DD on blur.
function dmyToYmd(dmy: string): string | null {
  // Accepts DD/MM/YYYY or DD-MM-YYYY. Returns YYYY-MM-DD if it parses
  // to a real calendar date, else null.
  const m = dmy.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (y < 1900 || y > new Date().getFullYear()) return null;
  if (mo < 1 || mo > 12) return null;
  // new Date(y, mo-1, d).getDate() === d catches Feb 30 / Apr 31 etc.
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function ymdToDmy(ymd: string): string {
  if (!ymd) return '';
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}
// As the user types digits we auto-insert slashes so DDMMYYYY reads
// as DD/MM/YYYY. Strips non-digit + non-slash; caps at 10 chars.
function autoFormatDob(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function PatientRegistration() {
  const navigate = useNavigate();
  // patients + referralSources state stays because fetchPatients()
  // and fetchReferralSources() still run on mount; the latter
  // populates the referring-doctor dropdown inside the dialog.
  const [, setPatients] = useState<Patient[]>([]);
  const [referralSources, setReferralSources] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [formData, setFormData] = useState({
    mrn: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    bloodGroup: '',
    emergencyContact: '',
    emergencyPhone: '',
    idProofType: '',
    idProofNumber: '',
    insuranceProvider: '',
    insuranceNumber: '',
    allergies: '',
    chronicConditions: '',
    purpose: '',
    referralSourceId: ''
  });

  useEffect(() => {
    // Fetch referrals first so the initial patient render already has doctor
    // names resolved. Then refresh patients (which uses refMap).
    (async () => {
      await fetchReferralSources();
      await fetchPatients();
    })();
    // Auto-open the registration dialog the moment this page mounts —
    // the page's only purpose now is to host the registration form
    // (the canonical patient list lives at /app/patients). The old
    // list section that used to sit underneath has been removed to
    // avoid showing two different lists in the app.
    setIsDialogOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await api.get('/api/patients');
      const list = toArray<any>(response.data);
      // Use the latest refMap snapshot from state — referralSources is loaded first.
      const map = referralSources.reduce<Record<string, string>>((acc, r) => {
        if (r?.id) acc[r.id] = r.name || r.label || '';
        return acc;
      }, {});
      setPatients(list.map((p) => normalizePatient(p, map)));
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
    }
  };

  const fetchReferralSources = async () => {
    try {
      const response = await api.get('/api/referral-sources');
      setReferralSources(toArray<any>(response.data));
    } catch (error) {
      console.error('Error fetching referral sources:', error);
      setReferralSources([]);
    }
  };

  // Compute age (in whole years) from a YYYY-MM-DD date string. Returns ''
  // for empty / unparseable input so the age field clears.
  const ageFromDateString = (yyyymmdd: string): string => {
    if (!yyyymmdd) return '';
    const d = new Date(yyyymmdd);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years -= 1;
    return years >= 0 ? String(years) : '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Keep `age` in sync whenever DOB changes — derived field, no manual edit.
      if (name === 'dateOfBirth') next.age = ageFromDateString(value);
      return next;
    });
  };

  // Allergies + chronic-conditions still share the `allergies` column (no
  // migration for those yet). Purpose is sent as its own field.
  const buildNotes = () => {
    const parts: string[] = [];
    if (formData.allergies) parts.push(`Allergies: ${formData.allergies}`);
    if (formData.chronicConditions) parts.push(`Chronic: ${formData.chronicConditions}`);
    return parts.join('\n') || null;
  };

  // Surface the most specific message a Zod-style validation response can
  // provide. Falls back to the top-level error / error.message / a literal.
  const apiErrorMessage = (e: any, fallback: string): string => {
    const data = e?.response?.data;
    if (data?.details?.[0]) {
      const d = data.details[0];
      return d.field ? `${d.field}: ${d.message}` : d.message;
    }
    return data?.error || data?.message || e?.message || fallback;
  };

  const handleSubmit = async () => {
    if (!formData.firstName.trim()) {
      toast.warning('Missing field', 'First name is required.');
      return;
    }
    if (!formData.gender) {
      toast.warning('Missing field', 'Please select a gender.');
      return;
    }
    if (!formData.phone) {
      toast.warning('Missing field', 'Phone number is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        dob: formData.dateOfBirth || null,
        // Backend Zod schema requires uppercase enum values.
        gender: formData.gender.toUpperCase(),
        contact: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        bloodGroup: formData.bloodGroup || null,
        allergies: buildNotes(),
        purpose: formData.purpose || null,
        referralSourceId: formData.referralSourceId || null,
      };

      const created = await api.post('/api/patients', payload);
      // After a successful registration, jump straight to the canonical
      // patient list so the operator sees their new row land. The
      // wrapping handleDialogChange would do the same, but skipping it
      // here lets us land BEFORE running the state resets below.
      setIsDialogOpen(false);
      navigate('/app/patients');
      setFormData({
        mrn: '', firstName: '', lastName: '', dateOfBirth: '', age: '', gender: '',
        phone: '', email: '', address: '', city: '', state: '', zipCode: '', country: '',
        bloodGroup: '', emergencyContact: '', emergencyPhone: '', idProofType: '',
        idProofNumber: '', insuranceProvider: '', insuranceNumber: '', allergies: '',
        chronicConditions: '', purpose: '', referralSourceId: ''
      });
      toast.success(
        'Patient registered',
        `${created.data?.name || payload.name} · ${created.data?.mrn || 'MRN pending'}`
      );
    } catch (error: any) {
      console.error('Error creating patient:', error);
      toast.error('Could not register patient', apiErrorMessage(error, 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // View / Edit / Create-Invoice handlers were dropped along with the
  // in-page patient list (that lives at /app/patients now). The
  // canonical list page handles those flows. Search-filter helper is
  // unused for the same reason.

  // When the registration dialog closes (Cancel, ✕, or successful
  // Register), bounce to /app/patients — that's the canonical list. We
  // never want the user stranded on this page with the form closed.
  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) navigate('/app/patients');
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full max-w-[1500px] mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 ring-1 ring-cyan-100 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Patient Registration</h1>
            <p className="text-sm text-slate-500 mt-0.5">Register a new patient. The full list lives at /app/patients.</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4" />
              Register New Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Patient Registration Form</DialogTitle>
              <DialogDescription>
                Complete patient demographics and identification information
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="mrn">MRN (Medical Record Number)</Label>
                <Input id="mrn" name="mrn" value={formData.mrn} onChange={handleInputChange} placeholder="Auto-generated if empty" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                {/* Plain text input — DD/MM/YYYY — instead of the
                    browser's native date control. The native one's
                    year segment auto-clamps partial digits ("2" ->
                    0002, "20" -> 0020) which made typing 2026
                    impossible. A text input has no segments and no
                    clamping, so digits go in at whatever speed.
                    Slashes are auto-inserted as you type so the
                    operator sees DD/MM/YYYY without typing them. */}
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="text"
                  inputMode="numeric"
                  placeholder="DD/MM/YYYY"
                  maxLength={10}
                  value={ymdToDmy(formData.dateOfBirth) || (formData as any).dobRaw || ''}
                  onChange={(e) => {
                    const formatted = autoFormatDob(e.target.value);
                    // Stash the in-flight text in `dobRaw` so the input
                    // can still render partial entries (e.g. "12/05/")
                    // before the date is complete. The canonical YMD
                    // commits only when parsing succeeds.
                    const ymd = dmyToYmd(formatted);
                    setFormData((prev) => ({
                      ...prev,
                      dobRaw: formatted,
                      // Only overwrite the committed YMD when we have a
                      // parseable date — keeps prior valid values from
                      // clearing while the user edits.
                      ...(ymd ? { dateOfBirth: ymd, age: ageFromDateString(ymd) }
                              : { dateOfBirth: '', age: '' }),
                    } as any));
                  }}
                  required
                />
                <p className="text-xs text-slate-500">Type day, month, then 4-digit year — e.g. 25/12/2026</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age (auto)</Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  value={formData.age}
                  readOnly
                  placeholder="from date of birth"
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" value={formData.address} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                {/* State is a Select of all 28 states + 8 UTs. Choosing
                    a state populates the City combobox below with that
                    state's major cities; we also clear City if the new
                    state doesn't include the previously-selected city
                    (prevents impossible state/city pairs sneaking
                    through). */}
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData((prev) => {
                    const cities = INDIA_CITIES_BY_STATE[value] || [];
                    const stillValid = cities.includes(prev.city);
                    return { ...prev, state: value, city: stillValid ? prev.city : '' };
                  })}
                >
                  <SelectTrigger><SelectValue placeholder="Select state / UT" /></SelectTrigger>
                  <SelectContent>
                    {INDIA_STATES.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name}{s.isUT ? ' (UT)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                {/* City is a free text input with a <datalist> for type-
                    ahead — the major-city list per state is finite but
                    Indian patients come from thousands of towns, so we
                    don't gate the field strictly. Datalist gives the
                    convenience of a dropdown without locking the user
                    out of typing an obscure town name. */}
                <Input
                  id="city"
                  name="city"
                  list="cityOptions"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder={formData.state ? 'Pick or type a city' : 'Select state first'}
                  disabled={!formData.state}
                />
                <datalist id="cityOptions">
                  {(INDIA_CITIES_BY_STATE[formData.state] || []).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">PIN Code</Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="\d{6}"
                  placeholder="6-digit PIN"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                {/* Defaults to India because that's the entire hospital
                    catchment; included as a Select with a few common
                    foreign options for medical-tourism / NRI patients.
                    Any other country can be free-typed via 'Other' →
                    the dialog still accepts the string. */}
                <Select
                  value={formData.country || 'India'}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="India">India</SelectItem>
                    <SelectItem value="Nepal">Nepal</SelectItem>
                    <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                    <SelectItem value="Sri Lanka">Sri Lanka</SelectItem>
                    <SelectItem value="Bhutan">Bhutan</SelectItem>
                    <SelectItem value="Maldives">Maldives</SelectItem>
                    <SelectItem value="United Arab Emirates">United Arab Emirates</SelectItem>
                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="Other">Other (international)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Select value={formData.bloodGroup} onValueChange={(value) => setFormData(prev => ({ ...prev, bloodGroup: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="referralSource">Referring Doctor / Source</Label>
                <Select value={formData.referralSourceId} onValueChange={(value) => setFormData(prev => ({ ...prev, referralSourceId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select referring doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {referralSources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name} ({source.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="purpose">Purpose of Visit</Label>
                <Input
                  id="purpose"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  placeholder="e.g., Routine check-up, fever, follow-up consultation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                <Input id="emergencyContact" name="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                <Input id="emergencyPhone" name="emergencyPhone" type="tel" value={formData.emergencyPhone} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idProofType">ID Proof Type</Label>
                <Select value={formData.idProofType} onValueChange={(value) => setFormData(prev => ({ ...prev, idProofType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* India-specific ID list (Aadhaar, PAN, Voter ID,
                        Driving Licence, Passport, Ration card, CGHS,
                        Employee/Student/Other). The earlier US list
                        (SSN etc.) wasn't relevant here. */}
                    {INDIA_ID_PROOF_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="idProofNumber">ID Proof Number</Label>
                <Input id="idProofNumber" name="idProofNumber" value={formData.idProofNumber} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                {/* Datalist combobox — 25+ common Indian insurers (PSU,
                    private, govt schemes incl. Ayushman Bharat) listed
                    as suggestions, but the field accepts free text for
                    any insurer outside the list. */}
                <Input
                  id="insuranceProvider"
                  name="insuranceProvider"
                  list="insuranceOptions"
                  value={formData.insuranceProvider}
                  onChange={handleInputChange}
                  placeholder="Pick or type insurer"
                />
                <datalist id="insuranceOptions">
                  {INDIA_INSURANCE_PROVIDERS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceNumber">Insurance Number</Label>
                <Input id="insuranceNumber" name="insuranceNumber" value={formData.insuranceNumber} onChange={handleInputChange} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="allergies">Known Allergies</Label>
                <Input id="allergies" name="allergies" value={formData.allergies} onChange={handleInputChange} placeholder="e.g., Penicillin, Peanuts" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="chronicConditions">Chronic Conditions</Label>
                <Input id="chronicConditions" name="chronicConditions" value={formData.chronicConditions} onChange={handleInputChange} placeholder="e.g., Diabetes, Hypertension" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleDialogChange(false)} disabled={loading}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Registering...' : 'Register Patient'}
              </Button>
              <Button variant="secondary" className="gap-2" disabled={loading}>
                <Fingerprint className="w-4 h-4" />
                Capture Biometric
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

