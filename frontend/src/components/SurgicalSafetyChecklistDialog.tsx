// WHO Surgical Safety Checklist — three phases, signed sequentially.
//
//   Phase 1 ("sign in")   — before induction of anaesthesia
//   Phase 2 ("time out")  — before skin incision
//   Phase 3 ("sign out")  — before patient leaves OR
//
// Each phase is a list of canonical checkbox items, plus a "sign phase"
// button that PUTs the data to the backend. Subsequent phases stay
// disabled until the previous one is signed. Once "sign out" is signed,
// the entire checklist becomes read-only.

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ClipboardCheck, Lock, ShieldCheck, Stethoscope, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from './Toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surgeryId: string | null;
  surgeryLabel?: string;
  onSigned?: () => void;
}

// Each phase has a canonical list of items derived from the WHO checklist.
// Persisted JSON shape: { items: { [key]: boolean }, signedBy, signedAt, notes }.
const PHASE_ITEMS: Record<'signIn' | 'timeOut' | 'signOut', Array<{ key: string; label: string }>> = {
  signIn: [
    { key: 'patient_id',         label: 'Patient identity confirmed (name, MRN, DOB, allergies)' },
    { key: 'site_marked',        label: 'Surgical site marked and verified' },
    { key: 'consent',            label: 'Informed consent signed' },
    { key: 'anaesthesia_check',  label: 'Anaesthesia machine & medication check complete' },
    { key: 'pulse_oximeter',     label: 'Pulse oximeter on patient and functioning' },
    { key: 'allergies',          label: 'Patient allergies reviewed and acknowledged' },
    { key: 'difficult_airway',   label: 'Difficult airway / aspiration risk assessed (equipment ready)' },
    { key: 'blood_loss_risk',    label: 'Risk of >500 ml blood loss (>7 ml/kg in children) — IV access & fluids ready' },
  ],
  timeOut: [
    { key: 'team_introductions', label: 'All team members introduced themselves by name and role' },
    { key: 'patient_procedure',  label: 'Surgeon, anaesthetist and nurse confirm patient, site, procedure' },
    { key: 'antibiotic',         label: 'Antibiotic prophylaxis given within last 60 min (or not indicated)' },
    { key: 'imaging',            label: 'Essential imaging is displayed' },
    { key: 'critical_steps',     label: 'Surgeon reviews critical / unexpected steps, expected duration, blood loss' },
    { key: 'anaesthesia_concerns', label: 'Anaesthesia team reviews patient-specific concerns' },
    { key: 'nursing_concerns',   label: 'Nursing team confirms sterility, equipment availability, issues' },
  ],
  signOut: [
    { key: 'procedure_name',     label: 'Procedure name recorded' },
    { key: 'counts_correct',     label: 'Instrument, sponge and needle counts correct' },
    { key: 'specimen_labelled',  label: 'Specimen labelled (including patient name)' },
    { key: 'equipment_problems', label: 'Equipment problems (if any) addressed' },
    { key: 'recovery_concerns',  label: 'Key concerns for recovery & management reviewed by surgeon / anaesthetist / nurse' },
  ],
};

type Phase = 'signIn' | 'timeOut' | 'signOut';

interface PhaseState {
  items: Record<string, boolean>;
  signedBy?: string | null;
  signedAt?: string | null;
  notes?: string | null;
}

interface ChecklistState {
  signIn?: PhaseState | null;
  timeOut?: PhaseState | null;
  signOut?: PhaseState | null;
}

