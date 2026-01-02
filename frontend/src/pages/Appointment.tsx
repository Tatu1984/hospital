import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Calendar, Plus, Clock, CheckCircle,
  Stethoscope, TestTube, Scan, Heart, Activity, Search,
  FileText, X, RefreshCw
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Appointment {
  id: string;
  patientId: string;
  patient: { id: string; name: string; mrn: string; contact?: string };
  doctor?: { id: string; name: string };
  doctorId?: string;
  department?: string;
  appointmentDate: string;
  appointmentTime: string;
  endTime?: string;
  type: 'consultation' | 'lab' | 'radiology' | 'procedure' | 'health_checkup';
  category?: string;
  status: string;
  priority: string;
  reason?: string;
  notes?: string;
  testIds?: string[];
  testNames?: string[];
  modality?: string;
  preparationInstructions?: string;
  estimatedDuration?: number;
  roomNumber?: string;
  referredBy?: string;
  reportReady?: boolean;
  isPaid?: boolean;
}

interface Patient {
  id: string;
  name: string;
  mrn: string;
  contact?: string;
}

interface Doctor {
  id: string;
  name: string;
  department?: string;
}

// Predefined test lists
const LAB_TESTS = [
  { id: 'cbc', name: 'Complete Blood Count (CBC)', category: 'blood_test', duration: 30 },
  { id: 'lft', name: 'Liver Function Test (LFT)', category: 'blood_test', duration: 45 },
  { id: 'kft', name: 'Kidney Function Test (KFT)', category: 'blood_test', duration: 45 },
  { id: 'lipid', name: 'Lipid Profile', category: 'blood_test', duration: 30 },
  { id: 'thyroid', name: 'Thyroid Profile (T3, T4, TSH)', category: 'blood_test', duration: 60 },
  { id: 'hba1c', name: 'HbA1c (Glycated Hemoglobin)', category: 'blood_test', duration: 30 },
  { id: 'fbs', name: 'Fasting Blood Sugar', category: 'blood_test', duration: 15, preparation: 'Fasting for 8-12 hours required' },
  { id: 'ppbs', name: 'Post Prandial Blood Sugar', category: 'blood_test', duration: 15, preparation: '2 hours after meal' },
  { id: 'urine', name: 'Urine Routine & Microscopy', category: 'urine_test', duration: 30 },
  { id: 'stool', name: 'Stool Routine', category: 'stool_test', duration: 30 },
  { id: 'esr', name: 'ESR (Erythrocyte Sedimentation Rate)', category: 'blood_test', duration: 60 },
  { id: 'crp', name: 'C-Reactive Protein (CRP)', category: 'blood_test', duration: 30 },
  { id: 'hiv', name: 'HIV 1 & 2 Antibody', category: 'blood_test', duration: 30 },
  { id: 'hbsag', name: 'HBsAg (Hepatitis B)', category: 'blood_test', duration: 30 },
  { id: 'dengue', name: 'Dengue NS1 & Antibody', category: 'blood_test', duration: 30 },
  { id: 'malaria', name: 'Malaria Parasite Test', category: 'blood_test', duration: 30 },
  { id: 'covid', name: 'COVID-19 RT-PCR', category: 'swab_test', duration: 120 },
  { id: 'blood_culture', name: 'Blood Culture', category: 'blood_test', duration: 72 * 60 },
  { id: 'urine_culture', name: 'Urine Culture', category: 'urine_test', duration: 48 * 60 },
];

