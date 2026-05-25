// Inter-department Consultations — refreshed UI.
//
// Doctors and nurses raise a "please review this patient" request to
// another department or to a named consultant. The receiving side
// either responds (status → 'responded') or it stays open as
// 'requested' / 'accepted'.
//
// UI patterns mirror BirthRecords / IPD:
//   • Soft visuals — rounded-2xl, hairline shadows, muted icon chips
//   • Three tabs (Inbox / Sent / All open) so a doctor opens the
//     page and immediately sees "what's waiting on me"
//   • Drawer-style detail panel (Sheet) on row click — full question,
//     response history, Respond / Cancel actions inline
//   • Slate-900 primary buttons, pastel header chip

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Network, Plus, Inbox, Send, Flame, Clock, AlertTriangle, MessageSquare, XCircle,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import MrnLink from '../components/MrnLink';

// -------------------- types --------------------

interface PatientLite { id: string; mrn: string; name: string }
interface DoctorLite  { id: string; name: string }
interface UserLite    { id: string; name: string }

interface Consultation {
  id: string;
  patient: PatientLite;
  requestedBy: UserLite;
  assignedTo: UserLite | null;
  respondedBy: UserLite | null;
  toDepartment: string;
  urgency: 'routine' | 'urgent' | 'stat';
  question: string;
  status: 'requested' | 'accepted' | 'responded' | 'cancelled';
  response: string | null;
  requestedAt: string;
  respondedAt: string | null;
}

// -------------------- constants --------------------

const DEPARTMENTS = [
  'Cardiology', 'Nephrology', 'Neurology', 'Orthopedics', 'General Medicine',
  'General Surgery', 'OBGYN', 'Pediatrics', 'ENT', 'Ophthalmology', 'Dermatology',
  'Psychiatry', 'Anesthesia', 'Radiology', 'Pathology', 'Oncology',
  'Gastroenterology', 'Pulmonology', 'Endocrinology', 'Urology',
];

const URGENCY_TINTS: Record<Consultation['urgency'], string> = {
  routine: 'bg-slate-100 text-slate-700 border-slate-200',
  urgent:  'bg-amber-50 text-amber-700 border-amber-200',
  stat:    'bg-red-50 text-red-700 border-red-200',
};

