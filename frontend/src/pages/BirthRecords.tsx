// Birth Records — refreshed UI. Captures the delivery event for live
// or stillbirths. Creating a record auto-registers the newborn as a
// Patient (MRN + branch + DOB = birth date) so paediatric / NICU
// workflows can hang notes off the same Patient row immediately.
//
// UI patterns introduced here (we'll roll them across the app once
// they land well):
//   • Soft visuals — rounded-2xl, hairline shadows, muted icon chips
//   • Drawer-style detail panel (Sheet) instead of modal-blocking
//     dialog for record detail + certificate issuance
//   • Recharts sparkline + donut so the page feels alive
//   • Skeleton loaders during fetch, illustrated empty state otherwise

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Baby, Plus, FileText, Printer, Search, TrendingUp, Weight, Heart, Calendar,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from 'recharts';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { generateBirthCertificatePDF } from '../utils/pdfGenerator';
import PdfPreviewDialog, { PdfDoc } from '../components/PdfPreviewDialog';

interface PatientLite {
  id: string;
  mrn: string;
  name: string;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  contact?: string | null;
}

interface DoctorLite { id: string; name: string }

interface BirthRecord {
  id: string;
  babyName?: string | null;
  babyGender: string;
  birthDate: string;
  placeOfBirth?: string | null;
  deliveryType: string;
  weightGrams?: number | null;
  lengthCm?: number | null;
  headCircumferenceCm?: number | null;
  apgar1Min?: number | null;
  apgar5Min?: number | null;
  liveBirth: boolean;
  outcome?: string | null;
  motherPatientId: string;
  babyPatientId?: string | null;
  motherPatient?: PatientLite | null;
  babyPatient?: PatientLite | null;
  attendingDoctor?: DoctorLite | null;
  attendingDoctorName?: string | null;
  fatherName?: string | null;
  fatherOccupation?: string | null;
  motherOccupation?: string | null;
  motherAgeAtBirth?: number | null;
  parentsAddress?: string | null;
  parentsNationality?: string | null;
  certificateNumber?: string | null;
  certificateIssuedAt?: string | null;
  notes?: string | null;
}