const RADIOLOGY_TESTS = [
  { id: 'xray_chest', name: 'X-Ray Chest PA View', modality: 'X-Ray', duration: 15 },
  { id: 'xray_abdomen', name: 'X-Ray Abdomen', modality: 'X-Ray', duration: 15 },
  { id: 'xray_spine', name: 'X-Ray Spine (Cervical/Thoracic/Lumbar)', modality: 'X-Ray', duration: 20 },
  { id: 'xray_extremity', name: 'X-Ray Extremity', modality: 'X-Ray', duration: 15 },
  { id: 'usg_abdomen', name: 'USG Abdomen & Pelvis', modality: 'Ultrasound', duration: 30, preparation: 'Full bladder required' },
  { id: 'usg_kub', name: 'USG KUB (Kidney, Ureter, Bladder)', modality: 'Ultrasound', duration: 20 },
  { id: 'usg_obstetric', name: 'USG Obstetric', modality: 'Ultrasound', duration: 30 },
  { id: 'echo', name: 'Echocardiography (2D Echo)', modality: 'Ultrasound', duration: 45 },
  { id: 'ct_brain', name: 'CT Scan Brain Plain', modality: 'CT', duration: 30 },
  { id: 'ct_brain_contrast', name: 'CT Scan Brain with Contrast', modality: 'CT', duration: 45, preparation: 'Fasting 4 hours, creatinine check' },
  { id: 'ct_chest', name: 'CT Scan Chest', modality: 'CT', duration: 30 },
  { id: 'ct_abdomen', name: 'CT Scan Abdomen', modality: 'CT', duration: 45 },
  { id: 'hrct_chest', name: 'HRCT Chest', modality: 'CT', duration: 30 },
  { id: 'mri_brain', name: 'MRI Brain', modality: 'MRI', duration: 45 },
  { id: 'mri_spine', name: 'MRI Spine', modality: 'MRI', duration: 60 },
  { id: 'mri_knee', name: 'MRI Knee', modality: 'MRI', duration: 45 },
  { id: 'mammography', name: 'Mammography', modality: 'Mammography', duration: 30 },
];

const PROCEDURE_TESTS = [
  { id: 'ecg', name: 'ECG (12 Lead)', category: 'cardiac', duration: 15 },
  { id: 'stress_test', name: 'Treadmill Stress Test (TMT)', category: 'cardiac', duration: 45, preparation: 'Comfortable clothing, avoid heavy meal' },
  { id: 'holter', name: 'Holter Monitoring (24hr)', category: 'cardiac', duration: 24 * 60 },
  { id: 'abpm', name: 'Ambulatory BP Monitoring', category: 'cardiac', duration: 24 * 60 },
  { id: 'pft', name: 'Pulmonary Function Test (PFT)', category: 'pulmonary', duration: 30 },
  { id: 'eeg', name: 'Electroencephalogram (EEG)', category: 'neuro', duration: 60 },
  { id: 'emg', name: 'Electromyography (EMG)', category: 'neuro', duration: 60 },
  { id: 'ncv', name: 'Nerve Conduction Velocity (NCV)', category: 'neuro', duration: 45 },
  { id: 'audiometry', name: 'Audiometry', category: 'ent', duration: 30 },
  { id: 'tympanometry', name: 'Tympanometry', category: 'ent', duration: 20 },
  { id: 'endoscopy', name: 'Upper GI Endoscopy', category: 'gastro', duration: 30, preparation: 'Fasting 8 hours' },
  { id: 'colonoscopy', name: 'Colonoscopy', category: 'gastro', duration: 45, preparation: 'Bowel preparation required' },
  { id: 'bronchoscopy', name: 'Bronchoscopy', category: 'pulmonary', duration: 45 },
];

const HEALTH_PACKAGES = [
  { id: 'basic', name: 'Basic Health Checkup', tests: ['cbc', 'lft', 'kft', 'lipid', 'fbs', 'urine', 'xray_chest', 'ecg'] },
  { id: 'comprehensive', name: 'Comprehensive Health Checkup', tests: ['cbc', 'lft', 'kft', 'lipid', 'thyroid', 'hba1c', 'fbs', 'urine', 'xray_chest', 'ecg', 'usg_abdomen', 'echo'] },
  { id: 'cardiac', name: 'Cardiac Health Package', tests: ['cbc', 'lipid', 'hba1c', 'ecg', 'echo', 'stress_test'] },
  { id: 'diabetic', name: 'Diabetic Care Package', tests: ['cbc', 'lft', 'kft', 'lipid', 'hba1c', 'fbs', 'ppbs', 'urine', 'ecg'] },
  { id: 'women', name: 'Women\'s Health Package', tests: ['cbc', 'thyroid', 'lipid', 'fbs', 'urine', 'usg_abdomen', 'mammography'] },
  { id: 'executive', name: 'Executive Health Checkup', tests: ['cbc', 'lft', 'kft', 'lipid', 'thyroid', 'hba1c', 'fbs', 'urine', 'xray_chest', 'ecg', 'usg_abdomen', 'echo', 'stress_test', 'pft'] },
];

