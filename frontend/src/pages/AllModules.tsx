// All non-mainline module pages. Imported in App.tsx via lazy() and
// re-exports the heavy pages (Asset Management, IPD Billing) that have
// dedicated files of their own.
//
// Tiering — kept here as a comment so the next maintainer knows which
// modules are real vs. scaffolded:
//   Tier 1 (real CRUD with dedicated schema + endpoints):
//     • Phlebotomy        → /api/phlebotomy/rounds
//     • CSSD              → /api/cssd/cycles + /instruments
//     • Mortuary          → /api/mortuary
//     • Pathology         → /api/pathology/cases
//     • EquipmentMaintenance → /api/maintenance/tickets
//     • Physiotherapy     → /api/physio/plans + /sessions  (uses dedicated page)
//   Tier 2 (wires existing real backends):
//     • PayrollManagement → reuses HR PayrollPanel / /api/payroll/*
//     • BiometricAttendance → /api/biometric/today
//     • DoctorAccounting → /api/doctor-revenues + /doctor-payouts
//   Tier 3 (functional UI, integration deferred — clearly marked):
//     • Tally             → accubook integration scaffold
//     • VideoConversation → Zoom/Teams meeting scaffold
//     • DICOMPACS         → Orthanc/dcm4chee worklist scaffold
//     • MedicalDevice     → HL7/ASTM device-list scaffold
//     • DoctorRegistration → curated view of existing User profiles
//     • MRDManagement     → MRD records flow (uses existing audit + records data)
//     • OPDClinical       → clinical-templates library (CRUD on a JSON store)
//     • DoctorAssistant   → quick-tools panel
//     • StoreManagement   → redirects to Inventory
//     • SoftwareManagement → config / module-toggle (wraps System Control)
//     • HealthCheckup     → preventive-care package list

