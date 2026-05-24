import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { ErrorBoundary } from './ErrorBoundary';
import AlertBanner from './AlertBanner';
import RaiseAlarmButton from './RaiseAlarmButton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  Users,
  Calendar,
  Stethoscope,
  TestTube,
  Bed,
  Receipt,
  Menu as MenuIcon,
  LogOut,
  User,
  X,
  Scan,
  Pill,
  Activity,
  Scissors,
  Droplet,
  BarChart3,
  Settings,
  ShieldCheck,
  AlertCircle,
  Heart,
  Ambulance,
  UserCog,
  Package,
  ClipboardList,
  Utensils,
  Wrench,
  Star,
  Wallet,
  Search,
  Network,
  Baby,
  Box,
  AlertOctagon,
  Trash2,
  Scale,
  Hash,
} from 'lucide-react';

// Roles for which the "My Earnings" finance entry shows in the sidebar.
// Same set the doctor dashboard uses (App.tsx) — keep them in sync.
const DOCTOR_ROLE_IDS = new Set(['DOCTOR', 'CONSULTANT', 'SURGEON']);

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Search filter for the sidebar. Matches against item.label OR item.path
  // case-insensitively; an empty string shows everything. Groups with no
  // matching items collapse out so the user sees a tight result list.
  const [search, setSearch] = useState('');
  const { user, logout, hasAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isDoctor = (user?.roleIds || []).some((r: string) => DOCTOR_ROLE_IDS.has(r));

  // Page-view tracking. On every route change, log the page we just
  // LEFT (with the time spent on it) to /api/internal/page-view. The
  // previous path + duration is what the analytics dashboard
  // aggregates. We also log a final beacon on tab close via
  // sendBeacon so the last page's duration isn't lost.
  //
  // PRIVACY: every URL stays inside our Neon DB — never sent to a
  // third party. URLs may contain patient ids; that's PHI, which is
  // exactly why the in-house AuditLog approach was chosen over
  // PostHog cloud.
  const enterTimeRef = useRef<number>(Date.now());
  const prevPathRef = useRef<string>(location.pathname);
  useEffect(() => {
    const fromPath = prevPathRef.current;
    const toPath = location.pathname;
    if (fromPath !== toPath) {
      const durationMs = Date.now() - enterTimeRef.current;
      // Fire-and-forget. Failures don't reach the user — analytics
      // gaps are preferable to error toasts during a clinical task.
      void api
        .post('/api/internal/page-view', { path: fromPath, prevPath: null, durationMs })
        .catch(() => undefined);
      prevPathRef.current = toPath;
      enterTimeRef.current = Date.now();
    }
  }, [location.pathname]);

  useEffect(() => {
    // On tab close / hard refresh, send a final page-view event for the
    // current route so its duration counts. sendBeacon is the only
    // reliable way to ship a request during unload; it's fire-and-
    // forget by design and doesn't block navigation.
    function flush() {
      try {
        const durationMs = Date.now() - enterTimeRef.current;
        const path = prevPathRef.current;
        if (!path || durationMs < 500) return;
        const body = JSON.stringify({ path, prevPath: null, durationMs });
        const apiBase = (import.meta as any).env?.VITE_API_URL || '';
        const url = `${apiBase}/api/internal/page-view`;
        // sendBeacon doesn't take Authorization headers, so this only
        // logs for sessions where the cookie-based refresh token is
        // present. The trade-off is acceptable for an analytics signal.
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon(url, blob);
        }
      } catch {
        // ignore — analytics is best-effort
      }
    }
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  const menuGroups = [
    {
      title: 'Core',
      items: [
        { path: '/', icon: Home, label: 'Dashboard' },
        { path: '/live-dashboard', icon: Activity, label: 'Live Dashboard' },
        { path: '/patients', icon: Users, label: 'Front Office' },
        { path: '/appointment', icon: Calendar, label: 'Appointments' },
      ]
    },
    {
      title: 'Clinical',
      items: [
        { path: '/opd', icon: Stethoscope, label: 'OPD' },
        { path: '/opd-queue', icon: Hash, label: 'OPD Queue' },
        { path: '/inpatient', icon: Bed, label: 'IPD / Ward' },
        { path: '/consultations', icon: Network, label: 'Consultations' },
        { path: '/emergency', icon: AlertCircle, label: 'Emergency' },
        { path: '/icu', icon: Heart, label: 'ICU' },
        { path: '/operation-theatre', icon: Scissors, label: 'OT' },
        { path: '/dialysis', icon: Activity, label: 'Dialysis' },
        { path: '/birth-records', icon: Baby, label: 'Birth Records' },
        { path: '/implants', icon: Box, label: 'Implants' },
      ]
    },
    {
      title: 'Specialty',
      items: [
        { path: '/obstetrics', icon: Baby, label: 'Obstetrics' },
        { path: '/nicu', icon: Baby, label: 'NICU' },
        { path: '/chemo', icon: Activity, label: 'Chemo' },
        { path: '/cath-lab', icon: Heart, label: 'Cath Lab' },
        { path: '/radiotherapy', icon: Activity, label: 'Radiotherapy' },
      ]
    },
    {
      title: 'Diagnostics',
      items: [
        { path: '/laboratory', icon: TestTube, label: 'Laboratory' },
        { path: '/radiology', icon: Scan, label: 'Radiology' },
        { path: '/blood-bank', icon: Droplet, label: 'Blood Bank' },
      ]
    },
    {
      title: 'Support Services',
      items: [
        { path: '/pharmacy', icon: Pill, label: 'Pharmacy' },
        { path: '/nurse-station', icon: Activity, label: 'Nursing' },
        { path: '/ambulance', icon: Ambulance, label: 'Transport' },
      ]
    },
    {
      title: 'Finance',
      items: [
        // Doctor-only — their daily/weekly/monthly payout (done vs left)
        // plus historical payouts. Other roles never see this entry.
        ...(isDoctor ? [{ path: '/my-earnings', icon: Wallet, label: 'My Earnings' }] : []),
        { path: '/billing', icon: Receipt, label: 'Billing' },
        { path: '/ipd-billing', icon: Receipt, label: 'IPD Billing' },
        { path: '/tpa', icon: ShieldCheck, label: 'TPA/Insurance' },
        // India national health insurance — Ayushman Bharat claims.
        { path: '/pmjay', icon: ShieldCheck, label: 'PMJAY claims' },
      ]
    },
    {
      title: 'Operations',
      items: [
        { path: '/hr', icon: UserCog, label: 'HR' },
        { path: '/inventory', icon: Package, label: 'Inventory' },
        { path: '/housekeeping', icon: ClipboardList, label: 'Housekeeping' },
        { path: '/diet', icon: Utensils, label: 'Diet & Kitchen' },
        { path: '/assets', icon: Wrench, label: 'Assets' },
      ]
    },
    {
      title: 'Admin & Reports',
      items: [
        { path: '/mis-report', icon: BarChart3, label: 'Analytics' },
        { path: '/nabh-dashboard', icon: Star, label: 'NABH Quality' },
        { path: '/hai-surveillance', icon: AlertOctagon, label: 'HAI Surveillance' },
        { path: '/bmw-tracking', icon: Trash2, label: 'BMW Tracking' },
        { path: '/mnm-reviews', icon: Scale, label: 'M&M Reviews' },
        // India statutory registers — PCPNDT (Form-F) and MTP. Live
        // here rather than under "Clinical" because they're
        // government-mandated record-keeping, not patient workflow.
        { path: '/form-f', icon: Scan, label: 'Form-F register' },
        { path: '/mtp-register', icon: AlertCircle, label: 'MTP register' },
        { path: '/quality', icon: Star, label: 'Quality' },
        { path: '/feedback', icon: Star, label: 'Patient Feedback' },
        { path: '/master-data', icon: Settings, label: 'Master Data' },
        { path: '/audit-log', icon: ShieldCheck, label: 'Audit Log' },
        // "Who logged in from where, doing what" — built on AuditLog with
        // session derivation, failed-login dashboard, and per-user timeline.
        // Gated to ADMIN / QUALITY / management roles via rolePermissions.
        { path: '/activity-monitor', icon: Network, label: 'Activity Monitor' },
        { path: '/system-control', icon: ShieldCheck, label: 'System Control' },
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50/60 overflow-hidden">
      {/* Sidebar — refreshed: narrower, tighter typography, subtle active state,
          dark-mode-friendly neutral palette. */}
      <aside
        className={`${
          sidebarOpen ? 'w-60' : 'w-0'
        } bg-white border-r border-slate-200/70 transition-all duration-200 flex flex-col`}
        style={{ flexShrink: 0 }}
      >
        {sidebarOpen && (
          <>
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-semibold text-[15px] text-slate-900 tracking-tight">HospitalPro</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-8 pr-7 py-1.5 text-[13px] border border-slate-200 rounded-lg bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 placeholder:text-slate-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
              {(() => {
                const q = search.trim().toLowerCase();
                const matchesSearch = (item: { label: string; path: string }) =>
                  !q || item.label.toLowerCase().includes(q) || item.path.toLowerCase().includes(q);
                const filteredGroups = menuGroups
                  .map((g) => ({
                    ...g,
                    items: g.items.filter((it) =>
                      hasAccess(it.path.replace(/^\//, '') || '/') && matchesSearch(it),
                    ),
                  }))
                  .filter((g) => g.items.length > 0);

                if (q && filteredGroups.length === 0) {
                  return (
                    <div className="text-center text-xs text-slate-400 py-8">
                      No menu items match "{search}"
                    </div>
                  );
                }
                return filteredGroups.map((group, idx) => (
                  <div key={idx}>
                    <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.08em] mb-1.5 px-2">
                      {group.title}
                    </h3>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const fullPath = item.path === '/' ? '/app' : `/app${item.path}`;
                        const isActive = location.pathname === fullPath;
                        return (
                          <button
                            key={item.path}
                            onClick={() => navigate(fullPath)}
                            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors duration-150 ${
                              isActive
                                ? 'bg-slate-100 text-slate-900 font-medium'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                            <span className="text-[13px] flex-1 text-left truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </nav>
          </>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200/70 px-6 py-3" style={{ flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                >
                  <MenuIcon className="w-4 h-4" />
                </Button>
              )}
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900 tracking-tight">
                  {user?.branch?.name || 'Busitema Referral Hospital'}
                </h2>
                <p className="text-xs text-slate-500">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <RaiseAlarmButton />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="text-left pr-1">
                      <div className="text-[13px] font-medium text-slate-900 leading-tight">{user?.name || 'Admin'}</div>
                      <div className="text-[11px] text-slate-500 leading-tight">
                        {user?.roleIds?.[0] || 'Administrator'}
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white rounded-xl">
                  <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-[13px]">
                    <User className="mr-2 h-3.5 w-3.5" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-[13px]">
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/60">
          <AlertBanner />
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
