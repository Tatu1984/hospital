import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

// Import all remaining modules from AllModules
import {
  HealthCheckup,
  SoftwareManagement,
  SystemControl,
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
        <Route path="patients" element={<PatientRegistration />} />
        <Route path="appointment" element={<Appointment />} />
        <Route path="opd" element={<OPD />} />
        <Route path="health-checkup" element={<HealthCheckup />} />

        {/* Diagnostics */}
        <Route path="laboratory" element={<Laboratory />} />
        <Route path="radiology" element={<Radiology />} />
        <Route path="pathology" element={<Pathology />} />
        <Route path="phlebotomy" element={<Phlebotomy />} />

        {/* Inpatient Care */}
        <Route path="inpatient" element={<Inpatient />} />
        <Route path="inpatient-billing" element={<InpatientBilling />} />
        <Route path="nurse-station" element={<NurseStation />} />
        <Route path="emergency" element={<Emergency />} />
        <Route path="icu" element={<ICU />} />
        <Route path="operation-theatre" element={<OperationTheatre />} />

        {/* Support Services */}
        <Route path="blood-bank" element={<BloodBank />} />
        <Route path="pharmacy" element={<Pharmacy />} />
        <Route path="ambulance" element={<Ambulance />} />
        <Route path="housekeeping" element={<Housekeeping />} />
        <Route path="diet" element={<Diet />} />
        <Route path="quality" element={<Quality />} />
        <Route path="cssd" element={<CSSD />} />
        <Route path="physiotherapy" element={<Physiotherapy />} />
        <Route path="mortuary" element={<Mortuary />} />

        {/* Finance & Billing */}
        <Route path="billing" element={<BillingPage />} />
        <Route path="doctor-accounting" element={<DoctorAccounting />} />
        <Route path="tally" element={<Tally />} />

        {/* Operations & Management */}
        <Route path="inventory" element={<Inventory />} />
        <Route path="store-management" element={<StoreManagement />} />
        <Route path="asset-management" element={<AssetManagement />} />
        <Route path="equipment-maintenance" element={<EquipmentMaintenance />} />
        <Route path="medical-device" element={<MedicalDevice />} />

        {/* Clinical Support */}
        <Route path="opd-clinical" element={<OPDClinical />} />
        <Route path="doctor-assistant" element={<DoctorAssistant />} />
        <Route path="mrd-management" element={<MRDManagement />} />

        {/* Technology Integration */}
        <Route path="video-conversation" element={<VideoConversation />} />
        <Route path="dicom-pacs" element={<DICOMPACS />} />

        {/* HR & Administration */}
        <Route path="hr" element={<HR />} />
        <Route path="payroll" element={<PayrollManagement />} />
        <Route path="biometric-attendance" element={<BiometricAttendance />} />
        <Route path="doctor-registration" element={<DoctorRegistration />} />

        {/* System & Reports */}
        <Route path="mis-report" element={<MISReport />} />
        <Route path="software-management" element={<SoftwareManagement />} />
        <Route path="system-control" element={<SystemControl />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
