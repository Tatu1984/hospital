import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, ChevronDown } from 'lucide-react';
import {
  Calendar,
  Users,
  Stethoscope,
  HeartPulse,
  TestTube,
  Scan,
  Bed,
  Receipt,
  Activity,
  Scissors,
  Droplet,
  BarChart3,
  Pill,
  Settings,
  ShieldCheck,
  Syringe,
  UserCog,
  Package,
  ClipboardList,
  Calculator,
  FileText,
  CreditCard,
  Video,
  Wind,
  Wrench,
  PersonStanding,
  Cross,
  Fingerprint,
  ImageIcon,
  Monitor,
  Wallet,
  Microscope,
  UserPlus
} from 'lucide-react';

const modules = [
  {
    id: 'appointment',
    title: 'Appointment',
    description: 'Manage patient appointments and schedules',
    icon: Calendar,
    color: 'from-blue-500 to-blue-600',
    path: '/appointment'
  },
  {
    id: 'patient-registration',
    title: 'Patient Registration',
    description: 'Register new patients and manage demographics',
    icon: Users,
    color: 'from-cyan-500 to-cyan-600',
    path: '/patients'
  },
  {
    id: 'outpatient',
    title: 'OutPatient Management',
    description: 'Manage OPD consultations and EMR',
    icon: Stethoscope,
    color: 'from-purple-500 to-purple-600',
    path: '/opd'
  },
  {
    id: 'health-checkup',
    title: 'Health Checkup',
    description: 'Schedule and manage health checkup packages',
    icon: HeartPulse,
    color: 'from-red-500 to-red-600',
    path: '/health-checkup'
  },
  {
    id: 'laboratory',
    title: 'Laboratory',
    description: 'Laboratory Information System (LIS)',
    icon: TestTube,
    color: 'from-pink-500 to-pink-600',
    path: '/laboratory'
  },
  {
    id: 'radiology',
    title: 'Radiology',
    description: 'Radiology Information System & PACS',
    icon: Scan,
    color: 'from-indigo-500 to-indigo-600',
    path: '/radiology'
  },
  {
    id: 'inpatient',
    title: 'Inpatient Management',
    description: 'IPD admissions, bed management, transfers',
    icon: Bed,
    color: 'from-green-500 to-green-600',
    path: '/inpatient'
  },
  {
    id: 'inpatient-billing',
    title: 'Inpatient Billing',
    description: 'IPD billing and discharge management',
    icon: Receipt,
    color: 'from-teal-500 to-teal-600',
    path: '/inpatient-billing'
  },
  {
    id: 'nurse-station',
    title: 'Nurse Station',
    description: 'Nursing care plans and medication records',
    icon: Activity,
    color: 'from-emerald-500 to-emerald-600',
    path: '/nurse-station'
  },
  {
    id: 'operation-theatre',
    title: 'Operation Theatre',
    description: 'OT scheduling and surgical management',
    icon: Scissors,
    color: 'from-orange-500 to-orange-600',
    path: '/operation-theatre'
  },
  {
    id: 'blood-bank',
    title: 'Blood Bank',
    description: 'Blood inventory and transfusion management',
    icon: Droplet,
    color: 'from-red-600 to-red-700',
    path: '/blood-bank'
  },
  {
    id: 'mis-report',
    title: 'MIS Report',
    description: 'Analytics, dashboards, and reports',
    icon: BarChart3,
    color: 'from-violet-500 to-violet-600',
    path: '/mis-report'
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy',
    description: 'Pharmacy inventory and dispensing',
    icon: Pill,
    color: 'from-blue-600 to-blue-700',
    path: '/pharmacy'
  },
  {
    id: 'software-management',
    title: 'Software Management',
    description: 'System configuration and master data',
    icon: Settings,
    color: 'from-gray-600 to-gray-700',
    path: '/software-management'
  },
  {
    id: 'system-control',
    title: 'System Control',
    description: 'User management, roles, and permissions',
    icon: ShieldCheck,
    color: 'from-slate-600 to-slate-700',
    path: '/system-control'
  },
  {
    id: 'phlebotomy',
    title: 'Phlebotomy',
    description: 'Sample collection and tracking',
    icon: Syringe,
    color: 'from-rose-500 to-rose-600',
    path: '/phlebotomy'
  },
  {
    id: 'doctor-assistant',
    title: 'Doctor Assistant',
    description: 'Clinical assistant tools and workflows',
    icon: UserCog,
    color: 'from-cyan-600 to-cyan-700',
    path: '/doctor-assistant'
  },
  {
    id: 'store-management',
    title: 'Store Management',
    description: 'Inventory, procurement, and stock control',
    icon: Package,
    color: 'from-amber-600 to-amber-700',
    path: '/store-management'
  },
  {
    id: 'opd-clinical',
    title: 'OPD Clinical Management',
    description: 'Clinical protocols and treatment plans',
    icon: ClipboardList,
    color: 'from-lime-600 to-lime-700',
    path: '/opd-clinical'
  },
  {
    id: 'tally',
    title: 'Tally',
    description: 'Accounting and financial integration',
    icon: Calculator,
    color: 'from-yellow-600 to-yellow-700',
    path: '/tally'
  },
  {
    id: 'mrd-management',
    title: 'MRD Management',
    description: 'Medical Records Department management',
    icon: FileText,
    color: 'from-sky-600 to-sky-700',
    path: '/mrd-management'
  },
  {
    id: 'doctor-accounting',
    title: 'Doctor Accounting',
    description: 'Doctor revenue sharing and payouts',
    icon: CreditCard,
    color: 'from-fuchsia-600 to-fuchsia-700',
    path: '/doctor-accounting'
  },
  {
    id: 'asset-management',
    title: 'Asset Management',
    description: 'Hospital assets and equipment tracking',
    icon: Monitor,
    color: 'from-blue-700 to-blue-800',
    path: '/asset-management'
  },
  {
    id: 'video-conversation',
    title: 'Video/Phone Conversation',
    description: 'Teleconsultation and telemedicine',
    icon: Video,
    color: 'from-purple-600 to-purple-700',
    path: '/video-conversation'
  },
  {
    id: 'cssd',
    title: 'CSSD',
    description: 'Central Sterile Supply Department',
    icon: Wind,
    color: 'from-teal-600 to-teal-700',
    path: '/cssd'
  },
  {
    id: 'equipment-maintenance',
    title: 'Equipment Maintenance',
    description: 'Equipment servicing and maintenance logs',
    icon: Wrench,
    color: 'from-orange-600 to-orange-700',
    path: '/equipment-maintenance'
  },
  {
    id: 'physiotherapy',
    title: 'Physiotherapy',
    description: 'Physiotherapy sessions and management',
    icon: PersonStanding,
    color: 'from-green-600 to-green-700',
    path: '/physiotherapy'
  },
  {
    id: 'mortuary',
    title: 'Mortuary',
    description: 'Mortuary and deceased management',
    icon: Cross,
    color: 'from-gray-700 to-gray-800',
    path: '/mortuary'
  },
  {
    id: 'biometric-attendance',
    title: 'Biometric Attendance',
    description: 'Staff attendance and access control',
    icon: Fingerprint,
    color: 'from-indigo-600 to-indigo-700',
    path: '/biometric-attendance'
  },
  {
    id: 'dicom-pacs',
    title: 'DICOM/PACS',
    description: 'Medical imaging and PACS integration',
    icon: ImageIcon,
    color: 'from-cyan-700 to-cyan-800',
    path: '/dicom-pacs'
  },
  {
    id: 'medical-device',
    title: 'Medical Device',
    description: 'Medical device integration and monitoring',
    icon: Monitor,
    color: 'from-emerald-700 to-emerald-800',
    path: '/medical-device'
  },
  {
    id: 'payroll',
    title: 'Payroll Management',
    description: 'Staff payroll processing and management',
    icon: Wallet,
    color: 'from-green-700 to-green-800',
    path: '/payroll'
  },
  {
    id: 'pathology',
    title: 'Pathology',
    description: 'Pathology reports and diagnostics',
    icon: Microscope,
    color: 'from-pink-600 to-pink-700',
    path: '/pathology'
  },
  {
    id: 'doctor-registration',
    title: 'Doctor Registration',
    description: 'Doctor onboarding and credentials',
    icon: UserPlus,
    color: 'from-blue-800 to-blue-900',
    path: '/doctor-registration'
  },
  {
    id: 'dialysis',
    title: 'Dialysis',
    description: 'Nephrology — sessions, machines, vascular access',
    icon: Activity,
    color: 'from-rose-500 to-rose-600',
    path: '/dialysis'
  }
];

