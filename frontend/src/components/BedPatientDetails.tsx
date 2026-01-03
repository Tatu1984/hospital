import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User, Droplets, AlertTriangle, Heart,
  Activity, Pill, FileText, FlaskConical, Stethoscope,
  Thermometer, Wind, Brain, TrendingUp, TrendingDown, Minus,
  Printer, Download, RefreshCw, Syringe, ClipboardList,
  Bed, UserCircle, Shield, AlertCircle, Eye, Sparkles
} from 'lucide-react';

// Comprehensive interfaces for patient data
interface PatientDemographics {
  id: string;
  uhid: string;
  name: string;
  age: number;
  gender: string;
  dob: string;
  bloodGroup: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  emergencyContact: string;
  emergencyPhone: string;
  photo?: string;
  idProof?: string;
  idNumber?: string;
}

interface AdmissionDetails {
  admissionId: string;
  admissionDate: string;
  admissionType: 'Elective' | 'Emergency' | 'Transfer';
  admittingDoctor: string;
  primaryDoctor: string;
  consultingDoctors: string[];
  department: string;
  ward: string;
  bed: string;
  roomType: string;
  expectedLOS: number;
  actualLOS: number;
  chiefComplaint: string;
  provisionalDiagnosis: string[];
  finalDiagnosis?: string[];
  mlcCase: boolean;
  mlcNumber?: string;
}

interface Insurance {
  provider: string;
  policyNumber: string;
  validUntil: string;
  preAuthAmount?: number;
  preAuthStatus?: string;
  copay?: number;
}

interface Allergy {
  id: string;
  allergen: string;
  type: 'Drug' | 'Food' | 'Environmental' | 'Other';
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Life-threatening';
  reaction: string;
  recordedDate: string;
}

interface VitalSign {
  id: string;
  timestamp: string;
  temperature: number;
  pulse: number;
  bp: string;
  spo2: number;
  respiratoryRate: number;
  bloodSugar?: number;
  painScore?: number;
  gcs?: number;
  recordedBy: string;
}

interface Prescription {
  id: string;
  medicationName: string;
  genericName: string;
  dosage: string;
  route: 'Oral' | 'IV' | 'IM' | 'SC' | 'Topical' | 'Inhalation' | 'Sublingual';
  frequency: string;
  duration: string;
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Completed' | 'Discontinued' | 'On Hold';
  prescribedBy: string;
  instructions?: string;
  lastAdministered?: string;
  nextDue?: string;
}

interface MedicationAdministration {
  id: string;
  medicationName: string;
  dosage: string;
  route: string;
  scheduledTime: string;
  administeredTime?: string;
  administeredBy?: string;
  status: 'Pending' | 'Given' | 'Missed' | 'Held' | 'Refused';
  notes?: string;
}

interface LabReport {
  id: string;
  testName: string;
  category: string;
  orderedDate: string;
  reportDate?: string;
  status: 'Ordered' | 'Sample Collected' | 'Processing' | 'Completed';
  results?: {
    parameter: string;
    value: string;
    unit: string;
    normalRange: string;
    flag?: 'High' | 'Low' | 'Critical';
  }[];
  interpretation?: string;
  orderedBy: string;
}

interface RadiologyReport {
  id: string;
  modality: string;
  study: string;
  orderedDate: string;
  reportDate?: string;
  status: 'Ordered' | 'Scheduled' | 'In Progress' | 'Completed';
  findings?: string;
  impression?: string;
  radiologist?: string;
  images?: string[];
}

interface Procedure {
  id: string;
  name: string;
  type: string;
  date: string;
  performedBy: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  complications?: string;
}

interface NursingNote {
  id: string;
  timestamp: string;
  note: string;
  category: 'Assessment' | 'Intervention' | 'Evaluation' | 'General';
  writtenBy: string;
}

interface DoctorNote {
  id: string;
  timestamp: string;
  note: string;
  type: 'Progress' | 'Consultation' | 'Procedure' | 'Discharge Summary';
  writtenBy: string;
}

interface BedPatientDetailsProps {
  open: boolean;
  onClose: () => void;
  bedId: string;
  patientId: string;
  admissionId: string;
  onRefresh?: () => void;
}

