import { useNavigate } from 'react-router-dom';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  }
];

export default function NewDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-white min-h-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Hospital Management System</h1>
        <p className="text-slate-600 text-lg">Comprehensive ERP for Healthcare Excellence</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Card
              key={module.id}
              className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-slate-200 hover:border-blue-400 bg-white overflow-hidden group"
              onClick={() => navigate(module.path)}
            >
              <CardHeader className="pb-4">
                <div className={`w-16 h-16 bg-gradient-to-br ${module.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-lg text-slate-900">{module.title}</CardTitle>
                <CardDescription className="text-sm text-slate-600">{module.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