// Group tile keys into logical categories. Anything not listed falls
// into "Other modules". Keeps the dashboard scannable instead of being
// a 30-tile carpet.
const CATEGORIES: Array<{ title: string; ids: string[]; dot: string }> = [
  { title: 'Patient flow',     dot: 'bg-blue-400',    ids: ['appointment', 'patient-registration', 'outpatient', 'health-checkup', 'inpatient', 'emergency', 'icu', 'operation-theatre', 'birth-records'] },
  { title: 'Diagnostics',      dot: 'bg-violet-400',  ids: ['laboratory', 'radiology', 'pathology', 'blood-bank', 'phlebotomy', 'dicom-pacs'] },
  { title: 'Support',          dot: 'bg-emerald-400', ids: ['pharmacy', 'nurse-station', 'ambulance', 'housekeeping', 'diet', 'physiotherapy', 'dialysis', 'mortuary', 'cssd'] },
  { title: 'Finance',          dot: 'bg-amber-400',   ids: ['inpatient-billing', 'billing', 'tpa', 'referral-commission', 'doctor-accounting', 'tally'] },
  { title: 'Operations',       dot: 'bg-indigo-400',  ids: ['hr', 'payroll', 'biometric-attendance', 'inventory', 'store-management', 'asset-management', 'equipment-maintenance', 'doctor-registration'] },
  { title: 'Insights & admin', dot: 'bg-rose-400',    ids: ['mis-report', 'master-data', 'system-control', 'audit-log', 'activity-monitor', 'quality'] },
];

