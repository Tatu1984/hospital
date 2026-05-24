// Reusable prescription authoring dialog. Used from PatientProfile, the
// IPD ward, and anywhere else a clinician needs to drop a new Rx onto an
// encounter.
//
// Each row captures one drug — name (autocomplete against /api/drugs),
// dose, frequency, duration, free-text instructions. The
// DrugInteractionWarning banner sits above the rows and gates the Save
// button if any selected combination is contraindicated.

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Pill, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from './Toast';
import DrugInteractionWarning, { DrugInteractionHit } from './DrugInteractionWarning';

interface DrugLite { id: string; name: string; genericName?: string | null }

interface RxRow {
  drugId: string;
  drugName: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Props {
  patientId: string;
  encounterId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const FREQUENCY_OPTIONS = [
  { value: 'OD', label: 'OD (once daily)' },
  { value: 'BD', label: 'BD (twice daily)' },
  { value: 'TDS', label: 'TDS (three times daily)' },
  { value: 'QID', label: 'QID (four times daily)' },
  { value: 'SOS', label: 'SOS (as needed)' },
  { value: 'HS', label: 'HS (at bedtime)' },
];

function emptyRow(): RxRow {
  return { drugId: '', drugName: '', dose: '', frequency: 'OD', duration: '', instructions: '' };
}

export default function PrescribeDialog({ patientId, encounterId, open, onOpenChange, onSaved }: Props) {
  const [rows, setRows] = useState<RxRow[]>([emptyRow()]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [severity, setSeverity] = useState<DrugInteractionHit['severity'] | null>(null);
  const toast = useToast();

  // Reset state whenever the dialog opens fresh.
  useEffect(() => {
    if (open) {
      setRows([emptyRow()]);
      setNotes('');
      setSeverity(null);
    }
  }, [open]);

  const drugIds = useMemo(() => rows.map(r => r.drugId).filter(Boolean), [rows]);
  const isBlocked = severity === 'contraindicated';

  function updateRow(i: number, patch: Partial<RxRow>) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }
  function addRow() { setRows(prev => [...prev, emptyRow()]); }
  function removeRow(i: number) {
    setRows(prev => prev.length === 1 ? [emptyRow()] : prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (isBlocked) {
      toast.error('Contraindicated combination — cannot prescribe');
      return;
    }
    const validRows = rows.filter(r => r.drugId && r.dose && r.frequency);
    if (validRows.length === 0) {
      toast.error('Add at least one drug with dose & frequency');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/prescriptions', {
        patientId,
        encounterId: encounterId || null,
        drugs: validRows.map(r => ({
          drugId: r.drugId,
          name: r.drugName,
          dose: r.dose,
          frequency: r.frequency,
          duration: r.duration,
          instructions: r.instructions || undefined,
        })),
        notes: notes || undefined,
      });
      toast.success('Prescription saved');
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
              <Pill className="w-4 h-4 text-emerald-600" />
            </div>
            New prescription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {drugIds.length >= 2 && (
            <DrugInteractionWarning drugIds={drugIds} onSeverityChange={setSeverity} />
          )}

          {isBlocked && (
            <div className="border rounded-xl p-3 bg-red-50 border-red-200 text-sm font-medium text-red-800">
              Contraindicated combination — cannot prescribe
            </div>
          )}

          <div className="space-y-3">
            {rows.map((row, i) => (
              <RxRowEditor
                key={i}
                row={row}
                onChange={(patch) => updateRow(i, patch)}
                onRemove={() => removeRow(i)}
                canRemove={rows.length > 1}
              />
            ))}
          </div>

          <Button
            variant="outline"
            onClick={addRow}
            className="gap-1.5 rounded-xl border-dashed h-10 w-full text-slate-600 hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" /> Add drug
          </Button>

          <div>
            <Label className="text-xs text-slate-500">Notes (optional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any general instructions — diet, follow-up, lifestyle…"
              className="w-full min-h-[60px] p-2 border rounded-lg text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            onClick={save}
            disabled={saving || isBlocked}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {saving ? 'Saving…' : 'Save prescription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RxRowEditor({
  row, onChange, onRemove, canRemove,
}: {
  row: RxRow;
  onChange: (patch: Partial<RxRow>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/40">
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-12 sm:col-span-4">
          <Label className="text-xs text-slate-500">Drug *</Label>
          <DrugAutocomplete
            value={row.drugId}
            valueName={row.drugName}
            onSelect={(d) => onChange({ drugId: d.id, drugName: d.name })}
          />
        </div>
        <div className="col-span-6 sm:col-span-2">
          <Label className="text-xs text-slate-500">Dose *</Label>
          <Input value={row.dose} onChange={(e) => onChange({ dose: e.target.value })} placeholder="500 mg" className="rounded-lg h-9" />
        </div>
        <div className="col-span-6 sm:col-span-2">
          <Label className="text-xs text-slate-500">Frequency *</Label>
          <Select value={row.frequency} onValueChange={(v) => onChange({ frequency: v })}>
            <SelectTrigger className="rounded-lg h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-6 sm:col-span-2">
          <Label className="text-xs text-slate-500">Duration</Label>
          <Input value={row.duration} onChange={(e) => onChange({ duration: e.target.value })} placeholder="5 days" className="rounded-lg h-9" />
        </div>
        <div className="col-span-12 sm:col-span-2 flex gap-2">
          <div className="flex-1">
            <Label className="text-xs text-slate-500">Instructions</Label>
            <Input value={row.instructions} onChange={(e) => onChange({ instructions: e.target.value })} placeholder="After food" className="rounded-lg h-9" />
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            className="h-9 px-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 self-end"
            aria-label="Remove drug"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Debounced /api/drugs?search= autocomplete. Picks the first match on blur
// if the user typed something but didn't click — Rx authoring is fast and
// a forced selection step gets in the way.
function DrugAutocomplete({
  value, valueName, onSelect,
}: {
  value: string;
  valueName: string;
  onSelect: (drug: DrugLite) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<DrugLite[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // If the row already has a selected drug, show a chip with a "change" affordance.
  if (value && !open) {
    return (
      <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 h-9 bg-white">
        <Pill className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="text-sm text-slate-900 truncate flex-1">{valueName}</span>
        <button
          type="button"
          onClick={() => { setOpen(true); setQ(''); }}
          className="text-[11px] text-slate-500 hover:text-slate-900"
        >
          change
        </button>
      </div>
    );
  }

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.get<DrugLite[]>('/api/drugs', { params: { search: q } });
        setResults((r.data || []).slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      <Input
        autoFocus={open}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Type drug name…"
        className="rounded-lg h-9"
      />
      {q && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50">
          {results.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => { onSelect(d); setOpen(false); setQ(''); setResults([]); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-b-0"
            >
              <div className="font-medium text-slate-900">{d.name}</div>
              {d.genericName && <div className="text-xs text-slate-500">{d.genericName}</div>}
            </button>
          ))}
        </div>
      )}
      {q && !loading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 px-3 py-2 text-xs text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm z-50">
          No matches
        </div>
      )}
    </div>
  );
}
