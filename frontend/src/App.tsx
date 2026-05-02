import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import Login from './pages/Login';
import NewDashboard from './pages/NewDashboard';
import MainLayout from './components/MainLayout';

// Public marketing website. Lazy-loaded so the portal bundle doesn't pay
// for it. Mounted at /website/* — the operator can add a Vercel rewrite
// to map a public domain (e.g. www.asha-hospital.com) → /website if they
// want clean URLs for the marketing deployment.
const WebsiteLayout = lazy(() => import('./website/WebsiteLayout'));
const WebsiteHome = lazy(() => import('./website/pages/Home'));
const WebsiteAbout = lazy(() => import('./website/pages/About'));
const WebsiteServices = lazy(() => import('./website/pages/Services'));
const WebsiteServiceDetail = lazy(() => import('./website/pages/ServiceDetail'));
const WebsiteDoctors = lazy(() => import('./website/pages/Doctors'));
const WebsiteContact = lazy(() => import('./website/pages/Contact'));

// Each non-landing route is lazy-loaded. Vite/Rollup splits each into its own
// chunk, dropping the initial bundle from ~1.7 MB to ~250 KB. The first time
// you click a sidebar item, that page's chunk fetches; subsequent visits are
// cached. Login and NewDashboard stay eager — they're the entry points.
const PatientRegistration = lazy(() => import('./pages/PatientRegistration'));
const Appointment = lazy(() => import('./pages/Appointment'));
const OPD = lazy(() => import('./pages/OPD'));
const Laboratory = lazy(() => import('./pages/Laboratory'));
const Radiology = lazy(() => import('./pages/Radiology'));
const Inpatient = lazy(() => import('./pages/Inpatient'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const NurseStation = lazy(() => import('./pages/NurseStation'));
const OperationTheatre = lazy(() => import('./pages/OperationTheatre'));
const BloodBank = lazy(() => import('./pages/BloodBank'));
const Pharmacy = lazy(() => import('./pages/Pharmacy'));
const MISReport = lazy(() => import('./pages/MISReport'));
const Emergency = lazy(() => import('./pages/Emergency'));
const ICU = lazy(() => import('./pages/ICU'));
const HR = lazy(() => import('./pages/HR'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Ambulance = lazy(() => import('./pages/Ambulance'));
const Housekeeping = lazy(() => import('./pages/Housekeeping'));
const Diet = lazy(() => import('./pages/Diet'));
const Quality = lazy(() => import('./pages/Quality'));
const ReferralCommission = lazy(() => import('./pages/ReferralCommission'));
const IPDBilling = lazy(() => import('./pages/IPDBilling'));
const TPA = lazy(() => import('./pages/TPA'));
const MasterData = lazy(() => import('./pages/MasterData'));
const SystemControl = lazy(() => import('./pages/SystemControl'));
const LiveDashboard = lazy(() => import('./pages/LiveDashboard'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const AssetManagement = lazy(() => import('./pages/AssetManagement'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Some smaller modules still live in AllModules.tsx — split that into one
// async chunk. Each named import resolves once the chunk loads.
const allModules = () => import('./pages/AllModules');
const HealthCheckup = lazy(() => allModules().then((m) => ({ default: m.HealthCheckup })));
const SoftwareManagement = lazy(() => allModules().then((m) => ({ default: m.SoftwareManagement })));
const Phlebotomy = lazy(() => allModules().then((m) => ({ default: m.Phlebotomy })));
const DoctorAssistant = lazy(() => allModules().then((m) => ({ default: m.DoctorAssistant })));
const StoreManagement = lazy(() => allModules().then((m) => ({ default: m.StoreManagement })));
const OPDClinical = lazy(() => allModules().then((m) => ({ default: m.OPDClinical })));
const Tally = lazy(() => allModules().then((m) => ({ default: m.Tally })));
const MRDManagement = lazy(() => allModules().then((m) => ({ default: m.MRDManagement })));
const DoctorAccounting = lazy(() => allModules().then((m) => ({ default: m.DoctorAccounting })));
const VideoConversation = lazy(() => allModules().then((m) => ({ default: m.VideoConversation })));
const CSSD = lazy(() => allModules().then((m) => ({ default: m.CSSD })));
const EquipmentMaintenance = lazy(() => allModules().then((m) => ({ default: m.EquipmentMaintenance })));
const Physiotherapy = lazy(() => allModules().then((m) => ({ default: m.Physiotherapy })));
const Mortuary = lazy(() => allModules().then((m) => ({ default: m.Mortuary })));
const BiometricAttendance = lazy(() => allModules().then((m) => ({ default: m.BiometricAttendance })));
const DICOMPACS = lazy(() => allModules().then((m) => ({ default: m.DICOMPACS })));
const MedicalDevice = lazy(() => allModules().then((m) => ({ default: m.MedicalDevice })));
const PayrollManagement = lazy(() => allModules().then((m) => ({ default: m.PayrollManagement })));
const Pathology = lazy(() => allModules().then((m) => ({ default: m.Pathology })));
const DoctorRegistration = lazy(() => allModules().then((m) => ({ default: m.DoctorRegistration })));
const InpatientBilling = lazy(() => allModules().then((m) => ({ default: m.InpatientBilling })));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Role-based route protection component
const RoleProtectedRoute = ({ children, path }: { children: React.ReactNode; path: string }) => {
  const { hasAccess } = useAuth();

  if (!hasAccess(path)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-600 text-center max-w-md">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  // Suspense fallback shown while a lazy route's chunk is downloading.
  const RouteSpinner = () => (
    <div className="flex items-center justify-center h-full p-12">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <Routes>
      {/* Public marketing website — root of hospital-vnyb.vercel.app.
          No auth required; the "Sign In" button on every page routes to
          /login (relative on same domain). */}
      <Route
        path="/"
        element={
          <Suspense fallback={<RouteSpinner />}>
            <WebsiteLayout />
          </Suspense>
        }
      >
        <Route index element={<Suspense fallback={<RouteSpinner />}><WebsiteHome /></Suspense>} />
        <Route path="about" element={<Suspense fallback={<RouteSpinner />}><WebsiteAbout /></Suspense>} />
        <Route path="services" element={<Suspense fallback={<RouteSpinner />}><WebsiteServices /></Suspense>} />
        <Route path="services/:slug" element={<Suspense fallback={<RouteSpinner />}><WebsiteServiceDetail /></Suspense>} />
        <Route path="doctors" element={<Suspense fallback={<RouteSpinner />}><WebsiteDoctors /></Suspense>} />
        <Route path="contact" element={<Suspense fallback={<RouteSpinner />}><WebsiteContact /></Suspense>} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route
        path="/forgot-password"
        element={
          <Suspense fallback={<RouteSpinner />}>
            <ForgotPassword />
          </Suspense>
        }
      />
      <Route
        path="/reset-password"
        element={
          <Suspense fallback={<RouteSpinner />}>
            <ResetPassword />
          </Suspense>
        }
      />
      {/* Authenticated portal — every clinical/operational module lives
          under /app/*. Sidebar paths inside MainLayout already use this
          prefix. After login, users are routed to /app. */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Suspense fallback={<RouteSpinner />}>
              <MainLayout />
            </Suspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<NewDashboard />} />
        <Route path="live-dashboard" element={<RoleProtectedRoute path="live-dashboard"><LiveDashboard /></RoleProtectedRoute>} />

        {/* Core Clinical Modules */}
        <Route path="patients" element={<RoleProtectedRoute path="patients"><PatientRegistration /></RoleProtectedRoute>} />
        <Route path="appointment" element={<RoleProtectedRoute path="appointment"><Appointment /></RoleProtectedRoute>} />
        <Route path="opd" element={<RoleProtectedRoute path="opd"><OPD /></RoleProtectedRoute>} />
        <Route path="health-checkup" element={<RoleProtectedRoute path="health-checkup"><HealthCheckup /></RoleProtectedRoute>} />

        {/* Diagnostics */}
        <Route path="laboratory" element={<RoleProtectedRoute path="laboratory"><Laboratory /></RoleProtectedRoute>} />
        <Route path="radiology" element={<RoleProtectedRoute path="radiology"><Radiology /></RoleProtectedRoute>} />
        <Route path="pathology" element={<RoleProtectedRoute path="pathology"><Pathology /></RoleProtectedRoute>} />
        <Route path="phlebotomy" element={<RoleProtectedRoute path="phlebotomy"><Phlebotomy /></RoleProtectedRoute>} />

        {/* Inpatient Care */}
        <Route path="inpatient" element={<RoleProtectedRoute path="inpatient"><Inpatient /></RoleProtectedRoute>} />
        <Route path="inpatient-billing" element={<RoleProtectedRoute path="inpatient-billing"><InpatientBilling /></RoleProtectedRoute>} />
        <Route path="nurse-station" element={<RoleProtectedRoute path="nurse-station"><NurseStation /></RoleProtectedRoute>} />
        <Route path="emergency" element={<RoleProtectedRoute path="emergency"><Emergency /></RoleProtectedRoute>} />
        <Route path="icu" element={<RoleProtectedRoute path="icu"><ICU /></RoleProtectedRoute>} />
        <Route path="operation-theatre" element={<RoleProtectedRoute path="operation-theatre"><OperationTheatre /></RoleProtectedRoute>} />

        {/* Support Services */}
        <Route path="blood-bank" element={<RoleProtectedRoute path="blood-bank"><BloodBank /></RoleProtectedRoute>} />
        <Route path="pharmacy" element={<RoleProtectedRoute path="pharmacy"><Pharmacy /></RoleProtectedRoute>} />
        <Route path="ambulance" element={<RoleProtectedRoute path="ambulance"><Ambulance /></RoleProtectedRoute>} />
        <Route path="housekeeping" element={<RoleProtectedRoute path="housekeeping"><Housekeeping /></RoleProtectedRoute>} />
        <Route path="diet" element={<RoleProtectedRoute path="diet"><Diet /></RoleProtectedRoute>} />
        <Route path="quality" element={<RoleProtectedRoute path="quality"><Quality /></RoleProtectedRoute>} />
        <Route path="cssd" element={<RoleProtectedRoute path="cssd"><CSSD /></RoleProtectedRoute>} />
        <Route path="physiotherapy" element={<RoleProtectedRoute path="physiotherapy"><Physiotherapy /></RoleProtectedRoute>} />
        <Route path="mortuary" element={<RoleProtectedRoute path="mortuary"><Mortuary /></RoleProtectedRoute>} />

        {/* Finance & Billing */}
        <Route path="billing" element={<RoleProtectedRoute path="billing"><BillingPage /></RoleProtectedRoute>} />
        <Route path="ipd-billing" element={<RoleProtectedRoute path="ipd-billing"><IPDBilling /></RoleProtectedRoute>} />
        <Route path="referral-commission" element={<RoleProtectedRoute path="referral-commission"><ReferralCommission /></RoleProtectedRoute>} />
        <Route path="tpa" element={<RoleProtectedRoute path="tpa"><TPA /></RoleProtectedRoute>} />
        <Route path="doctor-accounting" element={<RoleProtectedRoute path="doctor-accounting"><DoctorAccounting /></RoleProtectedRoute>} />
        <Route path="tally" element={<RoleProtectedRoute path="tally"><Tally /></RoleProtectedRoute>} />

        {/* Operations & Management */}
        <Route path="inventory" element={<RoleProtectedRoute path="inventory"><Inventory /></RoleProtectedRoute>} />
        <Route path="store-management" element={<RoleProtectedRoute path="store-management"><StoreManagement /></RoleProtectedRoute>} />
        <Route path="asset-management" element={<RoleProtectedRoute path="asset-management"><AssetManagement /></RoleProtectedRoute>} />
        {/* Sidebar links to /assets — keep this as an alias to AssetManagement so the sidebar works. */}
        <Route path="assets" element={<RoleProtectedRoute path="assets"><AssetManagement /></RoleProtectedRoute>} />
        <Route path="equipment-maintenance" element={<RoleProtectedRoute path="equipment-maintenance"><EquipmentMaintenance /></RoleProtectedRoute>} />
        <Route path="medical-device" element={<RoleProtectedRoute path="medical-device"><MedicalDevice /></RoleProtectedRoute>} />

        {/* Clinical Support */}
        <Route path="opd-clinical" element={<RoleProtectedRoute path="opd-clinical"><OPDClinical /></RoleProtectedRoute>} />
        <Route path="doctor-assistant" element={<RoleProtectedRoute path="doctor-assistant"><DoctorAssistant /></RoleProtectedRoute>} />
        <Route path="mrd-management" element={<RoleProtectedRoute path="mrd-management"><MRDManagement /></RoleProtectedRoute>} />

        {/* Technology Integration */}
        <Route path="video-conversation" element={<RoleProtectedRoute path="video-conversation"><VideoConversation /></RoleProtectedRoute>} />
        <Route path="dicom-pacs" element={<RoleProtectedRoute path="dicom-pacs"><DICOMPACS /></RoleProtectedRoute>} />

        {/* HR & Administration */}
        <Route path="hr" element={<RoleProtectedRoute path="hr"><HR /></RoleProtectedRoute>} />
        <Route path="payroll" element={<RoleProtectedRoute path="payroll"><PayrollManagement /></RoleProtectedRoute>} />
        <Route path="biometric-attendance" element={<RoleProtectedRoute path="biometric-attendance"><BiometricAttendance /></RoleProtectedRoute>} />
        <Route path="doctor-registration" element={<RoleProtectedRoute path="doctor-registration"><DoctorRegistration /></RoleProtectedRoute>} />

        {/* System & Reports */}
        <Route path="mis-report" element={<RoleProtectedRoute path="mis-report"><MISReport /></RoleProtectedRoute>} />
        <Route path="master-data" element={<RoleProtectedRoute path="master-data"><MasterData /></RoleProtectedRoute>} />
        <Route path="software-management" element={<RoleProtectedRoute path="software-management"><SoftwareManagement /></RoleProtectedRoute>} />
        <Route path="system-control" element={<RoleProtectedRoute path="system-control"><SystemControl /></RoleProtectedRoute>} />
        <Route path="audit-log" element={<RoleProtectedRoute path="audit-log"><AuditLog /></RoleProtectedRoute>} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
