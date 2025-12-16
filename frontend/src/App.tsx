import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import NewDashboard from './pages/NewDashboard';
import MainLayout from './components/MainLayout';

// Import all module pages
import PatientRegistration from './pages/PatientRegistration';
import Appointment from './pages/Appointment';
import OPD from './pages/OPD';
import Laboratory from './pages/Laboratory';
import Radiology from './pages/Radiology';
import Inpatient from './pages/Inpatient';
import BillingPage from './pages/BillingPage';
import NurseStation from './pages/NurseStation';
import OperationTheatre from './pages/OperationTheatre';
import BloodBank from './pages/BloodBank';
import Pharmacy from './pages/Pharmacy';
import MISReport from './pages/MISReport';
import Emergency from './pages/Emergency';
import ICU from './pages/ICU';
import HR from './pages/HR';
import Inventory from './pages/Inventory';
import Ambulance from './pages/Ambulance';
import Housekeeping from './pages/Housekeeping';
import Diet from './pages/Diet';
import Quality from './pages/Quality';
import ReferralCommission from './pages/ReferralCommission';
import IPDBilling from './pages/IPDBilling';
import TPA from './pages/TPA';
import MasterData from './pages/MasterData';
import SystemControl from './pages/SystemControl';

// Import all remaining modules from AllModules
import {
  HealthCheckup,
  SoftwareManagement,
  Phlebotomy,
  DoctorAssistant,
  StoreManagement,
  OPDClinical,
  Tally,
  MRDManagement,
  DoctorAccounting,
  AssetManagement,
  VideoConversation,
  CSSD,
  EquipmentMaintenance,
  Physiotherapy,
  Mortuary,
  BiometricAttendance,
  DICOMPACS,
  MedicalDevice,
  PayrollManagement,
  Pathology,
  DoctorRegistration,
  InpatientBilling
} from './pages/AllModules';

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
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<NewDashboard />} />

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
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