const DELIVERY_TYPES = [
  { value: 'normal',   label: 'Normal (vaginal)',           tint: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'csection', label: 'C-section',                  tint: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'assisted', label: 'Assisted',                   tint: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'twin',     label: 'Twin / Multiple',            tint: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'still',    label: 'Stillbirth',                 tint: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#94a3b8'];

export default function BirthRecords() {
  const [records, setRecords] = useState<BirthRecord[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [doctors, setDoctors] = useState<DoctorLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [detail, setDetail] = useState<BirthRecord | null>(null);
  const toast = useToast();

  function emptyForm() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return {
      motherPatientId: '',
      babyName: '',
      babyGender: 'Male',
      birthDate: local,
      placeOfBirth: 'Labour Room',
      deliveryType: 'normal',
      birthOrder: 1,
      weightGrams: '',
      lengthCm: '',
      headCircumferenceCm: '',
      apgar1Min: '',
      apgar5Min: '',
      liveBirth: true,
      outcome: 'alive',
      attendingDoctorId: '',
      fatherName: '',
      fatherOccupation: '',
      motherOccupation: '',
      motherAgeAtBirth: '',
      parentsAddress: '',
      parentsReligion: '',
      parentsNationality: 'Indian',
      notes: '',
    };
  }

  async function load() {
    setLoading(true);
    try {
      const [r, p, d] = await Promise.all([
        api.get('/api/birth-records').catch(() => ({ data: [] })),
        api.get('/api/patients', { params: { limit: 500 } }).catch(() => ({ data: [] })),
        api.get('/api/doctors').catch(() => ({ data: [] })),
      ]);
      setRecords(r.data || []);
      const raw = Array.isArray(p.data) ? p.data : (p.data?.items || []);
      setPatients(raw.map((x: any) => ({
        id: x.id, mrn: x.mrn, name: x.name,
        dob: x.dob, gender: x.gender, address: x.address, contact: x.contact,
      })));
      setDoctors((d.data || []).map((x: any) => ({ id: x.id, name: x.name })));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  function openNew() { setForm(emptyForm()); setDialogOpen(true); }

  async function save() {
    if (!form.motherPatientId) { toast.error('Pick the mother (search by name or MRN)'); return; }
    if (!form.birthDate)       { toast.error('Date/time of birth is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      ['weightGrams','lengthCm','headCircumferenceCm','apgar1Min','apgar5Min','motherAgeAtBirth','birthOrder']
        .forEach(k => { payload[k] = payload[k] === '' || payload[k] === null ? null : Number(payload[k]); });
      payload.birthDate = new Date(payload.birthDate).toISOString();
      if (payload.deliveryType === 'still') { payload.liveBirth = false; payload.outcome = 'stillborn'; }
      if (form.attendingDoctorId) {
        const d = doctors.find(x => x.id === form.attendingDoctorId);
        if (d) payload.attendingDoctorName = d.name;
      }
      await api.post('/api/birth-records', payload);
      setDialogOpen(false);
      toast.success('Birth recorded', 'Newborn registered as Patient.');
      void load();
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function issueAndPrint(rec: BirthRecord) {
    try {
      const r = await api.post(`/api/birth-records/${rec.id}/issue-certificate`);
      const full = r.data;
      const motherAge = full.motherAgeAtBirth || (full.motherPatient?.dob
        ? Math.max(0, new Date(full.birthDate).getFullYear() - new Date(full.motherPatient.dob).getFullYear())
        : undefined);
      const out = generateBirthCertificatePDF({
        certificateNumber: full.certificateNumber,
        hospitalName: full.branch?.name,
        branchAddress: full.branch?.address,
        babyName: full.babyName || (full.babyPatient?.name || ''),
        babyGender: full.babyGender,
        birthDate: new Date(full.birthDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
        birthTime: new Date(full.birthDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        placeOfBirth: full.placeOfBirth || 'Hospital',
        deliveryType: DELIVERY_TYPES.find(t => t.value === full.deliveryType)?.label || full.deliveryType,
        weightGrams: full.weightGrams || undefined,
        motherName: full.motherPatient?.name || '',
        motherMRN: full.motherPatient?.mrn || '',
        motherAge,
        motherAddress: full.parentsAddress || full.motherPatient?.address || undefined,
        motherOccupation: full.motherOccupation || undefined,
        motherNationality: full.parentsNationality || 'Indian',
        fatherName: full.fatherName || undefined,
        fatherOccupation: full.fatherOccupation || undefined,
        attendingDoctor: full.attendingDoctor?.name || full.attendingDoctorName || undefined,
        issuedAt: new Date(full.certificateIssuedAt || Date.now()).toLocaleDateString('en-IN'),
        issuedBy: 'Hospital Records',
      });
      setPdf(out);
      void load();
    } catch (e: any) {
      toast.error('Certificate issue failed', e?.response?.data?.error || 'Try again');
    }
  }

  // -------- derived data --------
  const today = new Date(); today.setHours(0,0,0,0);
  const todayCount   = records.filter(r => new Date(r.birthDate) >= today).length;
  const liveCount    = records.filter(r => r.liveBirth).length;
  const stillbornCnt = records.filter(r => !r.liveBirth).length;
  const issuedCount  = records.filter(r => !!r.certificateNumber).length;

  // 7-day sparkline: count of births per day for the last 7 days
  const sparkData = useMemo(() => {
    const days: { d: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day); next.setDate(next.getDate() + 1);
      const count = records.filter(r => {
        const t = new Date(r.birthDate).getTime();
        return t >= day.getTime() && t < next.getTime();
      }).length;
      days.push({ d: day.toLocaleDateString('en-IN', { weekday: 'short' }), count });
    }
    return days;
  }, [records]);

  // Delivery-type donut
  const donutData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of records) map[r.deliveryType] = (map[r.deliveryType] || 0) + 1;
    return DELIVERY_TYPES
      .map(t => ({ name: t.label, key: t.value, value: map[t.value] || 0 }))
      .filter(x => x.value > 0);
  }, [records]);

  // Filter + search
  const filtered = useMemo(() => {
    return records.filter(r => {
      if (activeFilter && r.deliveryType !== activeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (r.babyName || '').toLowerCase().includes(q) ||
          (r.motherPatient?.name || '').toLowerCase().includes(q) ||
          (r.motherPatient?.mrn || '').toLowerCase().includes(q) ||
          (r.certificateNumber || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, search, activeFilter]);

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* ============ HEADER ============ */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center ring-1 ring-pink-100">
              <Baby className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Birth Records</h1>
              <p className="text-sm text-slate-500 mt-0.5">Delivery log, newborn registration & hospital birth certificate</p>
            </div>
          </div>
          <Button onClick={openNew} className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> Record birth
          </Button>
        </div>

        {/* ============ STATS + CHARTS ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total births"
            value={records.length}
            icon={<Baby className="w-4 h-4 text-pink-600" />}
            tint="bg-pink-50 ring-pink-100"
            loading={loading}
          />
          <StatCard
            label="Today"
            value={todayCount}
            icon={<Calendar className="w-4 h-4 text-blue-600" />}
            tint="bg-blue-50 ring-blue-100"
            accent="text-blue-700"
            loading={loading}
          />
          <StatCard
            label="Live births"
            value={liveCount}
            sub={stillbornCnt ? `${stillbornCnt} stillborn` : 'all live'}
            icon={<Heart className="w-4 h-4 text-emerald-600" />}
            tint="bg-emerald-50 ring-emerald-100"
            accent="text-emerald-700"
            loading={loading}
          />
          <StatCard
            label="Certificates issued"
            value={issuedCount}
            sub={`of ${records.length}`}
            icon={<FileText className="w-4 h-4 text-violet-600" />}
            tint="bg-violet-50 ring-violet-100"
            accent="text-violet-700"
            loading={loading}
          />
        </div>

        {/* ============ CHART STRIP ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 rounded-2xl border-slate-200/70 shadow-sm">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-medium text-slate-600">Last 7 days</CardTitle>
                <div className="text-2xl font-semibold text-slate-900 mt-1">
                  {sparkData.reduce((a, b) => a + b.count, 0)}
                  <span className="text-sm font-normal text-slate-500 ml-2">births this week</span>
                </div>
              </div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent className="h-32 pt-0">
              {loading ? <Skeleton className="w-full h-full rounded-xl" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bcolor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"  stopColor="#ec4899" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      cursor={{ stroke: '#ec4899', strokeDasharray: 3 }}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(v: any) => [`${v} birth${v === 1 ? '' : 's'}`, '']}
                      labelFormatter={(l) => l}
                    />
                    <Area
                      type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={2}
                      fill="url(#bcolor)" dot={{ r: 3, fill: '#ec4899' }} activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Delivery types</CardTitle>
            </CardHeader>
            <CardContent className="h-32 flex items-center pt-0">
              {loading ? <Skeleton className="w-full h-full rounded-xl" /> : donutData.length === 0 ? (
                <p className="text-xs text-slate-400 mx-auto">No data yet</p>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <ResponsiveContainer width="50%" height={110}>
                    <PieChart>
                      <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={28} outerRadius={48} paddingAngle={2}>
                        {donutData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="flex-1 text-xs space-y-1">
                    {donutData.map((d, i) => (
                      <li key={d.key} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="truncate text-slate-700">{d.name.replace(' (vaginal)', '')}</span>
                        <span className="ml-auto text-slate-500">{d.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ============ LIST ============ */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base text-slate-900">All births {filtered.length !== records.length && <span className="text-slate-500 font-normal text-sm">— {filtered.length} shown</span>}</CardTitle>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9 h-9 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                  placeholder="Search baby, mother, MRN, cert #…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* filter chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <Chip active={activeFilter === null} onClick={() => setActiveFilter(null)}>All</Chip>
              {DELIVERY_TYPES.map(t => (
                <Chip
                  key={t.value}
                  active={activeFilter === t.value}
                  onClick={() => setActiveFilter(activeFilter === t.value ? null : t.value)}
                >
                  {t.label}
                </Chip>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState onAdd={openNew} hasRecords={records.length > 0} />
            ) : (
              <div>
                {filtered.map((r) => {
                  const t = DELIVERY_TYPES.find(x => x.value === r.deliveryType);
                  return (
                    <button
                      key={r.id}
                      onClick={() => setDetail(r)}
                      className="w-full text-left flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-pink-50 ring-1 ring-pink-100 flex items-center justify-center shrink-0">
                        <Baby className="w-5 h-5 text-pink-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">{r.babyName || '(unnamed newborn)'}</span>
                          <Badge variant="outline" className={`text-[10px] font-normal ${t?.tint || ''}`}>{t?.label || r.deliveryType}</Badge>
                          {!r.liveBirth && <Badge variant="outline" className="text-[10px] font-normal bg-slate-100 text-slate-700 border-slate-200">stillborn</Badge>}
                          {r.certificateNumber && (
                            <span className="text-[10px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded font-mono">{r.certificateNumber}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                          <span>Mother: <span className="text-slate-700">{r.motherPatient?.name || '—'}</span> · {r.motherPatient?.mrn}</span>
                          <span>{new Date(r.birthDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · {new Date(r.birthDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          {r.weightGrams && <span className="flex items-center gap-1"><Weight className="w-3 h-3" /> {r.weightGrams} g</span>}
                          {r.apgar1Min !== null && r.apgar1Min !== undefined && <span>APGAR {r.apgar1Min}/{r.apgar5Min ?? '—'}</span>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); void issueAndPrint(r); }}
                        className="gap-1 h-9 rounded-lg shrink-0"
                      >
                        {r.certificateNumber ? <Printer className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        {r.certificateNumber ? 'Print' : 'Issue'}
                      </Button>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============ DETAIL SHEET (right-side drawer) ============ */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <SheetContent width="max-w-lg">
          {detail && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 ring-1 ring-pink-100 flex items-center justify-center">
                    <Baby className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <SheetTitle>{detail.babyName || '(unnamed newborn)'}</SheetTitle>
                    <SheetDescription>
                      {new Date(detail.birthDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      {detail.babyPatient?.mrn && ` · ${detail.babyPatient.mrn}`}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <SheetBody>
                <DetailGroup title="Baby">
                  <Kv k="Sex" v={detail.babyGender} />
                  <Kv k="Place of birth" v={detail.placeOfBirth} />
                  <Kv k="Delivery type" v={DELIVERY_TYPES.find(t => t.value === detail.deliveryType)?.label || detail.deliveryType} />
                  <Kv k="Live birth" v={detail.liveBirth ? 'Yes' : 'No (stillborn)'} />
                  <Kv k="Weight" v={detail.weightGrams ? `${detail.weightGrams} g` : '—'} />
                  <Kv k="Length" v={detail.lengthCm ? `${detail.lengthCm} cm` : '—'} />
                  <Kv k="Head circumference" v={detail.headCircumferenceCm ? `${detail.headCircumferenceCm} cm` : '—'} />
                  <Kv k="APGAR 1 / 5 min" v={`${detail.apgar1Min ?? '—'} / ${detail.apgar5Min ?? '—'}`} />
                </DetailGroup>
                <DetailGroup title="Mother">
                  <Kv k="Name" v={detail.motherPatient?.name} />
                  <Kv k="MRN" v={detail.motherPatient?.mrn} />
                  <Kv k="Age at birth" v={detail.motherAgeAtBirth ? `${detail.motherAgeAtBirth} yrs` : '—'} />
                  <Kv k="Occupation" v={detail.motherOccupation} />
                  <Kv k="Address" v={detail.parentsAddress || detail.motherPatient?.address} />
                </DetailGroup>
                <DetailGroup title="Father">
                  <Kv k="Name" v={detail.fatherName || '—'} />
                  <Kv k="Occupation" v={detail.fatherOccupation || '—'} />
                </DetailGroup>
                <DetailGroup title="Attending & Certificate">
                  <Kv k="Attending doctor" v={detail.attendingDoctor?.name || detail.attendingDoctorName || '—'} />
                  <Kv k="Certificate #" v={detail.certificateNumber || 'not issued'} />
                  <Kv k="Issued at" v={detail.certificateIssuedAt ? new Date(detail.certificateIssuedAt).toLocaleString('en-IN') : '—'} />
                </DetailGroup>
              </SheetBody>
              <SheetFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
                <Button onClick={() => issueAndPrint(detail)} className="gap-1.5 bg-slate-900 hover:bg-slate-800">
                  {detail.certificateNumber ? <Printer className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  {detail.certificateNumber ? 'Print certificate' : 'Issue & print'}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ============ CREATE DIALOG (kept modal — form-heavy) ============ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Record birth</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Section title="Mother">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Mother (search by name or MRN) *</Label>
                  <PatientPicker patients={patients} value={form.motherPatientId} onChange={(p) => setForm({ ...form, motherPatientId: p?.id || '', parentsAddress: p?.address || form.parentsAddress })} />
                </div>
                <FormInput label="Mother age at birth (yrs)" type="number" value={form.motherAgeAtBirth} onChange={(v) => setForm({ ...form, motherAgeAtBirth: v })} />
                <FormInput label="Mother occupation" value={form.motherOccupation} onChange={(v) => setForm({ ...form, motherOccupation: v })} />
              </div>
            </Section>

            <Section title="Baby">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Baby name (optional — can be added later)" value={form.babyName} onChange={(v) => setForm({ ...form, babyName: v })} />
                <FormSelect label="Sex *" value={form.babyGender} onChange={(v) => setForm({ ...form, babyGender: v })}
                  options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} />
                <FormInput label="Date & time of birth *" type="datetime-local" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} />
                <FormInput label="Place of birth" value={form.placeOfBirth} onChange={(v) => setForm({ ...form, placeOfBirth: v })} />
                <FormSelect label="Type of delivery *" value={form.deliveryType} onChange={(v) => setForm({ ...form, deliveryType: v })}
                  options={DELIVERY_TYPES} />
                <FormInput label="Birth order" type="number" value={form.birthOrder} onChange={(v) => setForm({ ...form, birthOrder: v })} />
                <FormInput label="Weight (g)" type="number" value={form.weightGrams} onChange={(v) => setForm({ ...form, weightGrams: v })} />
                <FormInput label="Length (cm)" type="number" value={form.lengthCm} onChange={(v) => setForm({ ...form, lengthCm: v })} />
                <FormInput label="Head circ. (cm)" type="number" value={form.headCircumferenceCm} onChange={(v) => setForm({ ...form, headCircumferenceCm: v })} />
                <FormInput label="APGAR @ 1 min" type="number" value={form.apgar1Min} onChange={(v) => setForm({ ...form, apgar1Min: v })} />
                <FormInput label="APGAR @ 5 min" type="number" value={form.apgar5Min} onChange={(v) => setForm({ ...form, apgar5Min: v })} />
              </div>
            </Section>

            <Section title="Father / Family">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Father's name" value={form.fatherName} onChange={(v) => setForm({ ...form, fatherName: v })} />
                <FormInput label="Father's occupation" value={form.fatherOccupation} onChange={(v) => setForm({ ...form, fatherOccupation: v })} />
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Address (parents)</Label>
                  <Input value={form.parentsAddress || ''} onChange={(e) => setForm({ ...form, parentsAddress: e.target.value })} />
                </div>
                <FormInput label="Religion" value={form.parentsReligion} onChange={(v) => setForm({ ...form, parentsReligion: v })} />
                <FormInput label="Nationality" value={form.parentsNationality} onChange={(v) => setForm({ ...form, parentsNationality: v })} />
              </div>
            </Section>

            <Section title="Attending Doctor & Notes">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Attending doctor</Label>
                  <Select value={form.attendingDoctorId || '_'} onValueChange={(v) => setForm({ ...form, attendingDoctorId: v === '_' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_">— None —</SelectItem>
                      {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Notes</Label>
                  <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full min-h-[60px] p-2 border rounded-lg text-sm" />
                </div>
              </div>
            </Section>

            <p className="text-xs text-slate-500 px-1">
              Saving creates a new Patient row for the baby (MRN auto-assigned). For stillbirth, no Patient is created.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Saving…' : 'Save & register newborn'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PdfPreviewDialog pdf={pdf} onClose={() => setPdf(null)} title="Birth Certificate" />
    </div>
  );
}

// ====================== sub-components ======================

function StatCard({ label, value, sub, icon, tint, accent, loading }: {
  label: string; value: number; sub?: string; icon: React.ReactNode; tint: string; accent?: string; loading?: boolean;
}) {
  return (
    <Card className="rounded-2xl border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
          <div className={`w-8 h-8 rounded-lg ${tint} ring-1 flex items-center justify-center`}>{icon}</div>
        </div>
        {loading
          ? <Skeleton className="h-8 w-16 mt-3" />
          : <div className={`text-3xl font-semibold ${accent || 'text-slate-900'} mt-2 tracking-tight`}>{value}</div>}
        {sub && !loading && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'text-xs px-3 py-1 rounded-full bg-slate-900 text-white font-medium transition-colors'
          : 'text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors'
      }
    >
      {children}
    </button>
  );
}

function EmptyState({ onAdd, hasRecords }: { onAdd: () => void; hasRecords: boolean }) {
  return (
    <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-pink-50 ring-1 ring-pink-100 flex items-center justify-center mb-4">
        <Baby className="w-8 h-8 text-pink-500" />
      </div>
      <h3 className="text-base font-medium text-slate-900">
        {hasRecords ? 'No matching records' : 'No births recorded yet'}
      </h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        {hasRecords
          ? 'Try clearing the search or filter.'
          : 'Log your first delivery — newborn will be auto-registered as a Patient with an MRN.'}
      </p>
      {!hasRecords && (
        <Button onClick={onAdd} className="gap-1.5 mt-5 rounded-xl bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4" /> Record first birth
        </Button>
      )}
    </div>
  );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">{title}</div>
      <dl className="divide-y divide-slate-100 border border-slate-100 rounded-xl bg-slate-50/40">
        {children}
      </dl>
    </section>
  );
}

function Kv({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2 text-sm">
      <dt className="text-slate-500 shrink-0">{k}</dt>
      <dd className="text-slate-900 text-right break-words">{v || '—'}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">{title}</div>
      {children}
    </div>
  );
}

function FormInput({ label, value, onChange, type = 'text', placeholder }: { label: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input type={type as any} value={value === null || value === undefined ? '' : value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="rounded-lg" />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function PatientPicker({ patients, value, onChange }: { patients: PatientLite[]; value: string; onChange: (p: PatientLite | null) => void }) {
  const [q, setQ] = useState('');
  const selected = patients.find(p => p.id === value);
  if (selected) {
    return (
      <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-2.5 bg-slate-50/60">
        <div className="flex-1 text-sm">
          <span className="font-medium text-slate-900">{selected.name}</span>{' '}
          <span className="text-slate-500 text-xs">({selected.mrn})</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { onChange(null); setQ(''); }} className="h-7">Change</Button>
      </div>
    );
  }
  const filtered = q.trim()
    ? patients.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || (p.mrn || '').toLowerCase().includes(q.toLowerCase()))
        .slice(0, 12)
    : [];
  return (
    <div className="relative">
      <Input placeholder="Type name or MRN…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-lg" />
      {filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-10">
          {filtered.map(p => (
            <button key={p.id} type="button"
              onClick={() => { onChange(p); setQ(''); }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-b-0">
              <div className="font-medium text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-500">{p.mrn} · {p.gender || '—'}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
