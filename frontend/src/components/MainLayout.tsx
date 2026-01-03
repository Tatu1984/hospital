import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './NotificationBell';
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
  ChevronRight,
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
  ChevronDown,
  UserPlus,
  Search,
  CreditCard,
  FileText,
  DollarSign
} from 'lucide-react';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['opd']); // OPD expanded by default
  const { user, logout, hasAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  // OPD Submenu items
  const opdSubItems = [
    { path: '/opd-consultation', icon: Stethoscope, label: 'OPD Consultation' },
    { path: '/opd?tab=registration', icon: UserPlus, label: 'Patient Registration' },
    { path: '/opd?tab=assign-doctor', icon: Calendar, label: 'Assign Doctor' },
    { path: '/opd?tab=search', icon: Search, label: 'Patient Search' },
    { path: '/opd?tab=billing', icon: Receipt, label: 'OPD Billing' },
    { path: '/opd?tab=refund', icon: CreditCard, label: 'Refund' },
    { path: '/opd?tab=tariff', icon: FileText, label: 'Hospital Tariff' },
    { path: '/opd?tab=collection', icon: DollarSign, label: 'Daily Collection Report' },
  ];

  const menuGroups = [
    {
      title: 'Core',
      items: [
        { path: '/', icon: Home, label: 'Dashboard' },
        { path: '/patients', icon: Users, label: 'Front Office' },
        { path: '/appointment', icon: Calendar, label: 'Appointments' },
      ]
    },
    {
      title: 'Clinical',
      items: [
        { path: '/opd', icon: Stethoscope, label: 'OPD', id: 'opd', hasSubmenu: true },
        { path: '/inpatient', icon: Bed, label: 'IPD / Ward' },
        { path: '/emergency', icon: AlertCircle, label: 'Emergency' },
        { path: '/icu', icon: Heart, label: 'ICU' },
        { path: '/hdu', icon: Activity, label: 'HDU' },
        { path: '/operation-theatre', icon: Scissors, label: 'OT' },
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
        { path: '/cssd', icon: Scissors, label: 'CSSD' },
        { path: '/ambulance', icon: Ambulance, label: 'Transport' },
      ]
    },
    {
      title: 'Finance',
      items: [
        { path: '/billing', icon: Receipt, label: 'Billing' },
        { path: '/ipd-billing', icon: Receipt, label: 'IPD Billing' },
        { path: '/tpa', icon: ShieldCheck, label: 'TPA/Insurance' },
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
        { path: '/live-dashboard', icon: Activity, label: 'Live Dashboard' },
        { path: '/mis-report', icon: BarChart3, label: 'Analytics' },
        { path: '/quality', icon: Star, label: 'Quality' },
        { path: '/mrd-management', icon: ClipboardList, label: 'MRD' },
        { path: '/doctor-management', icon: UserCog, label: 'Doctor Management' },
        { path: '/master-data', icon: Settings, label: 'Master Data' },
        { path: '/system-control', icon: ShieldCheck, label: 'System Control' },
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar - Fixed visibility */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-white border-r border-slate-200 transition-all duration-300 flex flex-col shadow-lg`}
        style={{ flexShrink: 0 }}
      >
        {sidebarOpen && (
          <>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="font-bold text-lg text-slate-900">HospitalPro</span>
                  <p className="text-xs text-slate-500">Busitema Referral</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-6 bg-white">
              {menuGroups.map((group, idx) => {
                // Filter items based on user permissions
                const accessibleItems = group.items.filter((item) =>
                  hasAccess(item.path.replace(/^\//, '') || '/')
                );

                // Don't render the group if no accessible items
                if (accessibleItems.length === 0) return null;

                return (
                  <div key={idx}>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
                      {group.title}
                    </h3>
                    <div className="space-y-1">
                      {accessibleItems.map((item: any) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '?');
                        const isExpanded = item.hasSubmenu && expandedMenus.includes(item.id);
                        const isOpdActive = item.id === 'opd' && (location.pathname === '/opd' || location.pathname === '/opd-consultation' || location.search.includes('tab='));

                        if (item.hasSubmenu) {
                          return (
                            <div key={item.path}>
                              <button
                                onClick={() => toggleMenu(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                  isOpdActive
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
                                }`}
                              >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              {isExpanded && (
                                <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-2">
                                  {opdSubItems.map((subItem) => {
                                    const SubIcon = subItem.icon;
                                    const isSubActive = location.pathname + location.search === subItem.path ||
                                      (subItem.path === '/opd-consultation' && location.pathname === '/opd-consultation');
                                    return (
                                      <button
                                        key={subItem.path}
                                        onClick={() => navigate(subItem.path)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                                          isSubActive
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                      >
                                        <SubIcon className="w-4 h-4 flex-shrink-0" />
                                        <span className="flex-1 text-left">{subItem.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
                            }`}
                          >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                            {isActive && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm" style={{ flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="h-9 px-3"
                >
                  <MenuIcon className="w-5 h-5" />
                </Button>
              )}
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {user?.branch?.name || 'Busitema Referral Hospital'}
                </h2>
                <p className="text-sm text-slate-500">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 h-10">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-slate-900">{user?.name || 'Admin'}</div>
                      <div className="text-xs text-slate-500">
                        {user?.roleIds?.[0] || 'Administrator'}
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