export default function Appointment() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    department: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '09:00',
    type: 'consultation' as const,
    category: '',
    priority: 'normal',
    reason: '',
    notes: '',
    testIds: [] as string[],
    modality: '',
    preparationInstructions: '',
    estimatedDuration: 30,
    roomNumber: '',
    referredBy: '',
    healthPackage: '',
  });

  const getToken = () => localStorage.getItem('token');

  // Fetch appointments
  const fetchAppointments = async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterStatus) params.append('status', filterStatus);
      if (selectedTab !== 'all') params.append('type', selectedTab);

      const response = await fetch(`${API_BASE}/api/appointments?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch patients
  const fetchPatients = async (search?: string) => {
    try {
      const token = getToken();
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${API_BASE}/api/patients${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPatients(Array.isArray(data) ? data : data.patients || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  // Fetch doctors
  const fetchDoctors = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/doctors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDoctors(data);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchDoctors();
  }, [filterDate, filterStatus, selectedTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientSearch.length >= 2) {
        fetchPatients(patientSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Get selected tests based on type
  const getSelectedTests = () => {
    const allTests = [...LAB_TESTS, ...RADIOLOGY_TESTS, ...PROCEDURE_TESTS];
    return formData.testIds.map(id => allTests.find(t => t.id === id)).filter(Boolean);
  };

  // Calculate total duration
  const calculateDuration = () => {
    const tests = getSelectedTests();
    return tests.reduce((sum, test: any) => sum + (test?.duration || 0), 0);
  };

  // Get preparation instructions
  const getPreparationInstructions = () => {
    const tests = getSelectedTests();
    const preps = tests
      .filter((t: any) => t?.preparation)
      .map((t: any) => `${t.name}: ${t.preparation}`);
    return preps.join('\n');
  };

  // Handle health package selection
  const handleHealthPackageChange = (packageId: string) => {
    const pkg = HEALTH_PACKAGES.find(p => p.id === packageId);
    if (pkg) {
      setFormData(prev => ({
        ...prev,
        healthPackage: packageId,
        testIds: pkg.tests
      }));
    }
  };

  // Create appointment
  const handleSubmit = async () => {
    try {
      const token = getToken();

      // Get test names from IDs
      const allTests = [...LAB_TESTS, ...RADIOLOGY_TESTS, ...PROCEDURE_TESTS];
      const testNames = formData.testIds
        .map(id => allTests.find(t => t.id === id)?.name)
        .filter(Boolean) as string[];

      // Get modality for radiology
      const radiologyTest = RADIOLOGY_TESTS.find(t => formData.testIds.includes(t.id));
      const modality = radiologyTest?.modality || formData.modality;

      const payload = {
        patientId: formData.patientId,
        doctorId: formData.type === 'consultation' ? formData.doctorId : null,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        type: formData.type,
        category: formData.category,
        priority: formData.priority,
        reason: formData.reason,
        notes: formData.notes,
        department: formData.department,
        testIds: formData.testIds,
        testNames,
        modality,
        preparationInstructions: getPreparationInstructions() || formData.preparationInstructions,
        estimatedDuration: calculateDuration() || formData.estimatedDuration,
        roomNumber: formData.roomNumber,
        referredBy: formData.referredBy,
      };

      const response = await fetch(`${API_BASE}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setIsDialogOpen(false);
        fetchAppointments();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      patientId: '',
      doctorId: '',
      department: '',
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: '09:00',
      type: 'consultation',
      category: '',
      priority: 'normal',
      reason: '',
      notes: '',
      testIds: [],
      modality: '',
      preparationInstructions: '',
      estimatedDuration: 30,
      roomNumber: '',
      referredBy: '',
      healthPackage: '',
    });
    setSelectedPatient(null);
    setPatientSearch('');
  };

  // Update appointment status
  const updateStatus = async (id: string, status: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/appointments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  // Cancel appointment
  const cancelAppointment = async (id: string) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      try {
        const token = getToken();
        await fetch(`${API_BASE}/api/appointments/${id}/cancel`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchAppointments();
      } catch (error) {
        console.error('Error cancelling appointment:', error);
      }
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'scheduled': 'bg-blue-100 text-blue-700',
      'confirmed': 'bg-green-100 text-green-700',
      'in_progress': 'bg-yellow-100 text-yellow-700',
      'completed': 'bg-gray-100 text-gray-700',
      'cancelled': 'bg-red-100 text-red-700',
      'no_show': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation': return <Stethoscope className="w-4 h-4" />;
      case 'lab': return <TestTube className="w-4 h-4" />;
      case 'radiology': return <Scan className="w-4 h-4" />;
      case 'procedure': return <Heart className="w-4 h-4" />;
      case 'health_checkup': return <Activity className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'consultation': 'Consultation',
      'lab': 'Lab Test',
      'radiology': 'Radiology',
      'procedure': 'Procedure',
      'health_checkup': 'Health Checkup',
    };
    return labels[type] || type;
  };

  // Stats
  const stats = {
    total: appointments.length,
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    consultation: appointments.filter(a => a.type === 'consultation').length,
    lab: appointments.filter(a => a.type === 'lab').length,
    radiology: appointments.filter(a => a.type === 'radiology').length,
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Appointment Management</h1>
          <p className="text-slate-600">Schedule consultations, lab tests, radiology, and procedures</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
              <DialogDescription>
                Book an appointment for consultation, lab test, radiology, or procedure
              </DialogDescription>
            </DialogHeader>

            <Tabs value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as any, testIds: [], healthPackage: '' }))}>
              <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="consultation" className="gap-1">
                  <Stethoscope className="w-4 h-4" /> Consultation
                </TabsTrigger>
                <TabsTrigger value="lab" className="gap-1">
                  <TestTube className="w-4 h-4" /> Lab Test
                </TabsTrigger>
                <TabsTrigger value="radiology" className="gap-1">
                  <Scan className="w-4 h-4" /> Radiology
                </TabsTrigger>
                <TabsTrigger value="procedure" className="gap-1">
                  <Heart className="w-4 h-4" /> Procedure
                </TabsTrigger>
                <TabsTrigger value="health_checkup" className="gap-1">
                  <Activity className="w-4 h-4" /> Health Checkup
                </TabsTrigger>
              </TabsList>

              {/* Common Fields */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Patient Search */}
                <div className="space-y-2 relative">
                  <Label>Patient *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search patient by name or MRN..."
                      value={selectedPatient ? `${selectedPatient.name} (${selectedPatient.mrn})` : patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setSelectedPatient(null);
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      className="pl-10"
                    />
                    {selectedPatient && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => {
                          setSelectedPatient(null);
                          setPatientSearch('');
                          setFormData(prev => ({ ...prev, patientId: '' }));
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {showPatientDropdown && !selectedPatient && patients.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {patients.slice(0, 10).map(patient => (
                        <div
                          key={patient.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setFormData(prev => ({ ...prev, patientId: patient.id }));
                            setShowPatientDropdown(false);
                          }}
                        >
                          <div className="font-medium">{patient.name}</div>
                          <div className="text-sm text-gray-500">MRN: {patient.mrn} | {patient.contact || 'No contact'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={formData.appointmentDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time *</Label>
                    <Input
                      type="time"
                      value={formData.appointmentTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, appointmentTime: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Referred By (Doctor)</Label>
                  <Select value={formData.referredBy || "none"} onValueChange={(v) => setFormData(prev => ({ ...prev, referredBy: v === "none" ? "" : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select referring doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {doctors.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Consultation Tab */}
              <TabsContent value="consultation" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={formData.department || "general"} onValueChange={(v) => setFormData(prev => ({ ...prev, department: v === "general" ? "" : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="Cardiology">Cardiology</SelectItem>
                        <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                        <SelectItem value="Neurology">Neurology</SelectItem>
                        <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                        <SelectItem value="Dermatology">Dermatology</SelectItem>
                        <SelectItem value="ENT">ENT</SelectItem>
                        <SelectItem value="Gynecology">Gynecology</SelectItem>
                        <SelectItem value="Ophthalmology">Ophthalmology</SelectItem>
                        <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Doctor *</Label>
                    <Select value={formData.doctorId || "none"} onValueChange={(v) => setFormData(prev => ({ ...prev, doctorId: v === "none" ? "" : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select a doctor</SelectItem>
                        {doctors.map(doc => (
                          <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason for Visit</Label>
                  <Textarea
                    placeholder="Brief description of the reason for consultation..."
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
              </TabsContent>

              {/* Lab Test Tab */}
              <TabsContent value="lab" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Lab Tests</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-md p-3">
                    {LAB_TESTS.map(test => (
                      <div key={test.id} className="flex items-start gap-2">
                        <Checkbox
                          id={test.id}
                          checked={formData.testIds.includes(test.id)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              testIds: checked
                                ? [...prev.testIds, test.id]
                                : prev.testIds.filter(id => id !== test.id)
                            }));
                          }}
                        />
                        <label htmlFor={test.id} className="text-sm cursor-pointer">
                          <span className="font-medium">{test.name}</span>
                          {test.preparation && (
                            <span className="block text-xs text-orange-600">{test.preparation}</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                {formData.testIds.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      <div className="font-medium">Selected: {formData.testIds.length} test(s)</div>
                      <div className="text-sm">Estimated Duration: {calculateDuration()} minutes</div>
                      {getPreparationInstructions() && (
                        <div className="text-sm text-orange-600 mt-1">
                          <strong>Preparation:</strong><br />
                          {getPreparationInstructions()}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Radiology Tab */}
              <TabsContent value="radiology" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Radiology Tests</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-md p-3">
                    {RADIOLOGY_TESTS.map(test => (
                      <div key={test.id} className="flex items-start gap-2">
                        <Checkbox
                          id={test.id}
                          checked={formData.testIds.includes(test.id)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              testIds: checked
                                ? [...prev.testIds, test.id]
                                : prev.testIds.filter(id => id !== test.id)
                            }));
                          }}
                        />
                        <label htmlFor={test.id} className="text-sm cursor-pointer">
                          <span className="font-medium">{test.name}</span>
                          <span className="text-xs text-gray-500 ml-1">({test.modality})</span>
                          {test.preparation && (
                            <span className="block text-xs text-orange-600">{test.preparation}</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                {formData.testIds.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      <div className="font-medium">Selected: {formData.testIds.length} test(s)</div>
                      <div className="text-sm">Estimated Duration: {calculateDuration()} minutes</div>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Procedure Tab */}
              <TabsContent value="procedure" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Procedures</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-md p-3">
                    {PROCEDURE_TESTS.map(test => (
                      <div key={test.id} className="flex items-start gap-2">
                        <Checkbox
                          id={test.id}
                          checked={formData.testIds.includes(test.id)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              testIds: checked
                                ? [...prev.testIds, test.id]
                                : prev.testIds.filter(id => id !== test.id)
                            }));
                          }}
                        />
                        <label htmlFor={test.id} className="text-sm cursor-pointer">
                          <span className="font-medium">{test.name}</span>
                          {test.preparation && (
                            <span className="block text-xs text-orange-600">{test.preparation}</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                {formData.testIds.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      <div className="font-medium">Selected: {formData.testIds.length} procedure(s)</div>
                      <div className="text-sm">Estimated Duration: {calculateDuration()} minutes</div>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Health Checkup Tab */}
              <TabsContent value="health_checkup" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Health Package</Label>
                  <Select value={formData.healthPackage || "none"} onValueChange={handleHealthPackageChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a health package" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Choose a package</SelectItem>
                      {HEALTH_PACKAGES.map(pkg => (
                        <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.healthPackage && (
                  <div className="space-y-2">
                    <Label>Included Tests</Label>
                    <div className="border rounded-md p-3 bg-gray-50">
                      {HEALTH_PACKAGES.find(p => p.id === formData.healthPackage)?.tests.map(testId => {
                        const allTests = [...LAB_TESTS, ...RADIOLOGY_TESTS, ...PROCEDURE_TESTS];
                        const test = allTests.find(t => t.id === testId);
                        return test ? (
                          <div key={testId} className="flex items-center gap-2 py-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">{test.name}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Notes */}
            <div className="space-y-2 mt-4">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Any additional notes or instructions..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.patientId || (formData.type === 'consultation' && !formData.doctorId)}>
                Schedule Appointment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Stethoscope className="w-4 h-4" /> Consultations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.consultation}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <TestTube className="w-4 h-4" /> Lab Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lab}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Scan className="w-4 h-4" /> Radiology
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.radiology}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Tabs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle>Appointments</CardTitle>
              <CardDescription>View and manage all appointments</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-40"
              />
              <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchAppointments}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="consultation" className="gap-1">
                <Stethoscope className="w-4 h-4" /> Consultations
              </TabsTrigger>
              <TabsTrigger value="lab" className="gap-1">
                <TestTube className="w-4 h-4" /> Lab
              </TabsTrigger>
              <TabsTrigger value="radiology" className="gap-1">
                <Scan className="w-4 h-4" /> Radiology
              </TabsTrigger>
              <TabsTrigger value="procedure" className="gap-1">
                <Heart className="w-4 h-4" /> Procedures
              </TabsTrigger>
              <TabsTrigger value="health_checkup" className="gap-1">
                <Activity className="w-4 h-4" /> Health Checkup
              </TabsTrigger>
            </TabsList>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Doctor / Tests</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading appointments...
                    </TableCell>
                  </TableRow>
                ) : appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No appointments found for the selected date
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map(apt => (
                    <TableRow key={apt.id}>
                      <TableCell>
                        <div className="font-medium">{apt.patient.name}</div>
                        <div className="text-sm text-gray-500">MRN: {apt.patient.mrn}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getTypeIcon(apt.type)}
                          <span>{getTypeLabel(apt.type)}</span>
                        </div>
                        {apt.modality && (
                          <div className="text-xs text-gray-500">{apt.modality}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(apt.appointmentDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {apt.appointmentTime}
                        </div>
                      </TableCell>
                      <TableCell>
                        {apt.type === 'consultation' ? (
                          <div>{apt.doctor?.name || 'No doctor assigned'}</div>
                        ) : apt.testNames && apt.testNames.length > 0 ? (
                          <div className="text-sm">
                            {apt.testNames.slice(0, 2).join(', ')}
                            {apt.testNames.length > 2 && ` +${apt.testNames.length - 2} more`}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={apt.priority === 'emergency' ? 'destructive' : apt.priority === 'urgent' ? 'default' : 'secondary'}>
                          {apt.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(apt.status)}>
                          {apt.status.replace('_', ' ')}
                        </Badge>
                        {apt.reportReady && (
                          <Badge variant="outline" className="ml-1 text-green-600 border-green-600">
                            <FileText className="w-3 h-3 mr-1" /> Report Ready
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {apt.status === 'scheduled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatus(apt.id, 'confirmed')}
                            >
                              Confirm
                            </Button>
                          )}
                          {apt.status === 'confirmed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatus(apt.id, 'in_progress')}
                            >
                              Start
                            </Button>
                          )}
                          {apt.status === 'in_progress' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatus(apt.id, 'completed')}
                            >
                              Complete
                            </Button>
                          )}
                          {!['completed', 'cancelled'].includes(apt.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => cancelAppointment(apt.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
