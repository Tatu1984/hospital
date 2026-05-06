// Single source of truth for how a doctor's name + qualifications +
// department render across the portal. Use this everywhere a doctor name
// is displayed (appointments list, surgery card, encounter view,
// prescriptions, OPD, dashboard) so the label is identical and qualifications
// always travel with the name.
//
// Two modes:
//   - inline: "Dr. John Smith (MBBS, MD) — Cardiology"  → for table cells
//   - stacked: name on first line, qualifications underneath, department
//     subtitle  → for cards
//
// Data comes from /api/doctors (which returns displayName + displaySubtitle
// already rendered server-side). Caller can either pass the doctor object
// directly, or just an id and we'll look it up via the cached directory.

import { useEffect, useState } from 'react';
import api from '../services/api';

export interface DoctorEntry {
  id: string;
  name: string;
  qualifications?: string | null;
  specialization?: string | null;
  departments?: string[];
  displayName?: string;       // server-rendered "Dr. Name (Quals)"
  displaySubtitle?: string | null;  // server-rendered "Speciality • Dept"
}

// In-process cache. The directory is small (<100 doctors per tenant) and
// changes infrequently, so a single fetch per session is fine. Pages that
// need fresh data can call refreshDoctorDirectory() explicitly after an
// admin edit.
let directory: Map<string, DoctorEntry> | null = null;
let inflight: Promise<Map<string, DoctorEntry>> | null = null;

async function loadDirectory(): Promise<Map<string, DoctorEntry>> {
  if (directory) return directory;
  if (inflight) return inflight;
  inflight = api.get('/api/doctors')
    .then((r) => {
      const m = new Map<string, DoctorEntry>();
      for (const d of (r.data as DoctorEntry[]) || []) m.set(d.id, d);
      directory = m;
      return m;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export function refreshDoctorDirectory() {
  directory = null;
  return loadDirectory();
}

interface ByIdProps { doctorId?: string | null; fallbackName?: string | null; mode?: 'inline' | 'stacked'; className?: string }

// Looks the doctor up in the cached directory and renders. If the id
// isn't in the directory (e.g. inactive user, cross-tenant reference,
// stale data), falls back to the supplied fallbackName.
export function DoctorLabel({ doctorId, fallbackName, mode = 'inline', className }: ByIdProps) {
  const [entry, setEntry] = useState<DoctorEntry | null>(null);
  const [, setReady] = useState(0); // re-render trigger after async load

  useEffect(() => {
    if (!doctorId) return;
    let cancelled = false;
    loadDirectory().then((m) => {
      if (cancelled) return;
      const found = m.get(doctorId) || null;
      setEntry(found);
      setReady((n) => n + 1);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [doctorId]);

  if (!doctorId && !fallbackName) return null;

  if (entry) {
    return <DoctorLabelView entry={entry} mode={mode} className={className} />;
  }
  // Until the directory loads, show the fallback name (or a placeholder).
  return (
    <span className={className}>
      <span className="font-medium">{fallbackName || '—'}</span>
    </span>
  );
}

interface ViewProps { entry: DoctorEntry; mode?: 'inline' | 'stacked'; className?: string }

// Render directly when you already have the doctor object — saves the
// directory fetch. Used in views that already include the doctor in their
// payload.
export function DoctorLabelView({ entry, mode = 'inline', className }: ViewProps) {
  const name = entry.displayName || entry.name;
  const sub = entry.displaySubtitle
    || [entry.specialization, entry.departments?.join(', ')].filter(Boolean).join(' • ')
    || null;

  if (mode === 'stacked') {
    return (
      <div className={className}>
        <div className="font-medium text-slate-900">{name}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    );
  }
  return (
    <span className={className}>
      <span className="font-medium">{name}</span>
      {sub && <span className="text-slate-500"> — {sub}</span>}
    </span>
  );
}