// Per-module pastel tint. bg-*-50 + text-*-600 gives the soft "iOS / Notion"
// pastel look without being noisy. Modules without an entry fall back to
// neutral slate. Add new modules here as we ship them.
const TINTS: Record<string, { bg: string; text: string; ring: string }> = {
  // Patient flow
  appointment:           { bg: 'bg-blue-50',     text: 'text-blue-600',     ring: 'ring-blue-100' },
  'patient-registration':{ bg: 'bg-cyan-50',     text: 'text-cyan-600',     ring: 'ring-cyan-100' },
  outpatient:            { bg: 'bg-violet-50',   text: 'text-violet-600',   ring: 'ring-violet-100' },
  'health-checkup':      { bg: 'bg-emerald-50',  text: 'text-emerald-600',  ring: 'ring-emerald-100' },
  inpatient:             { bg: 'bg-emerald-50',  text: 'text-emerald-600',  ring: 'ring-emerald-100' },
  emergency:             { bg: 'bg-red-50',      text: 'text-red-600',      ring: 'ring-red-100' },
  icu:                   { bg: 'bg-orange-50',   text: 'text-orange-600',   ring: 'ring-orange-100' },
  'operation-theatre':   { bg: 'bg-amber-50',    text: 'text-amber-600',    ring: 'ring-amber-100' },
  'birth-records':       { bg: 'bg-pink-50',     text: 'text-pink-600',     ring: 'ring-pink-100' },
  // Diagnostics
  laboratory:            { bg: 'bg-pink-50',     text: 'text-pink-600',     ring: 'ring-pink-100' },
  radiology:             { bg: 'bg-indigo-50',   text: 'text-indigo-600',   ring: 'ring-indigo-100' },
  pathology:             { bg: 'bg-fuchsia-50',  text: 'text-fuchsia-600',  ring: 'ring-fuchsia-100' },
  'blood-bank':          { bg: 'bg-red-50',      text: 'text-red-600',      ring: 'ring-red-100' },
  phlebotomy:            { bg: 'bg-rose-50',     text: 'text-rose-600',     ring: 'ring-rose-100' },
  'dicom-pacs':          { bg: 'bg-sky-50',      text: 'text-sky-600',      ring: 'ring-sky-100' },
  // Support
  pharmacy:              { bg: 'bg-teal-50',     text: 'text-teal-600',     ring: 'ring-teal-100' },
  'nurse-station':       { bg: 'bg-emerald-50',  text: 'text-emerald-600',  ring: 'ring-emerald-100' },
  ambulance:             { bg: 'bg-orange-50',   text: 'text-orange-600',   ring: 'ring-orange-100' },
  housekeeping:          { bg: 'bg-yellow-50',   text: 'text-yellow-700',   ring: 'ring-yellow-100' },
  diet:                  { bg: 'bg-lime-50',     text: 'text-lime-700',     ring: 'ring-lime-100' },
  physiotherapy:         { bg: 'bg-cyan-50',     text: 'text-cyan-600',     ring: 'ring-cyan-100' },
  dialysis:              { bg: 'bg-rose-50',     text: 'text-rose-600',     ring: 'ring-rose-100' },
  mortuary:              { bg: 'bg-slate-100',   text: 'text-slate-700',    ring: 'ring-slate-200' },
  cssd:                  { bg: 'bg-sky-50',      text: 'text-sky-600',      ring: 'ring-sky-100' },
  // Finance
  billing:               { bg: 'bg-emerald-50',  text: 'text-emerald-600',  ring: 'ring-emerald-100' },
  'inpatient-billing':   { bg: 'bg-emerald-50',  text: 'text-emerald-600',  ring: 'ring-emerald-100' },
  tpa:                   { bg: 'bg-blue-50',     text: 'text-blue-600',     ring: 'ring-blue-100' },
  'referral-commission': { bg: 'bg-violet-50',   text: 'text-violet-600',   ring: 'ring-violet-100' },
  'doctor-accounting':   { bg: 'bg-amber-50',    text: 'text-amber-700',    ring: 'ring-amber-100' },
  tally:                 { bg: 'bg-indigo-50',   text: 'text-indigo-600',   ring: 'ring-indigo-100' },
  // Operations
  hr:                    { bg: 'bg-violet-50',   text: 'text-violet-600',   ring: 'ring-violet-100' },
  payroll:               { bg: 'bg-green-50',    text: 'text-green-700',    ring: 'ring-green-100' },
  'biometric-attendance':{ bg: 'bg-indigo-50',   text: 'text-indigo-600',   ring: 'ring-indigo-100' },
  inventory:             { bg: 'bg-amber-50',    text: 'text-amber-700',    ring: 'ring-amber-100' },
  'store-management':    { bg: 'bg-amber-50',    text: 'text-amber-700',    ring: 'ring-amber-100' },
  'asset-management':    { bg: 'bg-orange-50',   text: 'text-orange-700',   ring: 'ring-orange-100' },
  'equipment-maintenance': { bg: 'bg-yellow-50', text: 'text-yellow-700',   ring: 'ring-yellow-100' },
  'doctor-registration': { bg: 'bg-cyan-50',     text: 'text-cyan-600',     ring: 'ring-cyan-100' },
  // Insights & admin
  'mis-report':          { bg: 'bg-blue-50',     text: 'text-blue-600',     ring: 'ring-blue-100' },
  'master-data':         { bg: 'bg-slate-100',   text: 'text-slate-700',    ring: 'ring-slate-200' },
  'system-control':      { bg: 'bg-slate-100',   text: 'text-slate-700',    ring: 'ring-slate-200' },
  'audit-log':           { bg: 'bg-slate-100',   text: 'text-slate-700',    ring: 'ring-slate-200' },
  'activity-monitor':    { bg: 'bg-indigo-50',   text: 'text-indigo-600',   ring: 'ring-indigo-100' },
  quality:               { bg: 'bg-emerald-50',  text: 'text-emerald-600',  ring: 'ring-emerald-100' },
};
const NEUTRAL_TINT = { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-200' };

// Persist which sections the user collapsed. Keyed by title.
const COLLAPSE_KEY = 'hms.dash.collapsed';
function loadCollapsed(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}'); } catch { return {}; }
}
function saveCollapsed(v: Record<string, boolean>) {
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(v)); } catch { /* quota / privacy mode */ }
}

