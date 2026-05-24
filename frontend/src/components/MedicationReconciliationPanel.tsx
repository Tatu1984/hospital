// MedicationReconciliationPanel — 3-column view (home / admission /
// discharge) of medications attached to an admission, with add + delete.
//
// Backed by /api/admissions/:id/med-rec (GET, POST) and
// /api/med-rec/:id (DELETE). The "action" column (continue/hold/stop/
// modify/new) is only meaningful for the discharge column and is shown
// there with a small icon hint (green check / red dash / blue plus).

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, X, Check, Minus, Pill, Home, Hospital, LogOut as LogOutIcon,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from './Toast';

type Source = 'home' | 'admission' | 'discharge';
type Action = 'continue' | 'hold' | 'stop' | 'modify' | 'new';

interface MedRecRow {
  id: string;
  source: Source;
  drugName: string;
  drugId?: string | null;
  dose?: string | null;
  frequency?: string | null;
  action?: Action | null;
  reason?: string | null;
  reconciledAt?: string | null;
}

interface Props {
  admissionId: string;
}

const COLUMNS: Array<{
  key: Source;
  title: string;
  icon: React.ReactNode;
  tint: string;
}> = [
  { key: 'home',       title: 'Home medications',      icon: <Home className="w-4 h-4 text-blue-600" />,       tint: 'bg-blue-50 ring-blue-100' },
  { key: 'admission',  title: 'Admission medications', icon: <Hospital className="w-4 h-4 text-amber-600" />,  tint: 'bg-amber-50 ring-amber-100' },
  { key: 'discharge',  title: 'Discharge medications', icon: <LogOutIcon className="w-4 h-4 text-emerald-600" />, tint: 'bg-emerald-50 ring-emerald-100' },
];

const ACTION_OPTIONS: Array<{ value: Action; label: string }> = [
  { value: 'continue', label: 'Continue' },
  { value: 'modify',   label: 'Modify' },
  { value: 'hold',     label: 'Hold' },
  { value: 'stop',     label: 'Stop' },
  { value: 'new',      label: 'New' },
];

// Small icon hint for the discharge column action.
function ActionGlyph({ action }: { action?: Action | null }) {
  if (!action) return null;
  if (action === 'continue' || action === 'modify') {
    return (
      <span className="inline-flex w-5 h-5 rounded-full bg-emerald-50 ring-1 ring-emerald-200 items-center justify-center">
        <Check className="w-3 h-3 text-emerald-600" />
      </span>
    );
  }
  if (action === 'stop' || action === 'hold') {
    return (
      <span className="inline-flex w-5 h-5 rounded-full bg-red-50 ring-1 ring-red-200 items-center justify-center">
        <Minus className="w-3 h-3 text-red-600" />
      </span>
    );
  }
  if (action === 'new') {
    return (
      <span className="inline-flex w-5 h-5 rounded-full bg-blue-50 ring-1 ring-blue-200 items-center justify-center">
        <Plus className="w-3 h-3 text-blue-600" />
      </span>
    );
  }
  return null;
}