export default function BedPatientDetails({
  open,
  onClose,
  bedId,
  patientId,
  admissionId,
  onRefresh
}: BedPatientDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data - in production, fetch from API
  const [patient] = useState<PatientDemographics>({
    id: patientId,
    uhid: 'UHID-2024-001234',
    name: 'Rajesh Kumar Sharma',
    age: 58,
    gender: 'Male',
    dob: '1966-05-15',
    bloodGroup: 'B+',
    phone: '+91 98765 43210',
    email: 'rajesh.sharma@email.com',
    address: '42, Green Park Extension',
    city: 'New Delhi',
    state: 'Delhi',
    emergencyContact: 'Sunita Sharma (Wife)',
    emergencyPhone: '+91 98765 43211'
  });

  const [admission] = useState<AdmissionDetails>({
    admissionId: admissionId,
    admissionDate: '2024-01-12T14:30:00',
    admissionType: 'Emergency',
    admittingDoctor: 'Dr. Priya Mehta',
    primaryDoctor: 'Dr. Rajesh Verma',
    consultingDoctors: ['Dr. Amit Shah (Cardio)', 'Dr. Neha Gupta (Pulmo)'],
    department: 'Internal Medicine',
    ward: 'ICU',
    bed: bedId,
    roomType: 'ICU Bed',
    expectedLOS: 7,
    actualLOS: 3,
    chiefComplaint: 'Severe chest pain, shortness of breath, sweating',
    provisionalDiagnosis: ['Acute Myocardial Infarction', 'Hypertensive Crisis'],
    mlcCase: false
  });

  const [insurance] = useState<Insurance>({
    provider: 'ICICI Lombard',
    policyNumber: 'POL-2023-789456',
    validUntil: '2025-03-15',
    preAuthAmount: 500000,
    preAuthStatus: 'Approved',
    copay: 10
  });

  const [allergies] = useState<Allergy[]>([
    {
      id: 'A1',
      allergen: 'Penicillin',
      type: 'Drug',
      severity: 'Severe',
      reaction: 'Anaphylaxis, skin rash',
      recordedDate: '2020-03-15'
    },
    {
      id: 'A2',
      allergen: 'Sulfa drugs',
      type: 'Drug',
      severity: 'Moderate',
      reaction: 'Hives, itching',
      recordedDate: '2018-07-22'
    }
  ]);

  const [vitals] = useState<VitalSign[]>([
    {
      id: 'V1',
      timestamp: '2024-01-15T10:00:00',
      temperature: 98.6,
      pulse: 82,
      bp: '138/88',
      spo2: 96,
      respiratoryRate: 18,
      bloodSugar: 145,
      painScore: 3,
      gcs: 15,
      recordedBy: 'Nurse Priya'
    },
    {
      id: 'V2',
      timestamp: '2024-01-15T06:00:00',
      temperature: 99.1,
      pulse: 88,
      bp: '142/92',
      spo2: 94,
      respiratoryRate: 20,
      bloodSugar: 168,
      painScore: 5,
      gcs: 15,
      recordedBy: 'Nurse Amit'
    },
    {
      id: 'V3',
      timestamp: '2024-01-15T02:00:00',
      temperature: 99.8,
      pulse: 96,
      bp: '156/98',
      spo2: 92,
      respiratoryRate: 22,
      bloodSugar: 189,
      painScore: 7,
      gcs: 14,
      recordedBy: 'Nurse Deepa'
    }
  ]);

  const [prescriptions] = useState<Prescription[]>([
    {
      id: 'RX1',
      medicationName: 'Aspirin',
      genericName: 'Acetylsalicylic Acid',
      dosage: '75mg',
      route: 'Oral',
      frequency: 'Once daily',
      duration: 'Lifelong',
      startDate: '2024-01-12',
      status: 'Active',
      prescribedBy: 'Dr. Rajesh Verma',
      lastAdministered: '2024-01-15T08:00:00',
      nextDue: '2024-01-16T08:00:00'
    },
    {
      id: 'RX2',
      medicationName: 'Clopidogrel',
      genericName: 'Clopidogrel Bisulfate',
      dosage: '75mg',
      route: 'Oral',
      frequency: 'Once daily',
      duration: '12 months',
      startDate: '2024-01-12',
      status: 'Active',
      prescribedBy: 'Dr. Rajesh Verma',
      lastAdministered: '2024-01-15T08:00:00',
      nextDue: '2024-01-16T08:00:00'
    },
    {
      id: 'RX3',
      medicationName: 'Atorvastatin',
      genericName: 'Atorvastatin Calcium',
      dosage: '40mg',
      route: 'Oral',
      frequency: 'Once daily at bedtime',
      duration: 'Lifelong',
      startDate: '2024-01-12',
      status: 'Active',
      prescribedBy: 'Dr. Rajesh Verma',
      lastAdministered: '2024-01-14T22:00:00',
      nextDue: '2024-01-15T22:00:00'
    },
    {
      id: 'RX4',
      medicationName: 'Metoprolol',
      genericName: 'Metoprolol Succinate',
      dosage: '50mg',
      route: 'Oral',
      frequency: 'Twice daily',
      duration: 'Ongoing',
      startDate: '2024-01-12',
      status: 'Active',
      prescribedBy: 'Dr. Rajesh Verma',
      lastAdministered: '2024-01-15T08:00:00',
      nextDue: '2024-01-15T20:00:00'
    },
    {
      id: 'RX5',
      medicationName: 'Heparin',
      genericName: 'Heparin Sodium',
      dosage: '5000 IU',
      route: 'SC',
      frequency: 'Every 12 hours',
      duration: '5 days',
      startDate: '2024-01-12',
      endDate: '2024-01-17',
      status: 'Active',
      prescribedBy: 'Dr. Rajesh Verma',
      instructions: 'Monitor for bleeding',
      lastAdministered: '2024-01-15T08:00:00',
      nextDue: '2024-01-15T20:00:00'
    },
    {
      id: 'RX6',
      medicationName: 'Nitroglycerin',
      genericName: 'Glyceryl Trinitrate',
      dosage: '5mg',
      route: 'IV',
      frequency: 'Continuous infusion',
      duration: 'PRN',
      startDate: '2024-01-12',
      status: 'Discontinued',
      prescribedBy: 'Dr. Rajesh Verma',
      instructions: 'Titrate to BP'
    }
  ]);

  const [medicationSchedule] = useState<MedicationAdministration[]>([
    { id: 'MA1', medicationName: 'Aspirin 75mg', dosage: '75mg', route: 'Oral', scheduledTime: '08:00', administeredTime: '08:05', administeredBy: 'Nurse Priya', status: 'Given' },
    { id: 'MA2', medicationName: 'Clopidogrel 75mg', dosage: '75mg', route: 'Oral', scheduledTime: '08:00', administeredTime: '08:05', administeredBy: 'Nurse Priya', status: 'Given' },
    { id: 'MA3', medicationName: 'Metoprolol 50mg', dosage: '50mg', route: 'Oral', scheduledTime: '08:00', administeredTime: '08:10', administeredBy: 'Nurse Priya', status: 'Given' },
    { id: 'MA4', medicationName: 'Heparin 5000 IU', dosage: '5000 IU', route: 'SC', scheduledTime: '08:00', administeredTime: '08:15', administeredBy: 'Nurse Priya', status: 'Given' },
    { id: 'MA5', medicationName: 'Metoprolol 50mg', dosage: '50mg', route: 'Oral', scheduledTime: '20:00', status: 'Pending' },
    { id: 'MA6', medicationName: 'Heparin 5000 IU', dosage: '5000 IU', route: 'SC', scheduledTime: '20:00', status: 'Pending' },
    { id: 'MA7', medicationName: 'Atorvastatin 40mg', dosage: '40mg', route: 'Oral', scheduledTime: '22:00', status: 'Pending' }
  ]);

  const [labReports] = useState<LabReport[]>([
    {
      id: 'LR1',
      testName: 'Troponin I',
      category: 'Cardiac Markers',
      orderedDate: '2024-01-12T15:00:00',
      reportDate: '2024-01-12T16:30:00',
      status: 'Completed',
      results: [
        { parameter: 'Troponin I', value: '2.8', unit: 'ng/mL', normalRange: '<0.04', flag: 'Critical' }
      ],
      interpretation: 'Significantly elevated, consistent with myocardial injury',
      orderedBy: 'Dr. Priya Mehta'
    },
    {
      id: 'LR2',
      testName: 'Complete Blood Count',
      category: 'Hematology',
      orderedDate: '2024-01-12T15:00:00',
      reportDate: '2024-01-12T17:00:00',
      status: 'Completed',
      results: [
        { parameter: 'Hemoglobin', value: '12.8', unit: 'g/dL', normalRange: '13-17' },
        { parameter: 'WBC', value: '11.2', unit: 'x10^9/L', normalRange: '4-11', flag: 'High' },
        { parameter: 'Platelets', value: '245', unit: 'x10^9/L', normalRange: '150-400' }
      ],
      orderedBy: 'Dr. Priya Mehta'
    },
    {
      id: 'LR3',
      testName: 'Lipid Profile',
      category: 'Biochemistry',
      orderedDate: '2024-01-13T06:00:00',
      reportDate: '2024-01-13T10:00:00',
      status: 'Completed',
      results: [
        { parameter: 'Total Cholesterol', value: '248', unit: 'mg/dL', normalRange: '<200', flag: 'High' },
        { parameter: 'LDL', value: '168', unit: 'mg/dL', normalRange: '<100', flag: 'High' },
        { parameter: 'HDL', value: '38', unit: 'mg/dL', normalRange: '>40', flag: 'Low' },
        { parameter: 'Triglycerides', value: '210', unit: 'mg/dL', normalRange: '<150', flag: 'High' }
      ],
      orderedBy: 'Dr. Rajesh Verma'
    },
    {
      id: 'LR4',
      testName: 'Renal Function Test',
      category: 'Biochemistry',
      orderedDate: '2024-01-15T06:00:00',
      status: 'Processing',
      orderedBy: 'Dr. Rajesh Verma'
    }
  ]);

  const [radiologyReports] = useState<RadiologyReport[]>([
    {
      id: 'RD1',
      modality: 'ECG',
      study: '12-Lead ECG',
      orderedDate: '2024-01-12T14:45:00',
      reportDate: '2024-01-12T15:00:00',
      status: 'Completed',
      findings: 'ST elevation in leads V1-V4, reciprocal ST depression in inferior leads',
      impression: 'Acute anterior wall STEMI',
      radiologist: 'Dr. Amit Shah'
    },
    {
      id: 'RD2',
      modality: 'ECHO',
      study: '2D Echocardiography',
      orderedDate: '2024-01-13T09:00:00',
      reportDate: '2024-01-13T10:30:00',
      status: 'Completed',
      findings: 'Hypokinesia of anterior wall and apex. LVEF 40%. Mild MR.',
      impression: 'Regional wall motion abnormality consistent with anterior MI. Moderate LV dysfunction.',
      radiologist: 'Dr. Amit Shah'
    },
    {
      id: 'RD3',
      modality: 'X-Ray',
      study: 'Chest X-Ray PA View',
      orderedDate: '2024-01-12T15:30:00',
      reportDate: '2024-01-12T16:00:00',
      status: 'Completed',
      findings: 'Mild pulmonary congestion. Heart size at upper limits of normal.',
      impression: 'Early pulmonary edema. Cardiomegaly borderline.',
      radiologist: 'Dr. Neha Gupta'
    }
  ]);

  const [procedures] = useState<Procedure[]>([
    {
      id: 'PR1',
      name: 'Primary PCI',
      type: 'Cardiac Intervention',
      date: '2024-01-12T16:00:00',
      performedBy: 'Dr. Amit Shah',
      status: 'Completed',
      notes: 'Successful PCI to LAD with DES placement. TIMI 3 flow achieved.',
      complications: 'None'
    },
    {
      id: 'PR2',
      name: 'Central Line Insertion',
      type: 'Vascular Access',
      date: '2024-01-12T15:30:00',
      performedBy: 'Dr. Priya Mehta',
      status: 'Completed',
      notes: 'Right IJV access. 7F triple lumen catheter.'
    }
  ]);

  const [nursingNotes] = useState<NursingNote[]>([
    { id: 'NN1', timestamp: '2024-01-15T10:15:00', note: 'Patient comfortable. Vitals stable. Pain score reduced to 3/10. Ambulated to chair with assistance.', category: 'Assessment', writtenBy: 'Nurse Priya' },
    { id: 'NN2', timestamp: '2024-01-15T06:30:00', note: 'Morning care provided. Patient reports mild chest discomfort. PRN Sorbitrate given. Pain relieved after 15 mins.', category: 'Intervention', writtenBy: 'Nurse Amit' },
    { id: 'NN3', timestamp: '2024-01-14T22:00:00', note: 'Night shift handover. Patient sleeping well. No episodes of chest pain. Continuous ECG monitoring ongoing.', category: 'General', writtenBy: 'Nurse Deepa' }
  ]);

  const [doctorNotes] = useState<DoctorNote[]>([
    { id: 'DN1', timestamp: '2024-01-15T09:00:00', note: 'Day 3 post-MI. Patient hemodynamically stable. Chest pain resolved. ECHO shows improving LV function. Plan: Continue dual antiplatelet therapy. Step down to ward if stable for next 24 hours.', type: 'Progress', writtenBy: 'Dr. Rajesh Verma' },
    { id: 'DN2', timestamp: '2024-01-14T09:00:00', note: 'Day 2 post-MI. Post-PCI recovery uneventful. Starting cardiac rehabilitation. Dietitian consult for low sodium, low fat diet.', type: 'Progress', writtenBy: 'Dr. Rajesh Verma' },
    { id: 'DN3', timestamp: '2024-01-13T14:00:00', note: 'Cardiology consultation. Recommend intensive statin therapy. Target LDL <70. Continue anticoagulation for 48 hours then switch to oral. Repeat ECHO in 6 weeks.', type: 'Consultation', writtenBy: 'Dr. Amit Shah' }
  ]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      // Simulate API fetch
      setTimeout(() => setLoading(false), 500);
    }
  }, [open, patientId, admissionId]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      onRefresh?.();
    }, 1000);
  };

  const getVitalTrend = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getMedicationStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Given': 'bg-green-100 text-green-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Missed': 'bg-red-100 text-red-800',
      'Held': 'bg-orange-100 text-orange-800',
      'Refused': 'bg-gray-100 text-gray-800'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const getLabFlagBadge = (flag?: string) => {
    if (!flag) return null;
    const styles: Record<string, string> = {
      'High': 'bg-red-100 text-red-800',
      'Low': 'bg-blue-100 text-blue-800',
      'Critical': 'bg-red-500 text-white animate-pulse'
    };
    return <Badge className={styles[flag]}>{flag}</Badge>;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b">
          <DialogHeader className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    {patient.name}
                    <Badge variant="outline" className="ml-2">{patient.bloodGroup}</Badge>
                    {allergies.length > 0 && (
                      <Badge className="bg-red-500 text-white animate-pulse">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        ALLERGIES
                      </Badge>
                    )}
                  </DialogTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span>{patient.age}y / {patient.gender}</span>
                    <span>UHID: {patient.uhid}</span>
                    <span>Bed: {admission.bed}</span>
                    <Badge className={admission.admissionType === 'Emergency' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                      {admission.admissionType}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Admitted: {new Date(admission.admissionDate).toLocaleString()} | LOS: Day {admission.actualLOS}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-1" />
                  Print
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Stats Bar */}
          <div className="px-4 pb-3 flex gap-4 overflow-x-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg min-w-fit">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="font-semibold">{vitals[0]?.pulse}</span>
              <span className="text-xs text-gray-500">bpm</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg min-w-fit">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="font-semibold">{vitals[0]?.bp}</span>
              <span className="text-xs text-gray-500">mmHg</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg min-w-fit">
              <Wind className="h-4 w-4 text-green-500" />
              <span className="font-semibold">{vitals[0]?.spo2}%</span>
              <span className="text-xs text-gray-500">SpO2</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg min-w-fit">
              <Thermometer className="h-4 w-4 text-orange-500" />
              <span className="font-semibold">{vitals[0]?.temperature}°F</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg min-w-fit">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="font-semibold">GCS {vitals[0]?.gcs}/15</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 rounded-lg min-w-fit">
              <Droplets className="h-4 w-4 text-yellow-600" />
              <span className="font-semibold">{vitals[0]?.bloodSugar}</span>
              <span className="text-xs text-gray-500">mg/dL</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(90vh-180px)] overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
            <TabsList className="grid grid-cols-8 w-full mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="vitals">Vitals</TabsTrigger>
              <TabsTrigger value="medications">Medications</TabsTrigger>
              <TabsTrigger value="labs">Lab Reports</TabsTrigger>
              <TabsTrigger value="radiology">Imaging</TabsTrigger>
              <TabsTrigger value="procedures">Procedures</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="ai">
                <Sparkles className="h-4 w-4 mr-1" />
                AI Insights
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {/* Patient Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <UserCircle className="h-4 w-4" />
                      Patient Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date of Birth</span>
                      <span>{new Date(patient.dob).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone</span>
                      <span>{patient.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Address</span>
                      <span className="text-right">{patient.city}, {patient.state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Emergency Contact</span>
                      <span className="text-right">{patient.emergencyContact}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Admission Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Bed className="h-4 w-4" />
                      Admission Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Admission ID</span>
                      <span>{admission.admissionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Primary Doctor</span>
                      <span>{admission.primaryDoctor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ward/Bed</span>
                      <span>{admission.ward} - {admission.bed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Expected LOS</span>
                      <span>{admission.expectedLOS} days</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Insurance */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Insurance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Provider</span>
                      <span>{insurance.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Policy #</span>
                      <span>{insurance.policyNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pre-Auth</span>
                      <Badge className="bg-green-100 text-green-800">{insurance.preAuthStatus}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount</span>
                      <span>₹{insurance.preAuthAmount?.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Allergies Warning */}
              {allergies.length > 0 && (
                <Card className="border-red-300 bg-red-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      Known Allergies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {allergies.map(allergy => (
                        <div key={allergy.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-red-200">
                          <Badge className={allergy.severity === 'Severe' || allergy.severity === 'Life-threatening' ? 'bg-red-500' : 'bg-orange-500'}>
                            {allergy.severity}
                          </Badge>
                          <span className="font-medium">{allergy.allergen}</span>
                          <span className="text-sm text-gray-500">({allergy.type})</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Diagnosis */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Diagnosis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Chief Complaint</p>
                      <p>{admission.chiefComplaint}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Provisional Diagnosis</p>
                      <div className="flex flex-wrap gap-2">
                        {admission.provisionalDiagnosis.map((dx, idx) => (
                          <Badge key={idx} variant="outline">{dx}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Consulting Doctors</p>
                      <div className="flex flex-wrap gap-2">
                        {admission.consultingDoctors.map((doc, idx) => (
                          <Badge key={idx} className="bg-blue-50 text-blue-700">{doc}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Medications Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Active Medications ({prescriptions.filter(p => p.status === 'Active').length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {prescriptions.filter(p => p.status === 'Active').slice(0, 6).map(rx => (
                      <div key={rx.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-sm">{rx.medicationName}</p>
                          <p className="text-xs text-gray-500">{rx.dosage} - {rx.frequency}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{rx.route}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vitals Tab */}
            <TabsContent value="vitals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Vital Signs History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Temp</th>
                        <th className="text-left p-2">Pulse</th>
                        <th className="text-left p-2">BP</th>
                        <th className="text-left p-2">SpO2</th>
                        <th className="text-left p-2">RR</th>
                        <th className="text-left p-2">Sugar</th>
                        <th className="text-left p-2">Pain</th>
                        <th className="text-left p-2">GCS</th>
                        <th className="text-left p-2">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vitals.map((v, idx) => (
                        <tr key={v.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-sm">
                            {new Date(v.timestamp).toLocaleString()}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              {v.temperature}°F
                              {idx < vitals.length - 1 && getVitalTrend(v.temperature, vitals[idx + 1].temperature)}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              {v.pulse}
                              {idx < vitals.length - 1 && getVitalTrend(v.pulse, vitals[idx + 1].pulse)}
                            </div>
                          </td>
                          <td className="p-2">{v.bp}</td>
                          <td className="p-2">
                            <span className={v.spo2 < 94 ? 'text-red-600 font-bold' : ''}>{v.spo2}%</span>
                          </td>
                          <td className="p-2">{v.respiratoryRate}</td>
                          <td className="p-2">{v.bloodSugar || '-'}</td>
                          <td className="p-2">{v.painScore}/10</td>
                          <td className="p-2">{v.gcs}/15</td>
                          <td className="p-2 text-sm text-gray-500">{v.recordedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Medications Tab */}
            <TabsContent value="medications" className="space-y-4">
              {/* Current Prescriptions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Current Prescriptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-2">Medication</th>
                        <th className="text-left p-2">Dosage</th>
                        <th className="text-left p-2">Route</th>
                        <th className="text-left p-2">Frequency</th>
                        <th className="text-left p-2">Duration</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Next Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map(rx => (
                        <tr key={rx.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{rx.medicationName}</p>
                              <p className="text-xs text-gray-500">{rx.genericName}</p>
                            </div>
                          </td>
                          <td className="p-2">{rx.dosage}</td>
                          <td className="p-2"><Badge variant="outline">{rx.route}</Badge></td>
                          <td className="p-2">{rx.frequency}</td>
                          <td className="p-2">{rx.duration}</td>
                          <td className="p-2">
                            <Badge className={rx.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {rx.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm">
                            {rx.nextDue ? new Date(rx.nextDue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Medication Administration Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Syringe className="h-5 w-5" />
                    Today's Administration Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-2">Scheduled</th>
                        <th className="text-left p-2">Medication</th>
                        <th className="text-left p-2">Dosage</th>
                        <th className="text-left p-2">Route</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Given At</th>
                        <th className="text-left p-2">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicationSchedule.map(ma => (
                        <tr key={ma.id} className={`border-b hover:bg-gray-50 ${ma.status === 'Pending' ? 'bg-yellow-50' : ''}`}>
                          <td className="p-2 font-medium">{ma.scheduledTime}</td>
                          <td className="p-2">{ma.medicationName}</td>
                          <td className="p-2">{ma.dosage}</td>
                          <td className="p-2">{ma.route}</td>
                          <td className="p-2">{getMedicationStatusBadge(ma.status)}</td>
                          <td className="p-2">{ma.administeredTime || '-'}</td>
                          <td className="p-2 text-sm text-gray-500">{ma.administeredBy || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Lab Reports Tab */}
            <TabsContent value="labs" className="space-y-4">
              {labReports.map(report => (
                <Card key={report.id} className={report.status === 'Processing' ? 'border-yellow-300' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FlaskConical className="h-4 w-4" />
                        {report.testName}
                        <Badge variant="outline">{report.category}</Badge>
                      </CardTitle>
                      <Badge className={
                        report.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        report.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                      }>
                        {report.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      Ordered: {new Date(report.orderedDate).toLocaleString()} by {report.orderedBy}
                      {report.reportDate && ` | Reported: ${new Date(report.reportDate).toLocaleString()}`}
                    </p>
                  </CardHeader>
                  {report.results && (
                    <CardContent>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 text-sm">Parameter</th>
                            <th className="text-left p-2 text-sm">Value</th>
                            <th className="text-left p-2 text-sm">Unit</th>
                            <th className="text-left p-2 text-sm">Normal Range</th>
                            <th className="text-left p-2 text-sm">Flag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.results.map((r, idx) => (
                            <tr key={idx} className={`border-b ${r.flag === 'Critical' ? 'bg-red-50' : r.flag ? 'bg-yellow-50' : ''}`}>
                              <td className="p-2">{r.parameter}</td>
                              <td className="p-2 font-semibold">{r.value}</td>
                              <td className="p-2 text-gray-500">{r.unit}</td>
                              <td className="p-2 text-gray-500">{r.normalRange}</td>
                              <td className="p-2">{getLabFlagBadge(r.flag)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {report.interpretation && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                          <strong>Interpretation:</strong> {report.interpretation}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </TabsContent>

            {/* Radiology Tab */}
            <TabsContent value="radiology" className="space-y-4">
              {radiologyReports.map(report => (
                <Card key={report.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {report.study}
                        <Badge variant="outline">{report.modality}</Badge>
                      </CardTitle>
                      <Badge className="bg-green-100 text-green-800">{report.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(report.orderedDate).toLocaleString()}
                      {report.radiologist && ` | Reported by: ${report.radiologist}`}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {report.findings && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Findings</p>
                        <p className="text-sm">{report.findings}</p>
                      </div>
                    )}
                    {report.impression && (
                      <div className="p-2 bg-blue-50 rounded">
                        <p className="text-xs text-gray-500 mb-1">Impression</p>
                        <p className="text-sm font-medium">{report.impression}</p>
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="mt-3">
                      <Eye className="h-4 w-4 mr-1" />
                      View Images
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Procedures Tab */}
            <TabsContent value="procedures" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Procedures Performed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {procedures.map(proc => (
                      <div key={proc.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{proc.name}</h4>
                            <p className="text-sm text-gray-500">{proc.type}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">{proc.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Date:</span> {new Date(proc.date).toLocaleString()}
                          </div>
                          <div>
                            <span className="text-gray-500">Performed by:</span> {proc.performedBy}
                          </div>
                        </div>
                        {proc.notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            <strong>Notes:</strong> {proc.notes}
                          </div>
                        )}
                        {proc.complications && (
                          <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                            <strong>Complications:</strong> {proc.complications}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Doctor Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Doctor's Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {doctorNotes.map(note => (
                      <div key={note.id} className="border-l-4 border-blue-500 pl-3 py-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>{new Date(note.timestamp).toLocaleString()}</span>
                          <Badge variant="outline">{note.type}</Badge>
                        </div>
                        <p className="text-sm">{note.note}</p>
                        <p className="text-xs text-gray-500 mt-1">- {note.writtenBy}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Nursing Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Nursing Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {nursingNotes.map(note => (
                      <div key={note.id} className="border-l-4 border-pink-500 pl-3 py-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>{new Date(note.timestamp).toLocaleString()}</span>
                          <Badge variant="outline">{note.category}</Badge>
                        </div>
                        <p className="text-sm">{note.note}</p>
                        <p className="text-xs text-gray-500 mt-1">- {note.writtenBy}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="ai" className="space-y-4">
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <Sparkles className="h-5 w-5" />
                    AI-Powered Clinical Insights
                    <Badge className="bg-purple-100 text-purple-800">Coming Soon</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Placeholder for AI features */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg border border-purple-100">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <FlaskConical className="h-4 w-4 text-purple-600" />
                        Lab Report Analysis
                      </h4>
                      <p className="text-sm text-gray-600">
                        AI will analyze lab trends, identify patterns, and flag potential concerns based on historical data.
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-purple-100">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Pill className="h-4 w-4 text-purple-600" />
                        Drug Interaction Alerts
                      </h4>
                      <p className="text-sm text-gray-600">
                        AI-powered detection of potential drug interactions and contraindications.
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-purple-100">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        Treatment Suggestions
                      </h4>
                      <p className="text-sm text-gray-600">
                        Evidence-based treatment recommendations trained on medical literature and protocols.
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-purple-100">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-purple-600" />
                        Risk Prediction
                      </h4>
                      <p className="text-sm text-gray-600">
                        Predictive analytics for deterioration risk, readmission probability, and LOS estimation.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-purple-200">
                    <h4 className="font-semibold mb-3">Current Patient Summary (AI-Generated Preview)</h4>
                    <div className="text-sm space-y-2">
                      <p>
                        <strong>Clinical Status:</strong> 58-year-old male, Day 3 post-anterior STEMI with successful PCI.
                        Hemodynamically stable with improving parameters.
                      </p>
                      <p>
                        <strong>Key Findings:</strong> LVEF 40% (moderate dysfunction), elevated LDL 168 (target &lt;70),
                        controlled blood sugars, pain resolved.
                      </p>
                      <p>
                        <strong>Risk Factors:</strong> Dyslipidemia, possible pre-diabetes (fasting glucose 145-189 range),
                        borderline cardiomegaly.
                      </p>
                      <p className="text-purple-600 font-medium">
                        <strong>AI Recommendation:</strong> Consider intensifying statin therapy (Atorvastatin 80mg),
                        add SGLT2 inhibitor for cardioprotection, schedule HbA1c to assess glycemic status.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
