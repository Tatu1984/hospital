// Patient portal — home + sub-pages. Each route is rendered by a
// separate component but they all share the PortalShell wrapper for the
// header / greeting / logout.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TestTube, Calendar, Pill, FileText, LogOut, ChevronRight, Download, ArrowLeft,
} from 'lucide-react';
import portalApi, { clearSession, getSession, PatientPortalSession } from '../../services/portalApi';
import { generateLabReportPDF, generateDischargeSummaryPDF } from '../../utils/pdfGenerator';

// ---------- Shared shell ----------

function usePortalSession(): PatientPortalSession | null {
  const nav = useNavigate();
  const [session, setSession] = useState<PatientPortalSession | null>(() => getSession());

  useEffect(() => {
    const s = getSession();
    if (!s) nav('/me/login', { replace: true });
    else setSession(s);
  }, [nav]);

  return session;
}

function PortalShell({
  title, subtitle, back, children,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  children: React.ReactNode;
}) {
  const session = usePortalSession();
  const nav = useNavigate();
  if (!session) return null;

  const firstName = (session.patient.name || '').split(' ')[0] || 'there';

  function logout() {
    try { portalApi.post('/api/public/portal/logout').catch(() => undefined); } catch { /* noop */ }
    clearSession();
    nav('/me/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      <header className="bg-white/70 backdrop-blur border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {back && (
              <button
                onClick={() => nav(back)}
                className="w-9 h-9 rounded-full bg-white ring-1 ring-slate-200 hover:bg-slate-50 flex items-center justify-center shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
            )}
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900 truncate">
                {title === 'Home' ? `Hi ${firstName}` : title}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {subtitle || (session.patient.mrn ? `MRN: ${session.patient.mrn}` : '')}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-full hover:bg-slate-100 inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Log out
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-6">
        {children}
      </main>
    </div>
  );
}

// ---------- Home tile grid ----------

export default function PatientPortalHome() {
  const nav = useNavigate();
  const [labs, setLabs] = useState<any[]>([]);
  const [appts, setAppts] = useState<any[]>([]);
  const [rx, setRx] = useState<any[]>([]);
  const [disch, setDisch] = useState<any[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [l, a, p, d] = await Promise.all([
          portalApi.get('/api/public/portal/labs').catch(() => ({ data: [] })),
          portalApi.get('/api/public/portal/appointments', { params: { upcoming: true } }).catch(() => ({ data: [] })),
          portalApi.get('/api/public/portal/prescriptions').catch(() => ({ data: [] })),
          portalApi.get('/api/public/portal/discharge-summaries').catch(() => ({ data: [] })),
        ]);
        setLabs(l.data || []);
        setAppts(a.data || []);
        setRx(p.data || []);
        setDisch(d.data || []);
      } catch {
        // Silently — sub-pages will show their own loading state.
      }
    })();
  }, []);

  const lastRx = useMemo(() => {
    if (!rx.length) return null;
    const sorted = [...rx].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return sorted[0];
  }, [rx]);

  return (
    <PortalShell title="Home">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Tile
          icon={<TestTube className="w-5 h-5 text-blue-600" />}
          tint="bg-blue-50 ring-blue-100"
          label="My Labs"
          value={`${labs.length} recent`}
          sub="View results & download reports"
          onClick={() => nav('/me/labs')}
        />
        <Tile
          icon={<Calendar className="w-5 h-5 text-emerald-600" />}
          tint="bg-emerald-50 ring-emerald-100"
          label="Appointments"
          value={`${appts.length} upcoming`}
          sub="Your scheduled visits"
          onClick={() => nav('/me/appointments')}
        />
        <Tile
          icon={<Pill className="w-5 h-5 text-violet-600" />}
          tint="bg-violet-50 ring-violet-100"
          label="Prescriptions"
          value={lastRx ? new Date(lastRx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'No Rx'}
          sub="Drugs, dose & schedule"
          onClick={() => nav('/me/prescriptions')}
        />
        <Tile
          icon={<FileText className="w-5 h-5 text-rose-600" />}
          tint="bg-rose-50 ring-rose-100"
          label="Discharge Summaries"
          value={`${disch.length} record${disch.length === 1 ? '' : 's'}`}
          sub="Past hospitalisations"
          onClick={() => nav('/me/discharges')}
        />
      </div>
    </PortalShell>
  );
}

