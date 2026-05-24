// Reusable NPS response capture. Drop it into any flow that finishes a
// service interaction — IPD discharge, OPD checkout, ER release. Caller
// passes the `source` plus any linking id (encounter / admission /
// patient) and we POST to /api/nps.
//
// The 0-10 segmented control is the focus: bright colour ramp, large
// targets, single-tap selection. Topic stars and the comment box are
// supporting cast.

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import api from '../services/api';
import { useToast } from './Toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  source: 'opd_visit' | 'ipd_discharge' | 'er_visit' | 'general' | string;
  encounterId?: string;
  admissionId?: string;
  patientId?: string;
  onSubmitted?: () => void;
}

const TOPICS = [
  { key: 'doctor', label: 'Doctor' },
  { key: 'nursing', label: 'Nursing' },
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'billing', label: 'Billing' },
  { key: 'food', label: 'Food' },
];

export default function NpsDialog({
  open, onOpenChange, source, encounterId, admissionId, patientId, onSubmitted,
}: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [contact, setContact] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setScore(null); setRatings({}); setComment(''); setContact('');
    }
  }, [open]);

  async function submit(finalScore: number) {
    setSaving(true);
    try {
      await api.post('/api/nps', {
        source,
        score: finalScore,
        comment: comment || undefined,
        ratings: Object.keys(ratings).length > 0 ? ratings : undefined,
        contact: contact || undefined,
        patientId,
        encounterId,
        admissionId,
      });
      if (finalScore >= 0) toast.success('Thank you for your feedback');
      onSubmitted?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Submit failed', e?.response?.data?.error || 'Try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">How was your experience?</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 0-10 SEGMENTED */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-slate-500">How likely are you to recommend us? (0-10)</Label>
              {score !== null && (
                <span className="text-xs text-slate-500">
                  {score >= 9 ? 'Promoter' : score >= 7 ? 'Passive' : 'Detractor'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-11 gap-1.5">
              {Array.from({ length: 11 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setScore(i)}
                  className={`
                    h-12 rounded-xl text-base font-semibold transition-all
                    ${score === i
                      ? scoreSelectedClass(i)
                      : `bg-slate-50 text-slate-600 hover:bg-slate-100 ${scoreHoverClass(i)}`
                    }
                  `}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1 px-1">
              <span>Not at all</span>
              <span>Extremely</span>
            </div>
          </div>

          {/* TOPIC STARS */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-500">Rate specific areas (optional)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TOPICS.map(t => (
                <div key={t.key} className="flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2">
                  <span className="text-sm text-slate-700">{t.label}</span>
                  <StarPicker
                    value={ratings[t.key] || 0}
                    onChange={(v) => setRatings(prev => ({ ...prev, [t.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* COMMENT */}
          <div>
            <Label className="text-xs text-slate-500">Tell us more (optional)</Label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What worked well? What could improve?"
              className="w-full min-h-[80px] p-2 border rounded-lg text-sm"
            />
          </div>

          {/* CONTACT */}
          <div>
            <Label className="text-xs text-slate-500">Phone / email for follow-up (optional)</Label>
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="So we can reach out if needed"
              className="rounded-lg"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => submit(-1)}
            disabled={saving}
            className="text-slate-500"
          >
            Skip survey
          </Button>
          <Button
            onClick={() => score !== null && submit(score)}
            disabled={saving || score === null}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {saving ? 'Submitting…' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function scoreSelectedClass(i: number): string {
  if (i <= 6) return 'bg-red-500 text-white ring-2 ring-red-300 shadow-md';
  if (i <= 8) return 'bg-amber-500 text-white ring-2 ring-amber-300 shadow-md';
  return 'bg-emerald-500 text-white ring-2 ring-emerald-300 shadow-md';
}
function scoreHoverClass(i: number): string {
  if (i <= 6) return 'hover:text-red-600';
  if (i <= 8) return 'hover:text-amber-600';
  return 'hover:text-emerald-600';
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className="p-0.5"
          aria-label={`Rate ${n}`}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              n <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