export default function NewDashboard() {
  const navigate = useNavigate();
  const { hasAccess, user } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || 'there').split(' ')[0];

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => loadCollapsed());
  function toggle(title: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      saveCollapsed(next);
      return next;
    });
  }

  const tiles = modules.map((m) => ({ ...m, allowed: hasAccess(m.path.replace(/^\//, '')) }));
  const tileById = Object.fromEntries(tiles.map((t) => [t.id, t]));
  const grouped = CATEGORIES.map((c) => ({
    title: c.title,
    dot: c.dot,
    items: c.ids.map((id) => tileById[id]).filter(Boolean),
  })).filter((g) => g.items.length > 0);
  const grouped_ids = new Set(CATEGORIES.flatMap((c) => c.ids));
  const others = tiles.filter((t) => !grouped_ids.has(t.id));
  if (others.length) grouped.push({ title: 'Other modules', dot: 'bg-slate-300', items: others });

  return (
    <div className="min-h-full">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-7">
        {/* Hero */}
        <div className="space-y-1">
          <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">
            {greeting}, {firstName}.
          </h1>
          <p className="text-slate-500 text-[15px]">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Jump back in below or use the sidebar search.
          </p>
        </div>

        {/* Module grid, grouped + collapsible. State persists in localStorage so
            the user's preferred view survives reloads. */}
        {grouped.map((group) => {
          const isCollapsed = !!collapsed[group.title];
          return (
            <section key={group.title}>
              <button
                onClick={() => toggle(group.title)}
                className="group flex items-center gap-2 mb-3 py-1 pr-2 rounded-md hover:bg-slate-100/60 transition-colors"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isCollapsed ? '-rotate-90' : ''}`}
                />
                <span className={`w-1.5 h-1.5 rounded-full ${group.dot}`} />
                <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.1em] group-hover:text-slate-700 transition-colors">
                  {group.title}
                </h2>
                <span className="text-[10px] text-slate-400 font-medium tabular-nums">{group.items.length}</span>
              </button>

              {!isCollapsed && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  {group.items.map((m) => {
                    const Icon = m.icon;
                    const tint = TINTS[m.id] || NEUTRAL_TINT;
                    const onClick = m.allowed ? () => navigate(`/app${m.path}`) : undefined;
                    return (
                      <button
                        key={m.id}
                        onClick={onClick}
                        disabled={!m.allowed}
                        title={m.allowed ? undefined : 'Your role does not have access to this module'}
                        className={
                          m.allowed
                            ? 'group relative text-left bg-white border border-slate-200/70 rounded-xl p-4 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgb(0_0_0_/_0.05)] transition-all duration-150'
                            : 'group relative text-left bg-slate-50/60 border border-slate-200/70 rounded-xl p-4 cursor-not-allowed opacity-60'
                        }
                      >
                        {!m.allowed && (
                          <Lock className="absolute top-3 right-3 w-3 h-3 text-slate-400" />
                        )}
                        <div className={`w-10 h-10 rounded-xl ${tint.bg} ring-1 ${tint.ring} flex items-center justify-center mb-3 transition-transform group-hover:scale-[1.04]`}>
                          <Icon className={`w-[18px] h-[18px] ${m.allowed ? tint.text : 'text-slate-400'}`} />
                        </div>
                        <div className="text-[13px] font-medium text-slate-900 leading-snug">{m.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">{m.description}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
