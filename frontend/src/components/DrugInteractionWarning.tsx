// Reusable drug-interaction warning banner. Drop this into any
// prescription / med-reconciliation / order-set UI by passing the array
// of selected drug IDs. It calls /api/drug-interactions/check whenever
// the set changes and renders a tier-coded banner if any interactions
// are found:
//   contraindicated → red banner, "Block prescription"
//   major           → red banner, "Requires acknowledgement"
//   moderate        → amber banner
//   minor           → slate info pill
//
// Renders nothing if the set has <2 drugs or no interactions returned.

import { useEffect, useMemo, useState } from 'react';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import api from '../services/api';

export interface DrugInteractionHit {
  id: string;
  drugAId: string;
  drugBId: string;
  drugAName: string;
  drugBName: string;
  severity: 'contraindicated' | 'major' | 'moderate' | 'minor';
  description: string;
  advice?: string | null;
  source?: string | null;
}

interface Props {
  drugIds: string[];
  // Optional callback so the parent prescription form can disable its
  // "Save" button when any contraindicated interaction is detected.
  onSeverityChange?: (worst: DrugInteractionHit['severity'] | null) => void;
  // If true, the parent will gate the save and we don't need to show
  // the "Block prescription" warning ourselves.
  compact?: boolean;
}

const SEVERITY_RANK: Record<DrugInteractionHit['severity'], number> = {
  contraindicated: 4, major: 3, moderate: 2, minor: 1,
};

export default function DrugInteractionWarning({ drugIds, onSeverityChange, compact }: Props) {
  const [hits, setHits] = useState<DrugInteractionHit[]>([]);
  const [loading, setLoading] = useState(false);

  // Stable signature for the effect dependency — we don't want to refire
  // when the array identity changes but contents are the same.
  const signature = useMemo(() => {
    return [...new Set(drugIds)].sort().join('|');
  }, [drugIds]);

  useEffect(() => {
    const unique = [...new Set(drugIds)].filter(Boolean);
    if (unique.length < 2) {
      setHits([]);
      onSeverityChange?.(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.post<{ interactions: DrugInteractionHit[] }>('/api/drug-interactions/check', { drugIds: unique })
      .then(r => {
        if (cancelled) return;
        const found = r.data?.interactions || [];
        setHits(found);
        const worst = found
          .map(h => h.severity)
          .sort((a, b) => SEVERITY_RANK[b] - SEVERITY_RANK[a])[0] || null;
        onSeverityChange?.(worst);
      })
      .catch(() => {
        if (!cancelled) { setHits([]); onSeverityChange?.(null); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (loading || hits.length === 0) return null;

  // Sort worst → least so the most dangerous shows first.
  const sorted = [...hits].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  const worst = sorted[0].severity;

  const palette = (() => {
    if (worst === 'contraindicated' || worst === 'major') {
      return {
        wrapper: 'bg-red-50 border-red-200',
        icon: <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />,
        title: 'text-red-800',
        body: 'text-red-700',
      };
    }
    if (worst === 'moderate') {
      return {
        wrapper: 'bg-amber-50 border-amber-200',
        icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
        title: 'text-amber-800',
        body: 'text-amber-700',
      };
    }
    return {
      wrapper: 'bg-slate-50 border-slate-200',
      icon: <Info className="w-4 h-4 text-slate-600 shrink-0" />,
      title: 'text-slate-800',
      body: 'text-slate-600',
    };
  })();

  return (
    <div className={`border rounded-xl p-3 ${palette.wrapper} space-y-2`}>
      <div className={`flex items-center gap-2 text-[13px] font-semibold ${palette.title}`}>
        {palette.icon}
        {worst === 'contraindicated'
          ? `${sorted.length} contraindicated interaction${sorted.length === 1 ? '' : 's'} — DO NOT prescribe`
          : worst === 'major'
            ? `${sorted.length} major interaction${sorted.length === 1 ? '' : 's'} — review carefully`
            : worst === 'moderate'
              ? `${sorted.length} moderate interaction${sorted.length === 1 ? '' : 's'}`
              : `${sorted.length} minor interaction${sorted.length === 1 ? '' : 's'}`}
      </div>
      {!compact && (
        <ul className="space-y-1.5 text-[12px]">
          {sorted.map((h) => (
            <li key={h.id} className={`${palette.body} leading-snug`}>
              <span className="font-medium">{h.drugAName} + {h.drugBName}</span>{' '}
              <span className={`text-[10px] uppercase tracking-wider ml-1 px-1.5 py-0.5 rounded-full ${
                h.severity === 'contraindicated' || h.severity === 'major'
                  ? 'bg-red-100 text-red-800'
                  : h.severity === 'moderate'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
              }`}>{h.severity}</span>
              <div className="mt-0.5">{h.description}</div>
              {h.advice && <div className="mt-0.5 italic opacity-80">→ {h.advice}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