export default function MedicationReconciliationPanel({ admissionId }: Props) {
  const toast = useToast();
  const [rows, setRows] = useState<MedRecRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addSource, setAddSource] = useState<Source>('home');
  const [addForm, setAddForm] = useState({
    drugName: '',
    dose: '',
    frequency: '',
    action: '' as Action | '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/admissions/${admissionId}/med-rec`);
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      toast.error('Could not load medications', e?.response?.data?.error || 'Try again.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admissionId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissionId]);

  const openAdd = (source: Source) => {
    setAddSource(source);
    setAddForm({ drugName: '', dose: '', frequency: '', action: '', reason: '' });
    setAddOpen(true);
  };

  const submitAdd = async () => {
    if (!addForm.drugName.trim()) {
      toast.warning('Drug name is required');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/admissions/${admissionId}/med-rec`, {
        source: addSource,
        drugName: addForm.drugName.trim(),
        dose: addForm.dose.trim() || undefined,
        frequency: addForm.frequency.trim() || undefined,
        action: addForm.action || undefined,
        reason: addForm.reason.trim() || undefined,
      });
      toast.success('Medication added');
      setAddOpen(false);
      void load();
    } catch (e: any) {
      toast.error('Add failed', e?.response?.data?.error || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (id: string) => {
    if (!confirm('Remove this medication?')) return;
    try {
      await api.delete(`/api/med-rec/${id}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success('Removed');
    } catch (e: any) {
      toast.error('Remove failed', e?.response?.data?.error || 'Try again.');
    }
  };

  const byColumn = (source: Source) => rows.filter((r) => r.source === source);

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const items = byColumn(col.key);
          return (
            <div
              key={col.key}
              className="border border-slate-200 rounded-2xl bg-white flex flex-col min-h-[280px]"
            >
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg ring-1 flex items-center justify-center ${col.tint}`}>
                  {col.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">{col.title}</div>
                  <div className="text-[11px] text-slate-500">{items.length} item{items.length === 1 ? '' : 's'}</div>
                </div>
              </div>

              <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[420px]">
                {loading ? (
                  <div className="text-xs text-slate-400 italic text-center py-4">Loading…</div>
                ) : items.length === 0 ? (
                  <div className="text-xs text-slate-400 italic text-center py-6 border border-dashed border-slate-200 rounded-xl">
                    No medications yet.
                  </div>
                ) : (
                  items.map((r) => (
                    <div
                      key={r.id}
                      className="border border-slate-200 rounded-xl p-3 bg-slate-50/40 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {col.key === 'discharge' ? (
                            <ActionGlyph action={r.action} />
                          ) : (
                            <Pill className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{r.drugName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {[r.dose, r.frequency].filter(Boolean).join(' · ') || '—'}
                            </div>
                            {col.key === 'discharge' && r.action && (
                              <div className="text-[10px] uppercase tracking-wide text-slate-400 mt-0.5">
                                {r.action}
                              </div>
                            )}
                            {r.reason && (
                              <div className="text-[11px] text-slate-600 mt-1 italic">
                                {r.reason}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors shrink-0"
                          aria-label="Remove medication"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-3 pb-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openAdd(col.key)}
                  className="w-full gap-1 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" /> Add medication
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add medication dialog. Action select is only shown for discharge. */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add medication</DialogTitle>
            <DialogDescription>
              {COLUMNS.find((c) => c.key === addSource)?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Drug name *</Label>
              <Input
                value={addForm.drugName}
                onChange={(e) => setAddForm({ ...addForm, drugName: e.target.value })}
                placeholder="e.g. Metformin"
                className="rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Dose</Label>
                <Input
                  value={addForm.dose}
                  onChange={(e) => setAddForm({ ...addForm, dose: e.target.value })}
                  placeholder="500 mg"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Frequency</Label>
                <Input
                  value={addForm.frequency}
                  onChange={(e) => setAddForm({ ...addForm, frequency: e.target.value })}
                  placeholder="BD / TDS"
                  className="rounded-lg"
                />
              </div>
            </div>
            {addSource === 'discharge' && (
              <div className="space-y-1.5">
                <Label className="text-sm">Action</Label>
                <Select
                  value={addForm.action || '_'}
                  onValueChange={(v) =>
                    setAddForm({ ...addForm, action: v === '_' ? '' : (v as Action) })
                  }
                >
                  <SelectTrigger className="rounded-lg"><SelectValue placeholder="— None —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">— None —</SelectItem>
                    {ACTION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm">Reason / notes</Label>
              <Input
                value={addForm.reason}
                onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
                placeholder="Optional"
                className="rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button
              onClick={submitAdd}
              disabled={saving || !addForm.drugName.trim()}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {saving ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
