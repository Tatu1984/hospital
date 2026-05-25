// PMJAY claims (Ayushman Bharat — Pradhan Mantri Jan Arogya Yojana).
//
// Workflow:
//   eligibility_pending → pre_auth_requested → pre_auth_approved
//   → claim_submitted → claim_approved → paid
// Rejection can happen at the pre-auth or claim step.
//
// UI shape: 5-column kanban where each card lives in the column matching
// its current status. The card's primary action button is whatever the
// next step is; the secondary action (where applicable) is reject.

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ShieldCheck, Plus, Search, IndianRupee, FileText, CheckCircle2, XCircle, Clock, ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import MrnLink from '../components/MrnLink';

interface PatientLite { id: string; mrn: string; name: string }

interface PMJAYClaim {
  id: string;
  patientId: string;
  patient?: PatientLite | null;
  admissionId?: string | null;
  invoiceId?: string | null;
  pmjayId: string;
  packageCode: string;
  packageName: string;
  packageAmount: number;
  status: string;
  preAuthNumber?: string | null;
  preAuthRequestedAt?: string | null;
  preAuthApprovedAt?: string | null;
  rejectionReason?: string | null;
  claimNumber?: string | null;
  claimSubmittedAt?: string | null;
  amountApproved?: number | null;
  amountPaid?: number | null;
  paidAt?: string | null;
  createdAt: string;
}

const COLUMNS = [
  { key: 'eligibility_pending', label: 'Eligibility',    tint: 'border-slate-200 bg-slate-50', accent: 'text-slate-700' },
  { key: 'pre_auth_requested',  label: 'Pre-auth requested', tint: 'border-amber-200 bg-amber-50/60', accent: 'text-amber-800' },
  { key: 'pre_auth_approved',   label: 'Pre-auth approved',  tint: 'border-blue-200 bg-blue-50/60', accent: 'text-blue-800' },
  { key: 'claim_submitted',     label: 'Claim submitted', tint: 'border-violet-200 bg-violet-50/60', accent: 'text-violet-800' },
  { key: 'claim_approved_paid', label: 'Approved / paid', tint: 'border-emerald-200 bg-emerald-50/60', accent: 'text-emerald-800' },
];

const STATUS_LABEL: Record<string, string> = {
  eligibility_pending: 'Eligibility pending',
  pre_auth_requested:  'Pre-auth requested',
  pre_auth_approved:   'Pre-auth approved',
  pre_auth_rejected:   'Pre-auth rejected',
  claim_submitted:     'Claim submitted',
  claim_approved:      'Claim approved',
  claim_rejected:      'Claim rejected',
  paid:                'Paid',
};

