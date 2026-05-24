// DischargeSummaryDialog — editor for the per-admission discharge summary.
//
// Backed by /api/admissions/:id/discharge-summary (GET to pre-populate,
// PUT to upsert). Lets the operator either save in place or save and
// open a printable PDF preview via <PdfPreviewDialog/>.
//
// Discharge medications are stored as a small JSON array on the row —
// we render them as an inline editor (Add row / × remove) so the user
// doesn't have to wrestle with a separate dialog for a single med list.

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
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Printer, Save } from 'lucide-react';
import api from '../services/api';
import { useToast } from './Toast';
import { generateDischargeSummaryPDF } from '../utils/pdfGenerator';
import PdfPreviewDialog, { PdfDoc } from './PdfPreviewDialog';

interface MedRow {
  drug: string;
  dose: string;
  frequency: string;
  duration: string;
}

interface FormState {
  finalDiagnosis: string;
  proceduresDone: string;
  treatmentSummary: string;
  conditionAtDischarge: string;
  dischargeMedications: MedRow[];
  followUpDate: string;
  followUpNotes: string;
  instructions: string;
}

interface Props {
  admissionId: string;
  patientName: string;
  patientMRN: string;
  admissionDate: string;
  admittingDoctor: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const emptyForm = (): FormState => ({
  finalDiagnosis: '',
  proceduresDone: '',
  treatmentSummary: '',
  conditionAtDischarge: '',
  dischargeMedications: [],
  followUpDate: '',
  followUpNotes: '',
  instructions: '',
});

export default function DischargeSummaryDialog({
  admissionId,
  patientName,
  patientMRN,
  admissionDate,
  admittingDoctor,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdf, setPdf] = useState<PdfDoc | null>(null);

  // Fetch the existing summary whenever the dialog opens for a new
  // admission. If the backend returns null we keep the empty form.
  useEffect(() => {
    if (!open || !admissionId) return;
    let alive = true;
    setLoading(true);
    setForm(emptyForm());
    (async () => {
      try {
        const r = await api.get(`/api/admissions/${admissionId}/discharge-summary`);
        if (!alive) return;
        const d = r.data;
        if (d) {
          // Backend stores follow-up as a Date — slice to yyyy-mm-dd for the
          // <input type="date"> control. dischargeMedications is a Json array.
          const meds = Array.isArray(d.dischargeMedications) ? d.dischargeMedications : [];
          setForm({
            finalDiagnosis: d.finalDiagnosis || '',
            proceduresDone: d.proceduresDone || '',
            treatmentSummary: d.treatmentSummary || '',
            conditionAtDischarge: d.conditionAtDischarge || '',
            dischargeMedications: meds.map((m: any) => ({
              drug: m.drug || '',
              dose: m.dose || '',
              frequency: m.frequency || '',
              duration: m.duration || '',
            })),
            followUpDate: d.followUpDate ? String(d.followUpDate).slice(0, 10) : '',
            followUpNotes: d.followUpNotes || '',
            instructions: d.instructions || '',
          });
        }
      } catch (e: any) {
        // 404 isn't necessarily an error — admission may simply not have a
        // summary yet. Only toast on real failures.
        if (e?.response?.status && e.response.status !== 404) {
          toast.error('Could not load discharge summary', e?.response?.data?.error || 'Try again.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, admissionId]);

  const addMedRow = () => {
    setForm((f) => ({
      ...f,
      dischargeMedications: [...f.dischargeMedications, { drug: '', dose: '', frequency: '', duration: '' }],
    }));
  };

  const removeMedRow = (idx: number) => {
    setForm((f) => ({
      ...f,
      dischargeMedications: f.dischargeMedications.filter((_, i) => i !== idx),
    }));
  };

  const updateMedRow = (idx: number, patch: Partial<MedRow>) => {
    setForm((f) => ({
      ...f,
      dischargeMedications: f.dischargeMedications.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    }));
  };

  // PUT to the backend. Returns true on success so the caller can decide
  // whether to also build the PDF / close the dialog.
  const persist = async (): Promise<boolean> => {
    if (!form.finalDiagnosis.trim()) {
      toast.warning('Final diagnosis is required');
      return false;
    }
    setSaving(true);
    try {
      // Drop fully-empty med rows so we don't persist garbage.
      const meds = form.dischargeMedications.filter(
        (m) => m.drug.trim() || m.dose.trim() || m.frequency.trim() || m.duration.trim(),
      );
      await api.put(`/api/admissions/${admissionId}/discharge-summary`, {
        finalDiagnosis: form.finalDiagnosis.trim(),
        proceduresDone: form.proceduresDone.trim() || null,
        treatmentSummary: form.treatmentSummary.trim() || null,
        conditionAtDischarge: form.conditionAtDischarge.trim() || null,
        dischargeMedications: meds,
        followUpDate: form.followUpDate || null,
        followUpNotes: form.followUpNotes.trim() || null,
        instructions: form.instructions.trim() || null,
      });
      toast.success('Discharge summary saved');
      onSaved?.();
      return true;
    } catch (e: any) {
      toast.error('Save failed', e?.response?.data?.error || 'Try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const ok = await persist();
    if (ok) onOpenChange(false);
  };

  const handleSaveAndPrint = async () => {
    const ok = await persist();
    if (!ok) return;
    // Build the PDF from the form (admission date / doctor / patient
    // identity come from props — they're already on screen so the
    // operator doesn't have to re-enter them).
    const meds = form.dischargeMedications
      .filter((m) => m.drug.trim())
      .map((m) => ({
        name: m.drug,
        dosage: m.dose,
        frequency: m.frequency,
        duration: m.duration,
      }));
    const procedures = form.proceduresDone
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const followUp = [
      form.followUpDate ? `Date: ${form.followUpDate}` : '',
      form.followUpNotes,
    ]
      .filter(Boolean)
      .join(' — ');
    const out = generateDischargeSummaryPDF({
      patientName,
      patientMRN,
      admissionDate,
      dischargeDate: new Date().toLocaleDateString(),
      admittingDoctor,
      diagnosis: form.finalDiagnosis,
      treatmentSummary: form.treatmentSummary || form.conditionAtDischarge || '—',
      procedures: procedures.length ? procedures : undefined,
      medications: meds.length ? meds : undefined,
      followUp: followUp || undefined,
      instructions: form.instructions || undefined,
    });
    setPdf(out);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Discharge Summary</DialogTitle>
            <DialogDescription>
              {patientName} ({patientMRN}) · Admitted {admissionDate} · {admittingDoctor}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading…</div>
          ) : (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label htmlFor="finalDiagnosis" className="text-sm">
                  Final diagnosis <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="finalDiagnosis"
                  value={form.finalDiagnosis}
                  onChange={(e) => setForm({ ...form, finalDiagnosis: e.target.value })}
                  placeholder="Primary and secondary diagnoses at discharge"
                  className="min-h-[80px] rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proceduresDone" className="text-sm">Procedures done</Label>
                <Textarea
                  id="proceduresDone"
                  value={form.proceduresDone}
                  onChange={(e) => setForm({ ...form, proceduresDone: e.target.value })}
                  placeholder="One procedure per line"
                  className="min-h-[70px] rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatmentSummary" className="text-sm">Treatment summary</Label>
                <Textarea
                  id="treatmentSummary"
                  value={form.treatmentSummary}
                  onChange={(e) => setForm({ ...form, treatmentSummary: e.target.value })}
                  placeholder="Hospital course, response to treatment, complications"
                  className="min-h-[90px] rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conditionAtDischarge" className="text-sm">Condition at discharge</Label>
                <Input
                  id="conditionAtDischarge"
                  value={form.conditionAtDischarge}
                  onChange={(e) => setForm({ ...form, conditionAtDischarge: e.target.value })}
                  placeholder="e.g. Stable, improving, vitals within normal limits"
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Discharge medications</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addMedRow}
                    className="h-8 rounded-lg gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add row
                  </Button>
                </div>
                {form.dischargeMedications.length === 0 ? (
                  <div className="text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-lg px-3 py-3 text-center">
                    No medications listed. Click "Add row" to add one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.dischargeMedications.map((m, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-2 items-center border border-slate-200 rounded-lg p-2 bg-slate-50/50"
                      >
                        <Input
                          value={m.drug}
                          onChange={(e) => updateMedRow(i, { drug: e.target.value })}
                          placeholder="Drug"
                          className="col-span-4 h-9 rounded-md"
                        />
                        <Input
                          value={m.dose}
                          onChange={(e) => updateMedRow(i, { dose: e.target.value })}
                          placeholder="Dose"
                          className="col-span-2 h-9 rounded-md"
                        />
                        <Input
                          value={m.frequency}
                          onChange={(e) => updateMedRow(i, { frequency: e.target.value })}
                          placeholder="Frequency"
                          className="col-span-3 h-9 rounded-md"
                        />
                        <Input
                          value={m.duration}
                          onChange={(e) => updateMedRow(i, { duration: e.target.value })}
                          placeholder="Duration"
                          className="col-span-2 h-9 rounded-md"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeMedRow(i)}
                          className="col-span-1 h-9 px-0 text-slate-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="followUpDate" className="text-sm">Follow-up date</Label>
                  <Input
                    id="followUpDate"
                    type="date"
                    value={form.followUpDate}
                    onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followUpNotes" className="text-sm">Follow-up notes</Label>
                  <Input
                    id="followUpNotes"
                    value={form.followUpNotes}
                    onChange={(e) => setForm({ ...form, followUpNotes: e.target.value })}
                    placeholder="e.g. OPD review, bring reports"
                    className="rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions" className="text-sm">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  placeholder="Diet, activity, wound care, red-flag symptoms…"
                  className="min-h-[110px] rounded-lg"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving || loading}
              className="gap-1"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              onClick={handleSaveAndPrint}
              disabled={saving || loading}
              className="bg-slate-900 hover:bg-slate-800 gap-1"
            >
              <Printer className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save & Print PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PdfPreviewDialog pdf={pdf} onClose={() => setPdf(null)} title="Discharge Summary" />
    </>
  );
}
