// Reusable MRN chip that links to /app/patients/:id. The single source
// of truth for "show me the MRN and let me click into the chart" — drop
// this anywhere a patient row appears.
//
// Behaviour
//   - With both mrn and patientId → renders a clickable chip
//   - With only mrn (no id)        → plain non-clickable chip
//   - With neither                 → renders an em-dash placeholder so
//                                    table layout doesn't shift
//
// stopPropagation is on by default because most card-style rows
// already navigate somewhere on row-click; we want the MRN click to
// open the patient profile WITHOUT also firing whatever the row was
// going to do. Pass `stopPropagation={false}` only when you know the
// surrounding row has no onClick.

import { Link } from 'react-router-dom';

interface Props {
  mrn?: string | null;
  patientId?: string | null;
  className?: string;
  stopPropagation?: boolean;
  size?: 'sm' | 'md';
}

export default function MrnLink({
  mrn,
  patientId,
  className = '',
  stopPropagation = true,
  size = 'sm',
}: Props) {
  if (!mrn) return <span className="text-slate-400">—</span>;

  const sizeClass = size === 'md'
    ? 'text-xs px-2 py-0.5'
    : 'text-[11px] px-1.5 py-0.5';

  if (!patientId) {
    return (
      <span className={`font-mono ${sizeClass} bg-slate-100 text-slate-700 rounded ${className}`}>
        {mrn}
      </span>
    );
  }

  return (
    <Link
      to={`/app/patients/${patientId}`}
      onClick={(e) => { if (stopPropagation) e.stopPropagation(); }}
      title={`Open patient profile · ${mrn}`}
      className={
        `font-mono ${sizeClass} rounded inline-block transition-colors ` +
        `bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white ` +
        className
      }
    >
      {mrn}
    </Link>
  );
}