// Indian-format currency (₹1,23,456.00). Intl handles the lakh grouping
// when locale is en-IN.
function inr(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

export default function PMJAYClaims() {
  const [claims, setClaims] = useState<PMJAYClaim[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm());
  const [saving, setSaving] = useState(false);
  // Action modals
  const [actionTarget, setActionTarget] = useState<{ claim: PMJAYClaim; action: ActionType } | null>(null);
  const [actionForm, setActionForm] = useState<any>({});
  const [actioning, setActioning] = useState(false);
  const toast = useToast();

  function emptyForm() {
    return {
      patientId: '',
      admissionId: '',
      invoiceId: '',
      pmjayId: '',
      packageCode: '',
      packageName: '',
      packageAmount: '',
    };
  }

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const [c, p] = await Promise.all([
        api.get('/api/pmjay', { params }).catch(() => ({ data: [] })),
        api.get('/api/patients', { params: { limit: 500 } }).catch(() => ({ data: [] })),
      ]);
      setClaims(Array.isArray(c.data) ? c.data : (c.data?.items || []));
      const raw = Array.isArray(p.data) ? p.data : (p.data?.items || []);
      setPatients(raw.map((x: any) => ({ id: x.id, mrn: x.mrn, name: x.name })));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const t = setTimeout(() => { void load(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  // ---------- new claim ----------
  async function saveNew() {
    if (!form.patientId) { toast.error('Pick the patient'); return; }
    if (!form.pmjayId) { toast.error('PMJAY ID is required'); return; }
    if (!form.packageCode) { toast.error('Package code is required'); return; }
    if (!form.packageName) { toast.error('Package name is required'); return; }
    if (!form.packageAmount || Number(form.packageAmount) <= 0) { toast.error('Package amount must be > 0'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      payload.packageAmount = Number(payload.packageAmount);
      Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === null) delete payload[k]; });
      await api.post('/api/pmjay', payload);
      setDialogOpen(false);
      toast.success('Claim created', 'Status: eligibility pending');
      void load();
    } catch (e: any) {
      toast.error('Create failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  // ---------- actions ----------
  async function runAction() {
    if (!actionTarget) return;
    const { claim, action } = actionTarget;
    setActioning(true);
    try {
      switch (action) {
        case 'request_preauth':
          await api.post(`/api/pmjay/${claim.id}/request-preauth`, { preAuthNumber: actionForm.preAuthNumber || undefined });
          break;
        case 'approve_preauth':
          if (!actionForm.preAuthNumber) { toast.error('Pre-auth number required'); setActioning(false); return; }
          await api.post(`/api/pmjay/${claim.id}/approve-preauth`, { preAuthNumber: actionForm.preAuthNumber });
          break;
        case 'reject_preauth':
          if (!actionForm.rejectionReason) { toast.error('Rejection reason required'); setActioning(false); return; }
          await api.post(`/api/pmjay/${claim.id}/reject-preauth`, { rejectionReason: actionForm.rejectionReason });
          break;
        case 'submit_claim':
          await api.post(`/api/pmjay/${claim.id}/submit-claim`, {
            claimNumber: actionForm.claimNumber || undefined,
            documents: actionForm.documents || undefined,
          });
          break;
        case 'approve_claim':
          if (!actionForm.amountApproved || Number(actionForm.amountApproved) <= 0) { toast.error('Amount approved > 0 required'); setActioning(false); return; }
          await api.post(`/api/pmjay/${claim.id}/approve-claim`, { amountApproved: Number(actionForm.amountApproved) });
          break;
        case 'mark_paid':
          if (!actionForm.amountPaid || Number(actionForm.amountPaid) <= 0) { toast.error('Amount paid > 0 required'); setActioning(false); return; }
          await api.post(`/api/pmjay/${claim.id}/mark-paid`, {
            amountPaid: Number(actionForm.amountPaid),
            paidAt: actionForm.paidAt ? new Date(actionForm.paidAt).toISOString() : undefined,
          });
          break;
      }
      toast.success('Updated');
      setActionTarget(null);
      setActionForm({});
      void load();
    } catch (e: any) {
      toast.error('Action failed', e?.response?.data?.error || 'Try again');
    } finally {
      setActioning(false);
    }
  }

  function openAction(claim: PMJAYClaim, action: ActionType) {
    setActionTarget({ claim, action });
    setActionForm({
      preAuthNumber: claim.preAuthNumber || '',
      amountApproved: claim.packageAmount,
      amountPaid: claim.amountApproved || claim.packageAmount,
    });
  }

  // ---------- derived ----------
  const stats = useMemo(() => {
    const total = claims.length;
    const pendingPreAuth = claims.filter(c => c.status === 'pre_auth_requested').length;
    const submitted = claims.filter(c => c.status === 'claim_submitted').length;
    const paid = claims.filter(c => c.status === 'paid').reduce((s, c) => s + (c.amountPaid || 0), 0);
    return { total, pendingPreAuth, submitted, paid };
  }, [claims]);

  const byColumn = useMemo(() => {
    const map: Record<string, PMJAYClaim[]> = {};
    for (const c of claims) {
      let col = c.status;
      if (c.status === 'claim_approved' || c.status === 'paid') col = 'claim_approved_paid';
      (map[col] = map[col] || []).push(c);
    }
    return map;
  }, [claims]);

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">PMJAY claims</h1>
              <p className="text-sm text-slate-500 mt-0.5">Ayushman Bharat — Pradhan Mantri Jan Arogya Yojana</p>
            </div>
          </div>
          <Button onClick={() => { setForm(emptyForm()); setDialogOpen(true); }} className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> New claim
          </Button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total claims" value={String(stats.total)} icon={<FileText className="w-4 h-4 text-emerald-600" />} tint="bg-emerald-50 ring-emerald-100" loading={loading} />
          <StatCard label="Pending pre-auth" value={String(stats.pendingPreAuth)} icon={<Clock className="w-4 h-4 text-amber-600" />} tint="bg-amber-50 ring-amber-100" accent="text-amber-700" loading={loading} />
          <StatCard label="Claims submitted" value={String(stats.submitted)} icon={<FileText className="w-4 h-4 text-violet-600" />} tint="bg-violet-50 ring-violet-100" accent="text-violet-700" loading={loading} />
          <StatCard label="Total paid" value={inr(stats.paid)} icon={<IndianRupee className="w-4 h-4 text-emerald-600" />} tint="bg-emerald-50 ring-emerald-100" accent="text-emerald-700" loading={loading} />
        </div>

        {/* FILTERS */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9 h-9 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                placeholder="Search MRN, PMJAY ID, package…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* KANBAN */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {COLUMNS.map(col => {
              const items = byColumn[col.key] || [];
              return (
                <div key={col.key} className={`rounded-2xl border ${col.tint} p-3 min-h-[200px]`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-xs uppercase tracking-wide font-semibold ${col.accent}`}>{col.label}</h3>
                    <span className="text-xs text-slate-500 tabular-nums">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-6 text-center">empty</div>
                    ) : (
                      items.map(c => <ClaimCard key={c.id} claim={c} onAction={openAction} />)
                    )}
                  </div>
                </div>
              );
            })}
            {/* Rejected lane — shown only if there are any rejected claims */}
            {(claims.filter(c => c.status === 'pre_auth_rejected' || c.status === 'claim_rejected').length > 0) && (
              <div className="rounded-2xl border border-red-200 bg-red-50/60 p-3 lg:col-span-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs uppercase tracking-wide font-semibold text-red-800">Rejected</h3>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {claims.filter(c => c.status === 'pre_auth_rejected' || c.status === 'claim_rejected').length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {claims.filter(c => c.status === 'pre_auth_rejected' || c.status === 'claim_rejected')
                    .map(c => <ClaimCard key={c.id} claim={c} onAction={openAction} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New-claim dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">New PMJAY claim</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-slate-500">Patient *</Label>
              <PatientPicker patients={patients} value={form.patientId} onChange={(p) => setForm({ ...form, patientId: p?.id || '' })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="PMJAY ID *" value={form.pmjayId} onChange={(v) => setForm({ ...form, pmjayId: v })} />
              <FormInput label="Admission ID" value={form.admissionId} placeholder="(optional)" onChange={(v) => setForm({ ...form, admissionId: v })} />
              <FormInput label="Package code *" value={form.packageCode} placeholder="e.g. SHA-NCS-053" onChange={(v) => setForm({ ...form, packageCode: v })} />
              <FormInput label="Package amount (₹) *" type="number" value={form.packageAmount} onChange={(v) => setForm({ ...form, packageAmount: v })} />
              <div className="col-span-2">
                <FormInput label="Package name *" value={form.packageName} onChange={(v) => setForm({ ...form, packageName: v })} />
              </div>
              <FormInput label="Invoice ID" value={form.invoiceId} placeholder="(optional)" onChange={(v) => setForm({ ...form, invoiceId: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveNew} disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Saving…' : 'Create claim'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action dialog */}
      <Dialog open={!!actionTarget} onOpenChange={(o) => { if (!o) { setActionTarget(null); setActionForm({}); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{actionTarget ? ACTION_TITLES[actionTarget.action] : ''}</DialogTitle>
          </DialogHeader>
          {actionTarget && (
            <div className="space-y-3 py-2">
              <div className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
                <div className="font-medium text-slate-900 flex items-center gap-2">
                  <span>{actionTarget.claim.patient?.name || 'Patient'}</span>
                  <MrnLink mrn={actionTarget.claim.patient?.mrn} patientId={actionTarget.claim.patient?.id} />
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {actionTarget.claim.packageCode} · {actionTarget.claim.packageName} · {inr(actionTarget.claim.packageAmount)}
                </div>
              </div>

              {actionTarget.action === 'request_preauth' && (
                <FormInput label="Pre-auth reference (optional)" value={actionForm.preAuthNumber} onChange={(v) => setActionForm({ ...actionForm, preAuthNumber: v })} />
              )}
              {actionTarget.action === 'approve_preauth' && (
                <FormInput label="Pre-auth number *" value={actionForm.preAuthNumber} onChange={(v) => setActionForm({ ...actionForm, preAuthNumber: v })} />
              )}
              {actionTarget.action === 'reject_preauth' && (
                <div>
                  <Label className="text-xs text-slate-500">Rejection reason *</Label>
                  <Textarea rows={3} value={actionForm.rejectionReason || ''} onChange={(e) => setActionForm({ ...actionForm, rejectionReason: e.target.value })} className="rounded-lg" />
                </div>
              )}
              {actionTarget.action === 'submit_claim' && (
                <>
                  <FormInput label="Claim number (optional)" value={actionForm.claimNumber} onChange={(v) => setActionForm({ ...actionForm, claimNumber: v })} />
                  <div>
                    <Label className="text-xs text-slate-500">Documents (comma-separated URLs / refs)</Label>
                    <Textarea rows={2} value={actionForm.documentsText || ''} onChange={(e) => setActionForm({ ...actionForm, documentsText: e.target.value, documents: e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean) })} className="rounded-lg" />
                  </div>
                </>
              )}
              {actionTarget.action === 'approve_claim' && (
                <FormInput label="Amount approved (₹) *" type="number" value={actionForm.amountApproved} onChange={(v) => setActionForm({ ...actionForm, amountApproved: v })} />
              )}
              {actionTarget.action === 'mark_paid' && (
                <>
                  <FormInput label="Amount paid (₹) *" type="number" value={actionForm.amountPaid} onChange={(v) => setActionForm({ ...actionForm, amountPaid: v })} />
                  <FormInput label="Paid at (optional)" type="datetime-local" value={actionForm.paidAt} onChange={(v) => setActionForm({ ...actionForm, paidAt: v })} />
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionTarget(null); setActionForm({}); }} disabled={actioning}>Cancel</Button>
            <Button
              onClick={runAction}
              disabled={actioning}
              className={
                actionTarget?.action === 'reject_preauth'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-slate-900 hover:bg-slate-800'
              }
            >
              {actioning ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====================== sub-components ======================

type ActionType =
  | 'request_preauth'
  | 'approve_preauth'
  | 'reject_preauth'
  | 'submit_claim'
  | 'approve_claim'
  | 'mark_paid';

const ACTION_TITLES: Record<ActionType, string> = {
  request_preauth:  'Request pre-auth',
  approve_preauth:  'Approve pre-auth',
  reject_preauth:   'Reject pre-auth',
  submit_claim:     'Submit claim',
  approve_claim:    'Approve claim',
  mark_paid:        'Mark as paid',
};

function ClaimCard({ claim, onAction }: { claim: PMJAYClaim; onAction: (c: PMJAYClaim, a: ActionType) => void }) {
  const next = nextAction(claim.status);
  const isRejected = claim.status === 'pre_auth_rejected' || claim.status === 'claim_rejected';
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">{claim.patient?.name || 'Patient'}</div>
          <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
            <MrnLink mrn={claim.patient?.mrn} patientId={claim.patient?.id} />
            <span>· PMJAY {claim.pmjayId}</span>
          </div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-slate-600 truncate" title={claim.packageName}>
        <span className="font-mono text-slate-500">{claim.packageCode}</span> · {claim.packageName}
      </div>
      <div className="mt-1.5 text-sm font-semibold text-slate-900 tabular-nums">{inr(claim.packageAmount)}</div>
      {claim.preAuthNumber && (
        <div className="text-[10px] text-blue-700 bg-blue-50 inline-block px-1.5 py-0.5 rounded mt-1 font-mono">PA {claim.preAuthNumber}</div>
      )}
      {claim.claimNumber && (
        <div className="text-[10px] text-violet-700 bg-violet-50 inline-block px-1.5 py-0.5 rounded mt-1 font-mono ml-1">CL {claim.claimNumber}</div>
      )}
      {claim.amountPaid != null && (
        <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Paid {inr(claim.amountPaid)}
        </div>
      )}
      {isRejected && claim.rejectionReason && (
        <div className="mt-1 text-[11px] text-red-700 bg-red-50 rounded px-2 py-1 flex items-start gap-1">
          <XCircle className="w-3 h-3 mt-0.5 shrink-0" /> <span className="line-clamp-2">{claim.rejectionReason}</span>
        </div>
      )}
      <div className="mt-2 flex flex-col gap-1.5">
        {next && (
          <Button size="sm" onClick={() => onAction(claim, next)} className="h-7 text-xs gap-1 w-full bg-slate-900 hover:bg-slate-800">
            {ACTION_TITLES[next]} <ChevronRight className="w-3 h-3" />
          </Button>
        )}
        {(claim.status === 'pre_auth_requested') && (
          <Button size="sm" variant="outline" onClick={() => onAction(claim, 'reject_preauth')} className="h-7 text-xs w-full border-red-200 text-red-700 hover:bg-red-50">
            Reject
          </Button>
        )}
      </div>
    </div>
  );
}

function nextAction(status: string): ActionType | null {
  switch (status) {
    case 'eligibility_pending': return 'request_preauth';
    case 'pre_auth_requested':  return 'approve_preauth';
    case 'pre_auth_approved':   return 'submit_claim';
    case 'claim_submitted':     return 'approve_claim';
    case 'claim_approved':      return 'mark_paid';
    default:                    return null;
  }
}

function StatCard({ label, value, sub, icon, tint, accent, loading }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; tint: string; accent?: string; loading?: boolean;
}) {
  return (
    <Card className="rounded-2xl border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
          <div className={`w-8 h-8 rounded-lg ${tint} ring-1 flex items-center justify-center`}>{icon}</div>
        </div>
        {loading
          ? <Skeleton className="h-8 w-24 mt-3" />
          : <div className={`text-3xl font-semibold ${accent || 'text-slate-900'} mt-2 tracking-tight tabular-nums`}>{value}</div>}
        {sub && !loading && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </CardContent>
    </Card>
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
              <div className="text-xs text-slate-500">{p.mrn}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