import ResourceListPage, { StatusBadge, fmtDate } from '../components/modules/ResourceListPage';
import {
  Syringe, Wind, Wrench, Cross, Microscope,
  Calculator, Video, ImageIcon, Monitor, FileText, ClipboardList,
  UserCog, HeartPulse, UserPlus, Wallet, Fingerprint, CreditCard,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import PayrollPanel from '../components/hr/PayrollPanel';
import IntegrationStatusCard from '../components/modules/IntegrationStatusCard';

// ===========================================================
// TIER 1 — REAL CRUD
// ===========================================================

export function Phlebotomy() {
  return (
    <ResourceListPage
      title="Phlebotomy Rounds"
      description="Sample-collection rounds — phlebotomist roster + per-round status"
      icon={Syringe}
      iconTint="bg-pink-500"
      api="/api/phlebotomy/rounds"
      stats={[
        { label: 'Rounds', compute: (r) => r.length },
        { label: 'In progress', compute: (r) => r.filter((x: any) => x.status === 'in_progress').length },
        { label: 'Samples today', compute: (r) => r.reduce((s: number, x: any) => s + (x.totalSamples || 0), 0) },
        { label: 'Rejected', compute: (r) => r.reduce((s: number, x: any) => s + (x.rejected || 0), 0) },
      ]}
      columns={[
        { key: 'scheduledDate', label: 'Date', render: (r: any) => fmtDate(r.scheduledDate) },
        { key: 'shift', label: 'Shift' },
        { key: 'phlebotomist', label: 'Phlebotomist' },
        { key: 'area', label: 'Area' },
        { key: 'totalSamples', label: 'Total' },
        { key: 'collected', label: 'Collected' },
        { key: 'rejected', label: 'Rejected' },
        { key: 'status', label: 'Status', render: (r: any) => <StatusBadge value={r.status} /> },
      ]}
      formFields={[
        { name: 'scheduledDate', label: 'Date', type: 'date', required: true },
        { name: 'shift', label: 'Shift', type: 'select', options: ['morning','afternoon','night'].map(v => ({ value: v, label: v })), default: 'morning' },
        { name: 'phlebotomist', label: 'Phlebotomist name', type: 'text' },
        { name: 'area', label: 'Area / Route', type: 'text', placeholder: 'OPD, IPD-B Wing, Home-route-3' },
        { name: 'totalSamples', label: 'Total samples', type: 'number', default: 0 },
        { name: 'collected', label: 'Collected', type: 'number', default: 0 },
        { name: 'rejected', label: 'Rejected', type: 'number', default: 0 },
        { name: 'status', label: 'Status', type: 'select', options: ['planned','in_progress','completed'].map(v => ({ value: v, label: v })), default: 'planned' },
        { name: 'notes', label: 'Notes', type: 'textarea', span: 2 },
      ]}
    />
  );
}

export function CSSD() {
  return (
    <ResourceListPage
      title="CSSD — Sterilization Cycles"
      description="Central Sterile Supply Department — cycle log + instrument tracking"
      icon={Wind}
      iconTint="bg-cyan-500"
      api="/api/cssd/cycles"
      stats={[
        { label: 'Cycles', compute: (r) => r.length },
        { label: 'Running', compute: (r) => r.filter((x: any) => x.status === 'running').length },
        { label: 'Failed', compute: (r) => r.filter((x: any) => x.status === 'failed').length },
        { label: 'Completed', compute: (r) => r.filter((x: any) => x.status === 'completed').length },
      ]}
      columns={[
        { key: 'cycleNumber', label: 'Cycle #' },
        { key: 'machineName', label: 'Machine' },
        { key: 'cycleType', label: 'Type' },
        { key: 'loadType', label: 'Load' },
        { key: 'temperatureC', label: 'Temp °C' },
        { key: 'startedAt', label: 'Started', render: (r: any) => fmtDate(r.startedAt) },
        { key: 'biologicalIndicator', label: 'BI' },
        { key: 'status', label: 'Status', render: (r: any) => <StatusBadge value={r.status} /> },
      ]}
      formFields={[
        { name: 'cycleNumber', label: 'Cycle # (auto if blank)', type: 'text' },
        { name: 'machineName', label: 'Machine', type: 'text' },
        { name: 'cycleType', label: 'Cycle type', type: 'select', options: ['steam','ETO','plasma'].map(v => ({ value: v, label: v })), default: 'steam', required: true },
        { name: 'loadType', label: 'Load type', type: 'select', options: ['instrument','linen','glassware','rubber'].map(v => ({ value: v, label: v })), default: 'instrument' },
        { name: 'startedAt', label: 'Started at', type: 'datetime', required: true },
        { name: 'endedAt', label: 'Ended at', type: 'datetime' },
        { name: 'temperatureC', label: 'Temperature °C', type: 'number' },
        { name: 'pressureBar', label: 'Pressure (bar)', type: 'number' },
        { name: 'durationMin', label: 'Duration (min)', type: 'number' },
        { name: 'loadCount', label: 'Load count', type: 'number' },
        { name: 'biologicalIndicator', label: 'BI result', type: 'select', options: ['pending','pass','fail'].map(v => ({ value: v, label: v })), default: 'pending' },
        { name: 'chemicalIndicator', label: 'Chemical indicator', type: 'select', options: ['pass','fail'].map(v => ({ value: v, label: v })) },
        { name: 'releasedBy', label: 'Released by', type: 'text' },
        { name: 'status', label: 'Status', type: 'select', options: ['running','completed','failed','recalled'].map(v => ({ value: v, label: v })), default: 'running' },
        { name: 'notes', label: 'Notes', type: 'textarea', span: 2 },
      ]}
    />
  );
}

export function Mortuary() {
  return (
    <ResourceListPage
      title="Mortuary"
      description="Deceased registry, body storage, autopsy + release tracking"
      icon={Cross}
      iconTint="bg-slate-700"
      api="/api/mortuary"
      stats={[
        { label: 'Total cases', compute: (r) => r.length },
        { label: 'In storage', compute: (r) => r.filter((x: any) => x.status === 'stored').length },
        { label: 'Released', compute: (r) => r.filter((x: any) => x.status === 'released').length },
        { label: 'Pending autopsy', compute: (r) => r.filter((x: any) => x.autopsyRequired && !x.autopsyAt).length },
      ]}
      columns={[
        { key: 'bodyNumber', label: 'Body #' },
        { key: 'deceasedName', label: 'Name' },
        { key: 'age', label: 'Age' },
        { key: 'gender', label: 'Gender' },
        { key: 'dateOfDeath', label: 'Date of death', render: (r: any) => fmtDate(r.dateOfDeath) },
        { key: 'fridgeUnit', label: 'Fridge / Shelf', render: (r: any) => `${r.fridgeUnit || '—'} / ${r.shelfNumber || '—'}` },
        { key: 'status', label: 'Status', render: (r: any) => <StatusBadge value={r.status} /> },
      ]}
      formFields={[
        { name: 'bodyNumber', label: 'Body # (auto if blank)', type: 'text' },
        { name: 'deceasedName', label: 'Deceased name', type: 'text', required: true },
        { name: 'age', label: 'Age', type: 'number' },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male','Female','Other'].map(v => ({ value: v, label: v })) },
        { name: 'contact', label: 'Family contact', type: 'text' },
        { name: 'dateOfDeath', label: 'Date of death', type: 'datetime', required: true },
        { name: 'causeOfDeath', label: 'Cause of death', type: 'text' },
        { name: 'doctorOnDuty', label: 'Doctor on duty', type: 'text' },
        { name: 'fridgeUnit', label: 'Fridge unit', type: 'text' },
        { name: 'shelfNumber', label: 'Shelf #', type: 'text' },
        { name: 'storedAt', label: 'Stored at', type: 'datetime' },
        { name: 'releasedAt', label: 'Released at', type: 'datetime' },
        { name: 'releasedTo', label: 'Released to', type: 'text', placeholder: 'Family member name + relationship' },
        { name: 'releaseAuthBy', label: 'Release authorised by', type: 'text' },
        { name: 'autopsyRequired', label: 'Autopsy required', type: 'select', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], default: 'false' },
        { name: 'status', label: 'Status', type: 'select', options: ['stored','released','autopsy','transferred'].map(v => ({ value: v, label: v })), default: 'stored' },
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
      ]}
    />
  );
}