export default function SurgicalSafetyChecklistDialog({ open, onOpenChange, surgeryId, surgeryLabel, onSigned }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<ChecklistState>({});
  // Per-phase editable buffer (items/notes/signedBy). Server holds the
  // signed copy; this buffer is the "what we're about to sign" view.
  const [signIn, setSignIn]   = useState<PhaseState>(blankPhase('signIn'));
  const [timeOut, setTimeOut] = useState<PhaseState>(blankPhase('timeOut'));
  const [signOut, setSignOut] = useState<PhaseState>(blankPhase('signOut'));

  function blankPhase(phase: Phase): PhaseState {
    return { items: Object.fromEntries(PHASE_ITEMS[phase].map(i => [i.key, false])), signedBy: '', notes: '' };
  }

  // --- load ---
  async function load() {
    if (!surgeryId) return;
    setLoading(true);
    try {
      const r = await api.get(`/api/surgeries/${surgeryId}/safety-checklist`);
      const data: ChecklistState = r.data || {};
      setState(data);
      // hydrate buffers — if a phase is already signed we mirror it so the
      // user sees the persisted answers as ticked checkboxes.
      setSignIn(hydrate(data.signIn, 'signIn'));
      setTimeOut(hydrate(data.timeOut, 'timeOut'));
      setSignOut(hydrate(data.signOut, 'signOut'));
    } catch (e: any) {
      // 404 on a never-started checklist is fine — keep buffers blank.
      if (e?.response?.status !== 404) {
        toast.error('Load failed', e?.response?.data?.error || 'Try again');
      }
      setState({});
      setSignIn(blankPhase('signIn'));
      setTimeOut(blankPhase('timeOut'));
      setSignOut(blankPhase('signOut'));
    } finally {
      setLoading(false);
    }
  }

  function hydrate(remote: PhaseState | null | undefined, phase: Phase): PhaseState {
    const blank = blankPhase(phase);
    if (!remote) return blank;
    return {
      items: { ...blank.items, ...(remote.items || {}) },
      signedBy: remote.signedBy || '',
      signedAt: remote.signedAt || null,
      notes: remote.notes || '',
    };
  }

  useEffect(() => { if (open && surgeryId) void load(); }, [open, surgeryId]);

  // --- sign a phase ---
  async function sign(phase: Phase, buffer: PhaseState) {
    if (!surgeryId) return;
    // Verify all items ticked
    const allTicked = PHASE_ITEMS[phase].every(i => buffer.items[i.key]);
    if (!allTicked) { toast.error('All items must be checked before signing'); return; }
    if (!buffer.signedBy || !buffer.signedBy.trim()) { toast.error('Signing name required'); return; }
    setSaving(true);
    try {
      const url = `/api/surgeries/${surgeryId}/safety-checklist/${
        phase === 'signIn' ? 'sign-in' : phase === 'timeOut' ? 'time-out' : 'sign-out'
      }`;
      const payload: any = {
        data: {
          items: buffer.items,
          signedBy: buffer.signedBy.trim(),
          notes: buffer.notes || '',
        },
      };
      const r = await api.put(url, payload);
      // Backend echoes the full checklist; mirror it locally.
      const data: ChecklistState = r.data || {};
      setState(data);
      setSignIn(hydrate(data.signIn, 'signIn'));
      setTimeOut(hydrate(data.timeOut, 'timeOut'));
      setSignOut(hydrate(data.signOut, 'signOut'));
      toast.success(`${phase === 'signIn' ? 'Sign-in' : phase === 'timeOut' ? 'Time-out' : 'Sign-out'} signed`);
      onSigned?.();
    } catch (e: any) {
      toast.error('Sign failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  const signInDone   = !!state.signIn?.signedAt;
  const timeOutDone  = !!state.timeOut?.signedAt;
  const signOutDone  = !!state.signOut?.signedAt;
  const fullyLocked  = signOutDone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">WHO Surgical Safety Checklist</DialogTitle>
              {surgeryLabel && <p className="text-xs text-slate-500 mt-1">{surgeryLabel}</p>}
              {fullyLocked && (
                <Badge variant="outline" className="mt-2 bg-slate-100 text-slate-700 border-slate-200 gap-1">
                  <Lock className="w-3 h-3" /> Locked — sign-out complete
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <PhaseCard
              phase="signIn"
              title="Phase 1 — Sign In"
              subtitle="Before induction of anaesthesia"
              tone="blue"
              icon={<Stethoscope className="w-5 h-5 text-blue-600" />}
              buffer={signIn}
              onChange={setSignIn}
              signedAt={state.signIn?.signedAt || null}
              signedBy={state.signIn?.signedBy || null}
              disabled={fullyLocked || signInDone}
              onSign={() => sign('signIn', signIn)}
              saving={saving}
            />
            <PhaseCard
              phase="timeOut"
              title="Phase 2 — Time Out"
              subtitle="Before skin incision"
              tone="amber"
              icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
              buffer={timeOut}
              onChange={setTimeOut}
              signedAt={state.timeOut?.signedAt || null}
              signedBy={state.timeOut?.signedBy || null}
              disabled={fullyLocked || timeOutDone || !signInDone}
              lockedMsg={!signInDone ? 'Sign-in must be completed first' : undefined}
              onSign={() => sign('timeOut', timeOut)}
              saving={saving}
            />
            <PhaseCard
              phase="signOut"
              title="Phase 3 — Sign Out"
              subtitle="Before patient leaves the operating room"
              tone="emerald"
              icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
              buffer={signOut}
              onChange={setSignOut}
              signedAt={state.signOut?.signedAt || null}
              signedBy={state.signOut?.signedBy || null}
              disabled={fullyLocked || signOutDone || !timeOutDone}
              lockedMsg={!timeOutDone ? 'Time-out must be completed first' : undefined}
              onSign={() => sign('signOut', signOut)}
              saving={saving}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================

const TONE_MAP = {
  blue:    { ring: 'ring-blue-100',    bg: 'bg-blue-50',    text: 'text-blue-700' },
  amber:   { ring: 'ring-amber-100',   bg: 'bg-amber-50',   text: 'text-amber-700' },
  emerald: { ring: 'ring-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-700' },
} as const;

function PhaseCard({
  phase, title, subtitle, tone, icon, buffer, onChange, signedAt, signedBy,
  disabled, lockedMsg, onSign, saving,
}: {
  phase: Phase;
  title: string;
  subtitle: string;
  tone: keyof typeof TONE_MAP;
  icon: React.ReactNode;
  buffer: PhaseState;
  onChange: (next: PhaseState) => void;
  signedAt: string | null;
  signedBy: string | null;
  disabled: boolean;
  lockedMsg?: string;
  onSign: () => void;
  saving: boolean;
}) {
  const t = TONE_MAP[tone];
  const items = PHASE_ITEMS[phase];
  const totalTicked = items.filter(i => buffer.items[i.key]).length;
  const ready = totalTicked === items.length && !!buffer.signedBy?.trim();

  return (
    <Card className={`rounded-2xl border-slate-200/70 ${disabled && !signedAt ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${t.bg} ring-1 ${t.ring} flex items-center justify-center`}>{icon}</div>
            <div>
              <CardTitle className="text-base text-slate-900">{title}</CardTitle>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          {signedAt ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
              <CheckCircle2 className="w-3 h-3" /> Signed {new Date(signedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {signedBy || ''}
            </Badge>
          ) : lockedMsg ? (
            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 gap-1">
              <Lock className="w-3 h-3" /> {lockedMsg}
            </Badge>
          ) : (
            <span className="text-xs text-slate-400 tabular-nums">{totalTicked}/{items.length}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map(i => (
            <li key={i.key} className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={!!buffer.items[i.key]}
                onChange={(e) => onChange({ ...buffer, items: { ...buffer.items, [i.key]: e.target.checked } })}
                disabled={disabled}
                className="mt-1 w-4 h-4 accent-slate-900"
              />
              <span className={`text-sm leading-snug ${buffer.items[i.key] ? 'text-slate-900' : 'text-slate-700'}`}>
                {i.label}
              </span>
            </li>
          ))}
        </ul>
        {!signedAt && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <Label className="text-xs text-slate-500">Signed by *</Label>
              <Input value={buffer.signedBy || ''} onChange={(e) => onChange({ ...buffer, signedBy: e.target.value })}
                disabled={disabled} placeholder="Name / role" className="rounded-lg" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-500">Notes (optional)</Label>
              <Textarea value={buffer.notes || ''} onChange={(e) => onChange({ ...buffer, notes: e.target.value })}
                disabled={disabled} className="min-h-[40px] rounded-lg" />
            </div>
          </div>
        )}
      </CardContent>
      {!signedAt && (
        <div className="px-6 pb-5 pt-1 flex justify-end">
          <Button onClick={onSign} disabled={disabled || !ready || saving} className="bg-slate-900 hover:bg-slate-800 gap-1.5">
            <ShieldCheck className="w-4 h-4" /> {saving ? 'Signing…' : `Sign ${phase === 'signIn' ? 'sign-in' : phase === 'timeOut' ? 'time-out' : 'sign-out'}`}
          </Button>
        </div>
      )}
    </Card>
  );
}