function Tile({ icon, tint, label, value, sub, onClick }: {
  icon: React.ReactNode; tint: string; label: string; value: string; sub: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-3xl ring-1 ring-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex items-start gap-4 group"
    >
      <div className={`w-12 h-12 rounded-2xl ring-1 flex items-center justify-center shrink-0 ${tint}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">{label}</div>
        <div className="text-2xl font-semibold text-slate-900 mt-0.5">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5 truncate">{sub}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 mt-2" />
    </button>
  );
}

// ---------- Labs ----------

export function PatientPortalLabs() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await portalApi.get('/api/public/portal/labs');
        setRows(r.data || []);
      } catch {
        setRows([]);
      } finally { setLoading(false); }
    })();
  }, []);

  function downloadPdf(row: any) {
    const session = getSession();
    if (!session) return;
    try {
      const tests = Array.isArray(row.results)
        ? row.results
        : Array.isArray(row.tests)
          ? row.tests
          : [];
      const pdf = generateLabReportPDF({
        reportNumber: row.id || row.reportNumber || '',
        date: new Date(row.resultedAt || row.createdAt || Date.now()).toLocaleDateString('en-IN'),
        patientName: session.patient.name,
        patientMRN: session.patient.mrn || '',
        tests: tests.map((t: any) => ({
          testName: t.testName || t.name || 'Test',
          result: String(t.result ?? t.value ?? '—'),
          unit: t.unit,
          normalRange: t.normalRange || t.referenceRange,
          flag: t.flag,
        })),
      });
      pdf.doc.save(`Lab-${row.id || 'report'}.pdf`);
    } catch {
      // Best-effort — bad data shouldn't crash the portal.
    }
  }

  return (
    <PortalShell title="My Labs" back="/me/home">
      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyTile icon={<TestTube className="w-6 h-6 text-blue-500" />} label="No lab results yet" />
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={r.id || i} className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center shrink-0">
                <TestTube className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">
                  {r.testName || r.title || 'Lab report'}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(r.resultedAt || r.createdAt || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  {r.status && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] uppercase tracking-wide">{r.status}</span>}
                </div>
              </div>
              <button
                onClick={() => downloadPdf(r)}
                className="text-xs text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-sky-50"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}

// ---------- Appointments ----------

export function PatientPortalAppts() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await portalApi.get('/api/public/portal/appointments', { params: { upcoming: true } });
        setRows(r.data || []);
      } catch { setRows([]); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <PortalShell title="Appointments" back="/me/home">
      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyTile icon={<Calendar className="w-6 h-6 text-emerald-500" />} label="No upcoming appointments" />
      ) : (
        <ul className="space-y-3">
          {rows.map((a, i) => (
            <li key={a.id || i} className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">
                  {a.doctorName ? `Dr. ${a.doctorName}` : a.department || 'Appointment'}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(a.scheduledAt || a.appointmentDate || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  {a.reason && <span className="ml-2">· {a.reason}</span>}
                </div>
              </div>
              <button
                disabled
                className="text-xs text-slate-400 px-3 py-1.5 rounded-full bg-slate-50 cursor-not-allowed"
                title="Cancellation through the portal will be enabled in a future release"
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}

// ---------- Prescriptions ----------

export function PatientPortalRx() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await portalApi.get('/api/public/portal/prescriptions');
        setRows(r.data || []);
      } catch { setRows([]); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <PortalShell title="Prescriptions" back="/me/home">
      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyTile icon={<Pill className="w-6 h-6 text-violet-500" />} label="No prescriptions yet" />
      ) : (
        <ul className="space-y-3">
          {rows.map((rx, i) => {
            const drugs = Array.isArray(rx.drugs) ? rx.drugs : [];
            return (
              <li key={rx.id || i} className="bg-white rounded-2xl ring-1 ring-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center shrink-0">
                    <Pill className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {rx.doctorName ? `Dr. ${rx.doctorName}` : 'Prescription'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(rx.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                {drugs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    {drugs.map((d: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-slate-900">{d.name || d.drugName || 'Drug'}</span>
                          <span className="text-slate-500"> · {d.dose || '—'} · {d.frequency || d.freq || '—'}</span>
                          {d.duration && <span className="text-slate-500"> · {d.duration}</span>}
                          {d.instructions && <div className="text-xs text-slate-500 italic">→ {d.instructions}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {rx.notes && (
                  <div className="mt-3 text-xs text-slate-600 bg-slate-50 rounded-lg p-2 whitespace-pre-line">
                    {rx.notes}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PortalShell>
  );
}

// ---------- Discharge summaries ----------

export function PatientPortalDischarges() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await portalApi.get('/api/public/portal/discharge-summaries');
        setRows(r.data || []);
      } catch { setRows([]); }
      finally { setLoading(false); }
    })();
  }, []);

  async function openSummary(admissionId: string) {
    const session = getSession();
    if (!session) return;
    try {
      const r = await portalApi.get(`/api/public/portal/discharge-summaries/${admissionId}`);
      const d = r.data || {};
      const pdf = generateDischargeSummaryPDF({
        patientName: session.patient.name,
        patientMRN: session.patient.mrn || '',
        admissionDate: d.admissionDate ? new Date(d.admissionDate).toLocaleDateString('en-IN') : '',
        dischargeDate: d.dischargeDate ? new Date(d.dischargeDate).toLocaleDateString('en-IN') : '',
        ward: d.ward,
        bed: d.bed,
        admittingDoctor: d.doctorName || 'Attending Physician',
        diagnosis: d.diagnosis || '—',
        treatmentSummary: d.dischargeSummary || d.treatmentSummary || '—',
        procedures: Array.isArray(d.procedures) ? d.procedures : [],
        medications: Array.isArray(d.medications) ? d.medications.map((m: any) => ({
          name: m.name || m.drugName || 'Drug',
          dosage: m.dose || m.dosage || '—',
          frequency: m.frequency || m.freq || '—',
          duration: m.duration || '—',
        })) : [],
        followUp: d.followUpDate ? new Date(d.followUpDate).toLocaleDateString('en-IN') : undefined,
        instructions: d.instructions,
      });
      pdf.doc.save(`Discharge-${admissionId}.pdf`);
    } catch {
      // ignore — empty data
    }
  }

  return (
    <PortalShell title="Discharge Summaries" back="/me/home">
      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyTile icon={<FileText className="w-6 h-6 text-rose-500" />} label="No discharge summaries on file" />
      ) : (
        <ul className="space-y-3">
          {rows.map((adm: any, i: number) => (
            <li key={adm.id || i} className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 ring-1 ring-rose-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">
                  {adm.diagnosis || 'Hospital admission'}
                </div>
                <div className="text-xs text-slate-500">
                  {adm.admissionDate && new Date(adm.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {adm.dischargeDate && ` → ${new Date(adm.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                </div>
              </div>
              <button
                onClick={() => openSummary(adm.id)}
                className="text-xs text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-sky-50"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}

function EmptyTile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="bg-white rounded-3xl ring-1 ring-slate-200 p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 ring-1 ring-slate-100 flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  );
}
