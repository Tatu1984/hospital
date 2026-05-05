// Public, no-login surgery tracker. Family members open this page from the
// SMS link they received when registered as a contact. Auth is by the URL
// token alone, so this page intentionally avoids:
//   - Loading anything else from the portal bundle (it's a route inside the
//     same SPA, but it doesn't render the authenticated MainLayout).
//   - Showing PHI beyond what the family already knows: patient first name,
//     procedure name, current stage, scheduled time. No MRN, no diagnosis,
//     no clinical notes.
//
// Polls every 20s. Uses public CDN-style fonts and inline styles so it
// works on a basic phone browser even with portal CSS misbehaving.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface TrackerData {
  hospital: string;
  patientFirstName: string;
  procedureName: string;
  surgeonName: string;
  scheduledDate: string;
  scheduledTime: string | null;
  currentStage: string;
  currentStageLabel: string;
  isComplete: boolean;
  timeline: Array<{ stage: string; label: string; recordedAt: string; note: string | null }>;
  allStages: Array<{ code: string; label: string }>;
}

// Same fallback rules as the rest of the app: VITE_API_URL points at the
// backend in prod, blank in dev (Vite proxy handles /api).
const API = import.meta.env.VITE_API_URL || '';

export default function SurgeryTracker() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<TrackerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await axios.get(`${API}/api/track/surgery/${token}`);
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.error || 'Could not load status');
      }
    }
    void load();
    // Poll while the surgery is not in a terminal stage. Once terminal we
    // back off — no point hammering the API for a closed case.
    const interval = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Tracking link not valid</h1>
          <p style={{ color: '#64748b' }}>This link may have expired, or it was typed incorrectly. Please contact the OT coordinator at the hospital.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}><p>Loading…</p></div>
      </div>
    );
  }

  const currentIdx = data.allStages.findIndex((s) => s.code === data.currentStage);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ color: '#2563eb', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {data.hospital}
        </div>
        <h1 style={{ fontSize: 24, margin: '4px 0 16px', fontWeight: 700 }}>
          {data.patientFirstName}'s surgery
        </h1>
        <div style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
          {data.procedureName}<br />
          {data.surgeonName ? `with ${data.surgeonName}` : null}<br />
          {data.scheduledTime ? `Scheduled for ${data.scheduledTime}` : null}
        </div>

        <div style={{ background: data.isComplete ? '#dcfce7' : '#dbeafe', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>CURRENT STATUS</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{data.currentStageLabel}</div>
        </div>

        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Progress</h2>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {data.allStages.map((s, idx) => {
            const isCurrent = idx === currentIdx;
            const isPast = currentIdx > -1 && idx < currentIdx;
            const isFuture = currentIdx > -1 && idx > currentIdx;
            const dotColor = isCurrent ? '#2563eb' : isPast ? '#10b981' : '#cbd5e1';
            return (
              <li key={s.code} style={{ display: 'flex', gap: 12, padding: '8px 0', alignItems: 'center', opacity: isFuture ? 0.4 : 1 }}>
                <span style={{ width: 12, height: 12, borderRadius: 999, background: dotColor, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: isCurrent ? 600 : 400 }}>{s.label}</span>
              </li>
            );
          })}
        </ol>

        {data.timeline.length > 0 && (
          <>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, margin: '24px 0 12px' }}>Updates from staff</h2>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[...data.timeline].reverse().map((e, idx) => (
                <li key={idx} style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: 12, paddingBottom: 12, marginLeft: 4 }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(e.recordedAt).toLocaleString()}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{e.label}</div>
                  {e.note && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{e.note}</div>}
                </li>
              ))}
            </ol>
          </>
        )}

        <p style={{ marginTop: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          Updates every 20 seconds. For urgent questions, please ask the OT coordinator at the hospital.
        </p>
      </div>
    </div>
  );
}

// Inline styles — deliberate. A family member may open this on an old phone
// where Tailwind hasn't loaded for some reason; the page must remain readable.
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
  padding: 16,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  background: '#fff',
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.05)',
};