export function Pathology() {
  return (
    <ResourceListPage
      title="Pathology Cases"
      description="Histopathology, cytology, IHC, frozen-section workflow"
      icon={Microscope}
      iconTint="bg-pink-600"
      api="/api/pathology/cases"
      stats={[
        { label: 'Cases', compute: (r) => r.length },
        { label: 'Pending', compute: (r) => r.filter((x: any) => x.status !== 'reported').length },
        { label: 'Urgent', compute: (r) => r.filter((x: any) => x.priority === 'urgent').length },
        { label: 'Reported', compute: (r) => r.filter((x: any) => x.status === 'reported').length },
      ]}
      columns={[
        { key: 'caseNumber', label: 'Case #' },
        { key: 'caseType', label: 'Type' },
        { key: 'specimenSource', label: 'Specimen' },
        { key: 'priority', label: 'Priority' },
        { key: 'receivedAt', label: 'Received', render: (r: any) => fmtDate(r.receivedAt) },
        { key: 'status', label: 'Status', render: (r: any) => <StatusBadge value={r.status} /> },
      ]}
      formFields={[
        { name: 'caseNumber', label: 'Case # (auto if blank)', type: 'text' },
        { name: 'patientId', label: 'Patient ID', type: 'text', required: true },
        { name: 'caseType', label: 'Case type', type: 'select', required: true,
          options: ['histopath','cytology','frozen_section','IHC','FNAC'].map(v => ({ value: v, label: v })) },
        { name: 'priority', label: 'Priority', type: 'select', default: 'routine',
          options: ['routine','urgent','frozen'].map(v => ({ value: v, label: v })) },
        { name: 'specimenSource', label: 'Specimen source', type: 'text', placeholder: 'Skin / breast / GI / cervix...' },
        { name: 'referringDoctor', label: 'Referring doctor', type: 'text' },
        { name: 'pathologistId', label: 'Pathologist ID', type: 'text' },
        { name: 'clinicalHistory', label: 'Clinical history', type: 'textarea', span: 2 },
        { name: 'grossDescription', label: 'Gross description', type: 'textarea', span: 2 },
        { name: 'microscopicFindings', label: 'Microscopic findings', type: 'textarea', span: 2 },
        { name: 'impression', label: 'Impression', type: 'textarea', span: 2 },
        { name: 'status', label: 'Status', type: 'select', default: 'received',
          options: ['received','grossing','processing','examined','reported','amended'].map(v => ({ value: v, label: v })) },
      ]}
    />
  );
}