const STATUS_TINTS: Record<Consultation['status'], string> = {
  requested: 'bg-blue-50 text-blue-700 border-blue-200',
  accepted:  'bg-violet-50 text-violet-700 border-violet-200',
  responded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

// -------------------- helpers --------------------

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function excerpt(text: string, n = 120): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

// -------------------- main page --------------------

export default function Consultations() {
  const { user } = useAuth();
  const toast = useToast();
  const myId = user?.id || '';

  // Three independent lists matching the three tabs. Each tab fetches
  // its own slice from the backend with the right query string so we
  // don't accidentally show cancelled rows in the Inbox.
  const [inbox, setInbox]   = useState<Consultation[]>([]);
  const [sent, setSent]     = useState<Consultation[]>([]);
  const [open, setOpen]     = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'inbox' | 'sent' | 'all'>('inbox');

  // Raise-consult dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [patients, setPatients]     = useState<PatientLite[]>([]);
  const [doctors, setDoctors]       = useState<DoctorLite[]>([]);
  const [form, setForm] = useState({
    patientId: '',
    toDepartment: 'General Medicine',
    urgency: 'routine' as Consultation['urgency'],
    question: '',
    assignedToId: '',
  });
  const [saving, setSaving] = useState(false);

  // Detail drawer
  const [detail, setDetail] = useState<Consultation | null>(null);
  const [responseDraft, setResponseDraft] = useState('');
  const [acting, setActing] = useState(false);

  // ----- load -----
  async function load() {
    setLoading(true);
    try {
      const [a, b, c, p, d] = await Promise.all([
        api.get('/api/consultations', { params: { assignedToMe: 'true' } }).catch(() => ({ data: [] })),
        api.get('/api/consultations', { params: { mine: 'true' } }).catch(() => ({ data: [] })),
        api.get('/api/consultations').catch(() => ({ data: [] })),
        api.get('/api/patients', { params: { limit: 500 } }).catch(() => ({ data: [] })),
        api.get('/api/doctors').catch(() => ({ data: [] })),
      ]);
      // Inbox = assigned to me & not cancelled
      setInbox(((a.data || []) as Consultation[]).filter(x => x.status !== 'cancelled'));
      setSent(b.data || []);
      // "All open" = requested OR accepted (regardless of who raised it)
      setOpen(((c.data || []) as Consultation[]).filter(x => x.status === 'requested' || x.status === 'accepted'));
      const rawP = Array.isArray(p.data) ? p.data : (p.data?.items || []);
      setPatients(rawP.map((x: any) => ({ id: x.id, name: x.name, mrn: x.mrn })));
      setDoctors((d.data || []).map((x: any) => ({ id: x.id, name: x.name })));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  // ----- derived stats -----
  // We base stat cards on the "open" pool (any status of requested or
  // accepted) so the numbers reflect actual outstanding workload.
  const stats = useMemo(() => {
    const totalOpen = open.length;
    const urgent    = open.filter(c => c.urgency === 'urgent').length;
    const stat      = open.filter(c => c.urgency === 'stat').length;
    const waiting   = open.filter(c => !c.response).length;
    return { totalOpen, urgent, stat, waiting };
  }, [open]);

  // ----- actions -----
  function openRaise() {
    setForm({
      patientId: '',
      toDepartment: 'General Medicine',
      urgency: 'routine',
      question: '',
      assignedToId: '',
    });
    setDialogOpen(true);
  }

  async function raise() {
    if (!form.patientId)        { toast.error('Pick a patient'); return; }
    if (!form.toDepartment)     { toast.error('Pick a department'); return; }
    if (!form.question.trim())  { toast.error('Write the clinical question'); return; }
    setSaving(true);
    try {
      const payload: any = {
        patientId: form.patientId,
        toDepartment: form.toDepartment,
        urgency: form.urgency,
        question: form.question.trim(),
      };
      if (form.assignedToId) payload.assignedToId = form.assignedToId;
      await api.post('/api/consultations', payload);
      setDialogOpen(false);
      toast.success('Consult raised', `Sent to ${form.toDepartment}.`);
      void load();
    } catch (e: any) {
      toast.error('Could not raise consult', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function respond() {
    if (!detail) return;
    if (!responseDraft.trim()) { toast.error('Write a response first'); return; }
    setActing(true);
    try {
      const r = await api.post(`/api/consultations/${detail.id}/respond`, { response: responseDraft.trim() });
      toast.success('Response sent');
      setDetail({ ...detail, ...(r.data || {}), response: responseDraft.trim(), status: 'responded' });
      setResponseDraft('');
      void load();
    } catch (e: any) {
      toast.error('Could not send response', e?.response?.data?.error || 'Try again');
    } finally {
      setActing(false);
    }
  }

  async function cancel() {
    if (!detail) return;
    setActing(true);
    try {
      await api.post(`/api/consultations/${detail.id}/cancel`);
      toast.success('Consult cancelled');
      setDetail({ ...detail, status: 'cancelled' });
      void load();
    } catch (e: any) {
      toast.error('Could not cancel', e?.response?.data?.error || 'Try again');
    } finally {
      setActing(false);
    }
  }

  // ----- which list does the active tab show -----
  const activeList: Consultation[] =
    tab === 'inbox' ? inbox :
    tab === 'sent'  ? sent  :
                      open;

  const tabCounts = {
    inbox: inbox.length,
    sent: sent.length,
    all: open.length,
  };

  // Detail permissions: respond is allowed when the consult is open and
  // (a) assigned to me, OR (b) unassigned (anyone in the department can
  // pick it up). Cancel is allowed only for the requester and only while
  // the consult is still open.
  const canRespond = !!detail
    && detail.status !== 'cancelled'
    && detail.status !== 'responded'
    && (!detail.assignedTo || detail.assignedTo.id === myId);
  const canCancel = !!detail
    && detail.requestedBy.id === myId
    && detail.status !== 'cancelled'
    && detail.status !== 'responded';

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* ============ HEADER ============ */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center ring-1 ring-violet-100">
              <Network className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Inter-department Consultations</h1>
              <p className="text-sm text-slate-500 mt-0.5">Ask a colleague to review a patient. Track inbox & sent in one place.</p>
            </div>
          </div>
          <Button onClick={openRaise} className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> Raise consult
          </Button>
        </div>

        {/* ============ STATS ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total open"
            value={stats.totalOpen}
            icon={<MessageSquare className="w-4 h-4 text-violet-600" />}
            tint="bg-violet-50 ring-violet-100"
            loading={loading}
          />
          <StatCard
            label="Urgent"
            value={stats.urgent}
            icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
            tint="bg-amber-50 ring-amber-100"
            accent="text-amber-700"
            loading={loading}
          />
          <StatCard
            label="Stat"
            value={stats.stat}
            icon={<Flame className="w-4 h-4 text-red-600" />}
            tint="bg-red-50 ring-red-100"
            accent="text-red-700"
            loading={loading}
          />
          <StatCard
            label="Awaiting response"
            value={stats.waiting}
            icon={<Clock className="w-4 h-4 text-blue-600" />}
            tint="bg-blue-50 ring-blue-100"
            accent="text-blue-700"
            loading={loading}
          />
        </div>

        {/* ============ TABS + LIST ============ */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="bg-slate-100">
                <TabsTrigger value="inbox" className="gap-1.5">
                  <Inbox className="w-3.5 h-3.5" /> Inbox
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">{tabCounts.inbox}</span>
                </TabsTrigger>
                <TabsTrigger value="sent" className="gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Sent
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">{tabCounts.sent}</span>
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-1.5">
                  <Network className="w-3.5 h-3.5" /> All open
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">{tabCounts.all}</span>
                </TabsTrigger>
              </TabsList>
              {/* Tabs primitive requires a TabsContent for each value — we
                  render one shared list, but Radix will only mount the
                  matching content. */}
              <TabsContent value="inbox" className="mt-0" />
              <TabsContent value="sent"  className="mt-0" />
              <TabsContent value="all"   className="mt-0" />
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : activeList.length === 0 ? (
              <EmptyState tab={tab} onRaise={openRaise} />
            ) : (
              <div>
                {activeList.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setDetail(c); setResponseDraft(''); }}
                    className="w-full text-left flex items-start gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ${
                      c.urgency === 'stat' ? 'bg-red-50 ring-red-100' :
                      c.urgency === 'urgent' ? 'bg-amber-50 ring-amber-100' :
                      'bg-violet-50 ring-violet-100'
                    }`}>
                      <Network className={`w-5 h-5 ${
                        c.urgency === 'stat' ? 'text-red-600' :
                        c.urgency === 'urgent' ? 'text-amber-600' :
                        'text-violet-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 truncate">{c.patient?.name || '—'}</span>
                        <MrnLink mrn={c.patient?.mrn} patientId={c.patient?.id} />
                        <Badge variant="outline" className={`text-[10px] font-normal ${URGENCY_TINTS[c.urgency]}`}>
                          {c.urgency.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_TINTS[c.status]}`}>
                          {c.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-slate-700">{c.requestedBy?.name || '—'}</span>
                        <span>→</span>
                        <span className="text-slate-700">{c.toDepartment}</span>
                        {c.assignedTo && <span className="text-slate-400">· assigned to {c.assignedTo.name}</span>}
                        <span className="text-slate-400">· {timeAgo(c.requestedAt)}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1.5 line-clamp-2">{excerpt(c.question, 180)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============ DETAIL SHEET ============ */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setResponseDraft(''); } }}>
        <SheetContent width="max-w-lg">
          {detail && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center">
                    <Network className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="truncate">{detail.patient?.name || '—'}</SheetTitle>
                    <SheetDescription className="flex items-center gap-1.5 flex-wrap">
                      <MrnLink mrn={detail.patient?.mrn} patientId={detail.patient?.id} stopPropagation={false} />
                      <span>· {detail.requestedBy?.name} → {detail.toDepartment}</span>
                    </SheetDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className={`text-[10px] font-normal ${URGENCY_TINTS[detail.urgency]}`}>
                    {detail.urgency.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_TINTS[detail.status]}`}>
                    {detail.status}
                  </Badge>
                  <span className="text-xs text-slate-400 ml-auto">{timeAgo(detail.requestedAt)}</span>
                </div>
              </SheetHeader>
              <SheetBody>
                <DetailGroup title="Question">
                  <p className="px-3 py-3 text-sm text-slate-800 whitespace-pre-wrap">{detail.question}</p>
                </DetailGroup>

                <DetailGroup title="Routing">
                  <Kv k="From" v={detail.requestedBy?.name || '—'} />
                  <Kv k="To department" v={detail.toDepartment} />
                  <Kv k="Assigned to" v={detail.assignedTo?.name || '— (anyone in dept)'} />
                  <Kv k="Requested at" v={new Date(detail.requestedAt).toLocaleString('en-IN')} />
                </DetailGroup>

                {detail.response ? (
                  <DetailGroup title={`Response${detail.respondedBy ? ` — ${detail.respondedBy.name}` : ''}`}>
                    <p className="px-3 py-3 text-sm text-slate-800 whitespace-pre-wrap">{detail.response}</p>
                    {detail.respondedAt && (
                      <div className="px-3 py-2 text-[11px] text-slate-400 border-t border-slate-100">
                        Responded {new Date(detail.respondedAt).toLocaleString('en-IN')}
                      </div>
                    )}
                  </DetailGroup>
                ) : detail.status === 'cancelled' ? (
                  <div className="text-sm text-slate-500 italic px-1 py-2">This consult was cancelled.</div>
                ) : (
                  <DetailGroup title="No response yet">
                    <p className="px-3 py-3 text-sm text-slate-500 italic">Waiting on the receiving team.</p>
                  </DetailGroup>
                )}

                {canRespond && (
                  <section className="mb-5">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Respond</div>
                    <Textarea
                      value={responseDraft}
                      onChange={(e) => setResponseDraft(e.target.value)}
                      placeholder="Type your reply — findings, recommendations, follow-up advice…"
                      className="min-h-[120px] rounded-xl"
                    />
                  </section>
                )}
              </SheetBody>
              <SheetFooter>
                {canCancel && (
                  <Button
                    variant="outline"
                    onClick={cancel}
                    disabled={acting}
                    className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" /> Cancel consult
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDetail(null)} disabled={acting}>Close</Button>
                {canRespond && (
                  <Button
                    onClick={respond}
                    disabled={acting || !responseDraft.trim()}
                    className="gap-1.5 bg-slate-900 hover:bg-slate-800"
                  >
                    <Send className="w-4 h-4" /> {acting ? 'Sending…' : 'Send response'}
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ============ RAISE DIALOG ============ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Raise inter-department consult</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-slate-500">Patient *</Label>
              <PatientPicker
                patients={patients}
                value={form.patientId}
                onChange={(p) => setForm({ ...form, patientId: p?.id || '' })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">To department *</Label>
                <Select value={form.toDepartment} onValueChange={(v) => setForm({ ...form, toDepartment: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Urgency *</Label>
                <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v as Consultation['urgency'] })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">Stat (emergency)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Assign to specific doctor (optional)</Label>
              <Select
                value={form.assignedToId || '_'}
                onValueChange={(v) => setForm({ ...form, assignedToId: v === '_' ? '' : v })}
              >
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Any doctor in department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">— Any doctor in department —</SelectItem>
                  {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Clinical question *</Label>
              <Textarea
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="Briefly describe the case and what you want reviewed…"
                className="min-h-[140px] rounded-xl"
              />
            </div>
            <p className="text-xs text-slate-500 px-1">
              The receiving team will see this in their Inbox. Use Stat only for life-threatening cases.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={raise} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Sending…' : 'Send consult'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =================== sub-components ===================

function StatCard({ label, value, icon, tint, accent, loading }: {
  label: string; value: number; icon: React.ReactNode; tint: string; accent?: string; loading?: boolean;
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
      </CardContent>
    </Card>
  );
}

function EmptyState({ tab, onRaise }: { tab: 'inbox' | 'sent' | 'all'; onRaise: () => void }) {
  const copy = tab === 'inbox'
    ? { title: 'Inbox zero', sub: 'No consults assigned to you right now. Nice work.' }
    : tab === 'sent'
      ? { title: 'You haven\'t raised any consults', sub: 'Need a specialist opinion? Raise a new consult — the receiving team will see it instantly.' }
      : { title: 'No open consults anywhere', sub: 'All inter-department requests have been responded to or closed.' };

  return (
    <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center mb-4">
        <Network className="w-8 h-8 text-violet-500" />
      </div>
      <h3 className="text-base font-medium text-slate-900">{copy.title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">{copy.sub}</p>
      {tab === 'sent' && (
        <Button onClick={onRaise} className="gap-1.5 mt-5 rounded-xl bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4" /> Raise consult
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

function PatientPicker({ patients, value, onChange }: {
  patients: PatientLite[]; value: string; onChange: (p: PatientLite | null) => void;
}) {
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
    ? patients.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.mrn || '').toLowerCase().includes(q.toLowerCase()),
      ).slice(0, 12)
    : [];
  return (
    <div className="relative">
      <Input
        placeholder="Type name or MRN…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="rounded-lg"
      />
      {filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-10">
          {filtered.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p); setQ(''); }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-b-0"
            >
              <div className="font-medium text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-500 font-mono">{p.mrn}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
