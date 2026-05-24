// "Raise Alarm" button pinned in the portal header. One click → modal
// where staff pick a code (Code Blue / Red / Pink / etc.), specify a
// location, and optionally add a message. On submit, the alert is
// broadcast and every connected portal sees it within ~3 seconds.

import { useState } from 'react';
import { Siren, AlertOctagon } from 'lucide-react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAlerts } from '../contexts/AlertContext';
import { useToast } from './Toast';

interface CodeDef {
  code: string;
  label: string;
  severity: 'critical' | 'warning' | 'info';
  tint: string;
  dot: string; // tailwind bg-* color matching the broadcast banner color
}

// Ordered the way Indian hospitals usually post on the back of the ID card.
// Critical first (the everyday emergencies), then warning, then info.
const CODES: CodeDef[] = [
  { code: 'CODE_BLUE',     label: 'Code Blue — Cardiac arrest',          severity: 'critical', dot: 'bg-blue-600',    tint: 'bg-blue-50    text-blue-700    ring-blue-200' },
  { code: 'CODE_RED',      label: 'Code Red — Fire',                     severity: 'critical', dot: 'bg-red-600',     tint: 'bg-red-50     text-red-700     ring-red-200' },
  { code: 'CODE_PINK',     label: 'Code Pink — Infant abduction',        severity: 'critical', dot: 'bg-pink-600',    tint: 'bg-pink-50    text-pink-700    ring-pink-200' },
  { code: 'CODE_BLACK',    label: 'Code Black — Bomb threat',            severity: 'critical', dot: 'bg-slate-900',   tint: 'bg-slate-100  text-slate-900   ring-slate-300' },
  { code: 'CODE_ORANGE',   label: 'Code Orange — Hazmat',                severity: 'critical', dot: 'bg-orange-600',  tint: 'bg-orange-50  text-orange-700  ring-orange-200' },
  { code: 'CODE_SILVER',   label: 'Code Silver — Weapon / active threat',severity: 'critical', dot: 'bg-slate-500',   tint: 'bg-slate-100  text-slate-900   ring-slate-300' },
  { code: 'MASS_CASUALTY', label: 'Mass casualty incident',              severity: 'critical', dot: 'bg-red-700',     tint: 'bg-red-50     text-red-700     ring-red-200' },
  { code: 'EVACUATION',    label: 'Evacuation',                          severity: 'critical', dot: 'bg-orange-600',  tint: 'bg-orange-50  text-orange-700  ring-orange-200' },
  { code: 'CODE_GREY',     label: 'Code Grey — Combative person',        severity: 'warning',  dot: 'bg-slate-600',   tint: 'bg-slate-100  text-slate-800   ring-slate-300' },
  { code: 'CODE_YELLOW',   label: 'Code Yellow — Internal emergency',    severity: 'warning',  dot: 'bg-yellow-400',  tint: 'bg-yellow-50  text-yellow-800  ring-yellow-200' },
  { code: 'ANNOUNCEMENT',  label: 'General announcement',                severity: 'info',     dot: 'bg-sky-600',     tint: 'bg-sky-50     text-sky-700     ring-sky-200' },
];

export default function RaiseAlarmButton() {
  const { raise } = useAlerts();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<CodeDef>(CODES[0]);
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  function reset() {
    setCode(CODES[0]);
    setLocation('');
    setMessage('');
  }

  async function submit() {
    if (!location.trim()) { toast.error('Location is required'); return; }
    setSubmitting(true);
    try {
      await raise({ code: code.code, severity: code.severity, location: location.trim(), message: message.trim() || undefined });
      toast.success('Alert raised', `${code.label.split(' —')[0]} broadcast to all portals.`);
      setOpen(false);
      reset();
    } catch (e: any) {
      toast.error('Raise failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200 text-[12px] font-semibold transition-colors"
        title="Raise emergency alarm"
      >
        <Siren className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Raise alarm</span>
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertOctagon className="w-5 h-5 text-red-600" />
              Raise emergency alarm
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500 bg-amber-50/80 border border-amber-200 rounded-lg p-3">
              <strong className="font-semibold text-amber-800">Heads up:</strong> Submitting will broadcast to <strong>every screen</strong> currently signed in — wards, OPD desks, billing counters, ICU. Use only for genuine emergencies. False alarms are audited.
            </p>

            <div>
              <Label className="text-xs text-slate-500 mb-2 block">Code *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[260px] overflow-y-auto pr-1">
                {CODES.map(c => (
                  <button
                    key={c.code}
                    onClick={() => setCode(c)}
                    className={`text-left px-3 py-2 rounded-lg text-[13px] border transition-colors flex items-center gap-2 ${
                      code.code === c.code
                        ? 'border-slate-900 ring-1 ring-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${c.dot} ring-2 ring-white shadow-sm`} />
                    <span className={code.code === c.code ? 'text-slate-900 font-medium' : 'text-slate-700'}>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-500">Location *</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. ICU Bed 4, OPD Reception, Ward 3-B"
                autoFocus
              />
            </div>

            <div>
              <Label className="text-xs text-slate-500">Message (optional)</Label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full min-h-[60px] p-2 border border-slate-200 rounded-lg text-sm"
                placeholder="Brief detail — e.g. 'Adult male, no pulse', 'Smoke detected near MRI'"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? 'Broadcasting…' : 'Raise & broadcast'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