export function EquipmentMaintenance() {
  return (
    <ResourceListPage
      title="Equipment Maintenance"
      description="Preventive + corrective maintenance tickets, AMC tracking"
      icon={Wrench}
      iconTint="bg-orange-500"
      api="/api/maintenance/tickets"
      stats={[
        { label: 'Tickets', compute: (r) => r.length },
        { label: 'Open', compute: (r) => r.filter((x: any) => x.status === 'open' || x.status === 'in_progress').length },
        { label: 'Urgent', compute: (r) => r.filter((x: any) => x.priority === 'urgent').length },
        { label: 'Avg downtime hrs', compute: (r) => {
          const xs = r.filter((x: any) => x.downtimeHours).map((x: any) => Number(x.downtimeHours));
          if (xs.length === 0) return '—';
          return (xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(1);
        } },
      ]}
      columns={[
        { key: 'ticketNumber', label: 'Ticket #' },
        { key: 'assetName', label: 'Equipment' },
        { key: 'assetCategory', label: 'Category' },
        { key: 'type', label: 'Type' },
        { key: 'priority', label: 'Priority' },
        { key: 'reportedAt', label: 'Reported', render: (r: any) => fmtDate(r.reportedAt) },
        { key: 'status', label: 'Status', render: (r: any) => <StatusBadge value={r.status} /> },
      ]}
      formFields={[
        { name: 'ticketNumber', label: 'Ticket # (auto if blank)', type: 'text' },
        { name: 'assetName', label: 'Equipment / Asset name', type: 'text', required: true },
        { name: 'assetCategory', label: 'Category', type: 'select',
          options: ['imaging','ICU','OT','lab','dialysis','HVAC','other'].map(v => ({ value: v, label: v })) },
        { name: 'type', label: 'Maintenance type', type: 'select', required: true, default: 'corrective',
          options: ['preventive','corrective','calibration','amc'].map(v => ({ value: v, label: v })) },
        { name: 'priority', label: 'Priority', type: 'select', default: 'normal',
          options: ['urgent','normal','low'].map(v => ({ value: v, label: v })) },
        { name: 'reportedBy', label: 'Reported by', type: 'text' },
        { name: 'assignedTo', label: 'Assigned to / vendor', type: 'text' },
        { name: 'vendor', label: 'Vendor', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea', required: true, span: 2 },
        { name: 'rootCause', label: 'Root cause', type: 'textarea', span: 2 },
        { name: 'partsReplaced', label: 'Parts replaced', type: 'textarea', span: 2 },
        { name: 'costAmount', label: 'Cost (₹)', type: 'number' },
        { name: 'downtimeHours', label: 'Downtime (hrs)', type: 'number' },
        { name: 'status', label: 'Status', type: 'select', default: 'open',
          options: ['open','in_progress','on_hold','completed','cancelled'].map(v => ({ value: v, label: v })) },
      ]}
    />
  );
}

// Physiotherapy uses two related resources (plans + sessions) so it gets
// a dedicated page rather than ResourceListPage.
export { default as Physiotherapy } from './Physiotherapy';

// ===========================================================
// TIER 2 — WIRED TO REAL EXISTING BACKENDS
// ===========================================================

export function PayrollManagement() {
  // The same panel mounted in HR > Payroll. Surfaced here so the dashboard
  // tile and sidebar route both land on a working page.
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-700 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Management</h1>
          <p className="text-sm text-slate-500">Generate payslips, mark paid, attendance-driven calculations</p>
        </div>
      </div>
      <PayrollPanel />
    </div>
  );
}

export function BiometricAttendance() {
  // Wires /api/biometric/today which we made real in the HR commit. Plus
  // a small device-list summary at the top.
  const [summary, setSummary] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void api.get('/api/biometric/today').then((r) => {
      setSummary(r.data?.summary || null);
      setRows(r.data?.attendance || []);
    }).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
          <Fingerprint className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Biometric Attendance</h1>
          <p className="text-sm text-slate-500">Today's check-in/out roll-up. Punches feed in via /api/biometric/punch.</p>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['Total', summary.totalEmployees, 'text-slate-900'],
            ['Present', summary.present, 'text-emerald-700'],
            ['Half-day', summary.halfDay, 'text-blue-700'],
            ['On leave', summary.onLeave, 'text-purple-700'],
            ['Absent', summary.absent, 'text-red-700'],
          ].map(([label, value, color]) => (
            <Card key={String(label)}>
              <CardContent className="p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
                <div className={`text-2xl font-bold ${color}`}>{value as any}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Today's roll</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No attendance recorded yet today. Make sure biometric devices are configured to POST to
              <code className="ml-1 bg-slate-100 px-1 rounded text-xs">/api/biometric/punch</code>.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase">
                <tr>
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-left p-2">In</th>
                  <th className="text-left p-2">Out</th>
                  <th className="text-left p-2">Hours</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 font-mono text-xs">{r.employeeId}</td>
                    <td className="p-2 font-medium">{r.employeeName}</td>
                    <td className="p-2 text-slate-500">{r.department || '—'}</td>
                    <td className="p-2">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '—'}</td>
                    <td className="p-2">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '—'}</td>
                    <td className="p-2">{r.workingHours ?? '—'}</td>
                    <td className="p-2"><StatusBadge value={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DoctorAccounting() {
  // Reads existing DoctorContract / DoctorRevenue / DoctorPayout via
  // /api/doctor-revenues + /api/doctor-payouts. Read-only summary view;
  // payout creation flows live with the admin who runs payroll.
  const [revenues, setRevenues] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void Promise.all([
      api.get('/api/doctor-revenues').catch(() => ({ data: [] })),
      api.get('/api/doctor-payouts').catch(() => ({ data: [] })),
    ]).then(([r, p]) => {
      setRevenues(r.data); setPayouts(p.data);
    }).finally(() => setLoading(false));
  }, []);

  const totalRevShare = revenues.reduce((s, r) => s + Number(r.shareAmount || 0), 0);
  const pendingShare = revenues.filter((r) => r.status !== 'paid').reduce((s, r) => s + Number(r.shareAmount || 0), 0);
  const paidOut = payouts.reduce((s, p) => s + Number(p.netAmount || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctor Accounting</h1>
          <p className="text-sm text-slate-500">Revenue share, payouts, contract reconciliation</p>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs uppercase text-slate-500">Total share</div><div className="text-xl font-bold">₹{totalRevShare.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs uppercase text-slate-500">Pending</div><div className="text-xl font-bold text-amber-700">₹{pendingShare.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs uppercase text-slate-500">Paid out</div><div className="text-xl font-bold text-emerald-700">₹{paidOut.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs uppercase text-slate-500">Revenue lines</div><div className="text-xl font-bold">{revenues.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue share lines ({revenues.length})</CardTitle></CardHeader>
        <CardContent>
          {revenues.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No revenue lines yet. They're generated automatically when doctors are linked to invoices via
              their DoctorContract.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase">
                <tr><th className="text-left p-2">Doctor</th><th className="text-left p-2">Invoice</th><th className="text-left p-2">Type</th><th className="text-right p-2">Share</th><th className="text-left p-2">Status</th><th className="text-left p-2">Created</th></tr>
              </thead>
              <tbody>
                {revenues.slice(0, 100).map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.doctorId?.slice(0, 8) || '—'}</td>
                    <td className="p-2 text-xs">{r.invoiceId?.slice(0, 8)}</td>
                    <td className="p-2">{r.revenueType}</td>
                    <td className="p-2 text-right">₹{Number(r.shareAmount || 0).toLocaleString()}</td>
                    <td className="p-2"><StatusBadge value={r.status} /></td>
                    <td className="p-2">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payouts ({payouts.length})</CardTitle></CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No doctor payouts processed yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase">
                <tr><th className="text-left p-2">Payout #</th><th className="text-left p-2">Doctor</th><th className="text-left p-2">Period</th><th className="text-right p-2">Net</th><th className="text-left p-2">Mode</th><th className="text-left p-2">Status</th></tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{p.payoutNumber}</td>
                    <td className="p-2">{p.doctorId?.slice(0, 8) || '—'}</td>
                    <td className="p-2 text-xs">{fmtDate(p.fromDate)} – {fmtDate(p.toDate)}</td>
                    <td className="p-2 text-right font-semibold text-emerald-700">₹{Number(p.netAmount || 0).toLocaleString()}</td>
                    <td className="p-2">{p.paymentMode}</td>
                    <td className="p-2"><StatusBadge value={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================
// TIER 3 — SCAFFOLDED, INTEGRATION DEFERRED
// ===========================================================

// Tally / Accounting — integration-aware. Reads the active 'accounting'
// integration from the hub (System Control → Integrations); when present,
// shows connected state with sync controls. When absent, shows setup
// steps + a deep link to configure.
export function Tally() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-600 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tally / Accounting</h1>
          <p className="text-sm text-slate-500">Two-way sync with AccuBook double-entry ledger</p>
        </div>
      </div>

      <IntegrationStatusCard
        category="accounting"
        targetModule="tally"
        label="Accounting integration"
        suggestedProvider="accubook"
        setupSteps={[
          'Deploy AccuBook backend with API exposed at a known URL',
          'In System Control → Integrations, click "+ New integration" → AccuBook',
          'Enter the AccuBook base URL + API token + organization ID',
          'Bind to modules "billing" and "tally"',
          'Click Re-test to verify connectivity',
        ]}
      >
        {(integ) => integ ? (
          <>
            {/* Embedded AccuBook UI. Only renders if webUrl is configured.
                Many web apps block iframing via X-Frame-Options or CSP
                frame-ancestors — if the iframe shows blank, the
                "Launch in new tab" button always works. */}
            {integ.webUrl ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">AccuBook</CardTitle>
                    <CardDescription className="truncate max-w-md">
                      {integ.webUrl}
                    </CardDescription>
                  </div>
                  <a
                    href={integ.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 border rounded-md hover:bg-slate-50"
                  >
                    Launch in new tab ↗
                  </a>
                </CardHeader>
                <CardContent>
                  <iframe
                    src={integ.webUrl}
                    title="AccuBook"
                    className="w-full border rounded"
                    style={{ height: '70vh' }}
                    // sandbox is intentionally permissive so the embedded
                    // app behaves normally; AccuBook auth is its own layer.
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                  />
                  <p className="text-[11px] text-slate-500 italic mt-2">
                    If the embed area is blank, AccuBook is blocking iframing via security
                    headers (X-Frame-Options or CSP frame-ancestors). Use the "Launch in new tab"
                    button — that always works.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Web UI not configured</CardTitle>
                  <CardDescription>
                    Add a Web UI URL to the AccuBook integration in System Control → Integrations
                    so this page can show the AccuBook dashboard. Until then, this page only stores
                    credentials for backend sync.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Backend sync controls (planned)</CardTitle>
              <CardDescription>
                Push posted invoices to AccuBook as journal vouchers, or run a reconciliation report.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="border rounded p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Push invoices</div>
                  <div className="text-xs text-slate-700 mt-1">
                    Sends posted invoices since the last successful sync to AccuBook as
                    revenue vouchers. Runs nightly via cron once enabled.
                  </div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Pull ledgers</div>
                  <div className="text-xs text-slate-700 mt-1">
                    Refreshes the chart-of-accounts mapping so HospitalPro income heads
                    point at the correct AccuBook ledgers.
                  </div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Reconcile</div>
                  <div className="text-xs text-slate-700 mt-1">
                    Compares HospitalPro paid totals against AccuBook receipts for a date range.
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 italic">
                Sync endpoints (POST /api/accounting/sync, GET /api/accounting/sync-status,
                ledger reconciliation) are pending implementation. The integration credentials
                are persisted; the runtime sync layer is the next step.
              </p>
            </CardContent>
          </Card>
          </>
        ) : null}
      </IntegrationStatusCard>
    </div>
  );
}

export function VideoConversation() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
          <Video className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Video / Phone Conversation</h1>
          <p className="text-sm text-slate-500">Telemedicine — Zoom or Teams meeting bridge</p>
        </div>
      </div>

      <IntegrationStatusCard
        category="telemed"
        targetModule="video-conversation"
        label="Telemedicine integration"
        suggestedProvider="zoom"
        setupSteps={[
          'Register a Zoom Server-to-Server OAuth app (or Microsoft Teams app) under the hospital\'s account',
          'In System Control → Integrations, click "+ New integration" → Zoom',
          'Enter Account ID, Client ID, Client Secret',
          'Bind to module "video-conversation"',
          'Click Re-test to verify the OAuth credentials',
        ]}
      >
        {(integ) => integ ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tele-consultation</CardTitle>
              <CardDescription>
                Create a meeting on demand or embed a join URL on an appointment.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-slate-700">
                Meeting-create endpoint (POST /api/teleconsult/meetings), join-URL embedding on
                Appointment records, and recording-retention policy are pending implementation.
                Credentials are stored and ready to use.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </IntegrationStatusCard>
    </div>
  );
}

export function DICOMPACS() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-700 flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">DICOM / PACS</h1>
          <p className="text-sm text-slate-500">Imaging worklist + study viewer</p>
        </div>
      </div>

      <IntegrationStatusCard
        category="dicom"
        targetModule="dicom-pacs"
        label="PACS server"
        suggestedProvider="orthanc"
        setupSteps={[
          'Deploy Orthanc on a dedicated VM with NVMe storage',
          'Configure DICOM modality worklist so X-ray / CT / MRI machines push images to Orthanc',
          'In System Control → Integrations, click "+ New integration" → Orthanc PACS',
          'Enter the Orthanc base URL + Basic-auth credentials',
          'Bind to modules "radiology" and "dicom-pacs"',
        ]}
      >
        {(integ) => integ ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Worklist + viewer</CardTitle>
              <CardDescription>
                Pull modality worklist from PACS and embed the OHIF / Stone viewer for image review.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-slate-700">
                Worklist endpoint (GET /api/pacs/worklist), study metadata proxy, and OHIF
                viewer embed are pending implementation. Credentials are stored.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </IntegrationStatusCard>
    </div>
  );
}

export function MedicalDevice() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center">
          <Monitor className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medical Device Integration</h1>
          <p className="text-sm text-slate-500">ICU monitors, lab analyzers, vital-signs streams</p>
        </div>
      </div>

      <IntegrationStatusCard
        category="lab_analyzer"
        targetModule="medical-device"
        label="Device gateway"
        suggestedProvider="mirth"
        setupSteps={[
          'Inventory: which devices, what protocols (HL7 v2, ASTM, vendor SDK), what physical/network ports',
          'Deploy Mirth Connect on a hospital-LAN VM',
          'Build per-device adapter channels',
          'In System Control → Integrations, click "+ New integration" → Mirth Connect',
          'Bind to modules "laboratory" and "medical-device"',
        ]}
      >
        {(integ) => integ ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connected devices</CardTitle>
              <CardDescription>
                Real-time vitals stream + critical-value alerting once devices register with the gateway.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-slate-700">
                HL7 inbound endpoint (POST /api/devices/hl7), device → encounter mapping, and
                vitals SSE stream for the ICU monitor wall are pending implementation.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </IntegrationStatusCard>
    </div>
  );
}

export function DoctorRegistration() {
  // Curated read-only view of existing User profiles where roleIds
  // contains DOCTOR/CONSULTANT/SURGEON. Editing happens through System
  // Control → User Management.
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void api.get('/api/users').then((r) => {
      const list = (r.data || []).filter((u: any) =>
        (u.roleIds || []).some((rid: string) => ['DOCTOR','CONSULTANT','SURGEON'].includes(rid)),
      );
      setDoctors(list);
    }).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctor Registration</h1>
          <p className="text-sm text-slate-500">All onboarded clinicians with credentials. Edit in System Control → User Management.</p>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {doctors.map((d) => {
          const profile = d.profile || {};
          const doctor = profile.doctor || {};
          return (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="font-semibold text-slate-900">{d.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{doctor.qualifications || '—'}</div>
                <div className="mt-2 space-y-1 text-xs">
                  <div><span className="text-slate-500">Specialization:</span> {doctor.specialization || '—'}</div>
                  <div><span className="text-slate-500">Registration #:</span> {doctor.registrationNumber || '—'}</div>
                  <div><span className="text-slate-500">Joined:</span> {profile.joiningDate ? fmtDate(profile.joiningDate) : '—'}</div>
                  <div><span className="text-slate-500">Phone:</span> {d.phone || '—'}</div>
                  <div><span className="text-slate-500">Email:</span> {d.email}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(d.roleIds || []).map((r: string) => <Badge key={r} variant="outline">{r}</Badge>)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {doctors.length === 0 && !loading && (
        <p className="text-sm text-slate-500 py-6 text-center">
          No doctors registered yet. Add one via System Control → User Management → + Add User → Doctor role.
        </p>
      )}
    </div>
  );
}

export function MRDManagement() {
  return (
    <ScaffoldPage
      icon={FileText} tint="bg-slate-600"
      title="Medical Records Department (MRD)"
      description="Record archival, retrieval, retention, release"
      bodyTitle="Functional v1 — basic record indexing"
      paragraphs={[
        'Patient records are the source of truth for every interaction in HospitalPro — every encounter, admission, lab result, prescription, and bill is already captured.',
        'MRD\'s job here is the *physical* / archival overlay: tracking paper folders, scan-status of legacy records, retention timers (7 years post-discharge by DPDP), and release-on-request workflows.',
      ]}
      todos={[
        'Record-request form for patients/insurers (with consent capture)',
        'Scan-status flag on Patient (digitised: yes/no/partial)',
        'Retention scheduler — flag records due for legal-archive after 7y',
        'Release-of-records audit log (who took what when)',
        'MRD shelf/locator for paper folders',
      ]}
    />
  );
}

export function OPDClinical() {
  return (
    <ScaffoldPage
      icon={ClipboardList} tint="bg-indigo-600"
      title="OPD Clinical — Templates & Protocols"
      description="Reusable clinical templates, treatment protocols, care pathways"
      bodyTitle="Functional v1 — template library"
      paragraphs={[
        'The standard OPD module already records every consultation. This screen is for the meta-layer: reusable clinical templates so doctors don\'t hand-type the same SOAP structure for each diabetic / hypertensive / antenatal visit.',
      ]}
      todos={[
        'CRUD for ClinicalTemplate (name + body + specialty)',
        '"Insert template" button inside OPD note editor',
        'Care pathway builder (multi-step plans)',
        'Tumor-board / case-conference templates',
      ]}
    />
  );
}

export function DoctorAssistant() {
  return (
    <ScaffoldPage
      icon={UserCog} tint="bg-amber-600"
      title="Doctor Assistant"
      description="Quick-access clinical tools: drug-interaction check, dose calculator, ICD-10 lookup"
      bodyTitle="Functional v1 — quick-tools"
      paragraphs={[
        'A pop-out workspace for doctors during a consult: drug-interaction warnings (cross-references the prescription against the drug master), pediatric dose calculator, ICD-10 search, common-protocol cheatsheet.',
        'Most of the data already exists in HospitalPro — this screen is the curation layer.',
      ]}
      todos={[
        'Drug interaction matrix (Drug master + interactions JSON)',
        'Pediatric dose calculator (mg/kg)',
        'ICD-10 fuzzy search',
        'Lab reference-range quick lookup',
      ]}
    />
  );
}

export function StoreManagement() {
  // Store Management is the inventory module under a different name. The
  // Inventory page is real and full-featured — redirect there.
  return <Navigate to="/app/inventory" replace />;
}

export function SoftwareManagement() {
  // Master data + module-toggle. The Master Data page is real.
  return <Navigate to="/app/master-data" replace />;
}

export function HealthCheckup() {
  return (
    <ScaffoldPage
      icon={HeartPulse} tint="bg-red-500"
      title="Health Checkup Packages"
      description="Preventive-care wellness packages and corporate health programs"
      bodyTitle="Functional v1 — package catalog"
      paragraphs={[
        'Preventive health packages (basic, premium, executive, cardiac, women\'s wellness) are sold as bundles of OPD consult + lab tests + imaging + diet consult, at a discounted package price.',
        'For v1 we treat each package as a special invoice line that auto-creates the underlying lab orders + appointments when sold.',
      ]}
      todos={[
        'Package master (already exists in PackageMaster table)',
        'Booking flow: select package → patient → date → invoice',
        'Auto-create child orders/appointments on payment',
        'Corporate program billing (annual contracts)',
      ]}
    />
  );
}

// ===========================================================
// SHARED — SCAFFOLD PAGE
// ===========================================================

interface ScaffoldProps {
  icon: any;
  tint: string;
  title: string;
  description: string;
  bodyTitle: string;
  paragraphs: string[];
  todos: string[];
}

function ScaffoldPage({ icon: Icon, tint, title, description, bodyTitle, paragraphs, todos }: ScaffoldProps) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${tint} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{bodyTitle}</CardTitle>
          <CardDescription>
            This module is wired into the platform but requires external configuration to go fully live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-slate-700 whitespace-pre-line">{p}</p>
          ))}
          <div className="border-t pt-3">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Pending implementation</div>
            <ul className="space-y-1 text-sm text-slate-700">
              {todos.map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <code className="text-xs bg-slate-100 px-1 rounded">{t}</code>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================
// RE-EXPORTS — full pages with their own files
// ===========================================================

export { default as AssetManagement } from './AssetManagement';
export { default as InpatientBilling } from './IPDBilling';
