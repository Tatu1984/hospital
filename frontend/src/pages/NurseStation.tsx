import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Pill, Heart, Plus, Users, Building2, RefreshCw, UserCog, Eye } from 'lucide-react';
import api from '../services/api';
import BedPatientDetails from '../components/BedPatientDetails';

interface Ward {
  id: string;
  name: string;
  type: string;
  floor?: string;
  building?: string;
}

interface Nurse {
  id: string;
  name: string;
  employeeId?: string;
  department?: string;
}

interface Patient {
  id: string;
  name: string;
  mrn: string;
  wardName: string;
  bedNumber: string;
  admissionDate: string;
}

interface MedicationTask {
  id: string;
  patientId: string;
  patientName: string;
  medication: string;
  dosage: string;
  route: string;
  scheduledTime: string;
  status: 'pending' | 'administered' | 'missed' | 'refused';
  administeredBy?: string;
  administeredAt?: string;
}

interface VitalSign {
  id: string;
  patientId: string;
  patientName: string;
  temperature: string;
  bloodPressure: string;
  pulse: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  recordedAt: string;
  recordedBy: string;
}

interface DutyRoster {
  id: string;
  nurseName: string;
  shift: 'morning' | 'evening' | 'night';
  ward: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface HandoverNote {
  id: string;
  patientId: string;
  patientName: string;
  fromNurse: string;
  toNurse: string;
  shift: string;
  criticalIssues: string;
  pendingTasks: string;
  medications: string;
  timestamp: string;
}

export default function NurseStation() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<MedicationTask[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [roster, setRoster] = useState<DutyRoster[]>([]);
  const [handoverNotes, setHandoverNotes] = useState<HandoverNote[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);

  const [isVitalsDialogOpen, setIsVitalsDialogOpen] = useState(false);
  const [isRosterDialogOpen, setIsRosterDialogOpen] = useState(false);
  const [isHandoverDialogOpen, setIsHandoverDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Patient Details Dialog
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [selectedPatientForDetails, setSelectedPatientForDetails] = useState<Patient | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Quick assign nurse form
  const [assignFormData, setAssignFormData] = useState({
    nurseId: '',
    nurseName: '',
    ward: '',
    shift: 'morning' as const,
    date: new Date().toISOString().split('T')[0]
  });

  const [vitalsFormData, setVitalsFormData] = useState({
    patientId: '',
    temperature: '',
    bloodPressure: '',
    pulse: '',
    respiratoryRate: '',
    oxygenSaturation: ''
  });

  const [rosterFormData, setRosterFormData] = useState({
    nurseName: '',
    shift: 'morning' as const,
    ward: '',
    date: '',
    startTime: '',
    endTime: ''
  });

  const [handoverFormData, setHandoverFormData] = useState({
    patientId: '',
    fromNurse: '',
    toNurse: '',
    shift: '',
    criticalIssues: '',
    pendingTasks: '',
    medications: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchPatients(),
      fetchMedications(),
      fetchVitals(),
      fetchRoster(),
      fetchHandoverNotes(),
      fetchWards(),
      fetchNurses()
    ]);
    setRefreshing(false);
  };

  const fetchWards = async () => {
    try {
      const response = await api.get('/api/wards');
      setWards(response.data);
    } catch (error) {
      console.error('Error fetching wards:', error);
    }
  };

  const fetchNurses = async () => {
    try {
      // Fetch employees with NURSE role
      const response = await api.get('/api/employees?role=NURSE');
      setNurses(response.data.map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        employeeId: emp.employeeId,
        department: emp.department
      })));
    } catch (error) {
      console.error('Error fetching nurses:', error);
      // Fallback: Use unique nurse names from roster
      const uniqueNurses = [...new Set(roster.map(r => r.nurseName))].map((name, idx) => ({
        id: `nurse-${idx}`,
        name: name
      }));
      setNurses(uniqueNurses);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/api/nursing/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchMedications = async () => {
    try {
      const response = await api.get('/api/nursing/medications');
      setMedications(response.data);
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  };

  const fetchVitals = async () => {
    try {
      const response = await api.get('/api/nursing/vitals');
      setVitals(response.data);
    } catch (error) {
      console.error('Error fetching vitals:', error);
    }
  };

  const fetchRoster = async () => {
    try {
      const response = await api.get('/api/nursing/roster');
      setRoster(response.data);
    } catch (error) {
      console.error('Error fetching roster:', error);
    }
  };

  const fetchHandoverNotes = async () => {
    try {
      const response = await api.get('/api/nursing/handover');
      setHandoverNotes(response.data);
    } catch (error) {
      console.error('Error fetching handover notes:', error);
    }
  };

  const handleAdministerMedication = async (medId: string) => {
    try {
      await api.post('/api/nursing/medication-admin', {
        medicationId: medId,
        administeredAt: new Date().toISOString()
      });

      setMedications(medications.map(med =>
        med.id === medId
          ? { ...med, status: 'administered', administeredAt: new Date().toISOString() }
          : med
      ));

      await fetchMedications();
    } catch (error) {
      console.error('Error administering medication:', error);
      alert('Failed to record medication administration');
    }
  };

  const handleRecordVitals = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/nursing/vitals', {
        ...vitalsFormData,
        recordedAt: new Date().toISOString()
      });

      const patient = patients.find(p => p.id === vitalsFormData.patientId);
      const newVital: VitalSign = {
        id: response.data.id || Date.now().toString(),
        patientId: vitalsFormData.patientId,
        patientName: patient?.name || '',
        temperature: vitalsFormData.temperature,
        bloodPressure: vitalsFormData.bloodPressure,
        pulse: vitalsFormData.pulse,
        respiratoryRate: vitalsFormData.respiratoryRate,
        oxygenSaturation: vitalsFormData.oxygenSaturation,
        recordedAt: new Date().toISOString(),
        recordedBy: 'Current Nurse'
      };

      setVitals([newVital, ...vitals]);
      setIsVitalsDialogOpen(false);
      setVitalsFormData({
        patientId: '',
        temperature: '',
        bloodPressure: '',
        pulse: '',
        respiratoryRate: '',
        oxygenSaturation: ''
      });
      setSelectedPatient(null);
      alert('Vitals recorded successfully!');
    } catch (error) {
      console.error('Error recording vitals:', error);
      alert('Failed to record vitals');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoster = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/nursing/roster', rosterFormData);

      const newRoster: DutyRoster = {
        id: response.data.id || Date.now().toString(),
        ...rosterFormData
      };

      setRoster([...roster, newRoster]);
      setIsRosterDialogOpen(false);
      setRosterFormData({
        nurseName: '',
        shift: 'morning',
        ward: '',
        date: '',
        startTime: '',
        endTime: ''
      });
      alert('Roster entry added successfully!');
    } catch (error) {
      console.error('Error adding roster:', error);
      alert('Failed to add roster entry');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHandover = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/nursing/handover', {
        ...handoverFormData,
        timestamp: new Date().toISOString()
      });

      const patient = patients.find(p => p.id === handoverFormData.patientId);
      const newHandover: HandoverNote = {
        id: response.data.id || Date.now().toString(),
        patientId: handoverFormData.patientId,
        patientName: patient?.name || '',
        fromNurse: handoverFormData.fromNurse,
        toNurse: handoverFormData.toNurse,
        shift: handoverFormData.shift,
        criticalIssues: handoverFormData.criticalIssues,
        pendingTasks: handoverFormData.pendingTasks,
        medications: handoverFormData.medications,
        timestamp: new Date().toISOString()
      };

      setHandoverNotes([newHandover, ...handoverNotes]);
      setIsHandoverDialogOpen(false);
      setHandoverFormData({
        patientId: '',
        fromNurse: '',
        toNurse: '',
        shift: '',
        criticalIssues: '',
        pendingTasks: '',
        medications: ''
      });
      alert('Handover note saved successfully!');
    } catch (error) {
      console.error('Error saving handover:', error);
      alert('Failed to save handover note');
    } finally {
      setLoading(false);
    }
  };

  const openVitalsDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setVitalsFormData(prev => ({ ...prev, patientId: patient.id }));
    setIsVitalsDialogOpen(true);
  };

  const handleQuickAssign = async () => {
    setLoading(true);
    try {
      await api.post('/api/nursing/roster', {
        ...assignFormData,
        startTime: assignFormData.shift === 'morning' ? '06:00' : assignFormData.shift === 'evening' ? '14:00' : '22:00',
        endTime: assignFormData.shift === 'morning' ? '14:00' : assignFormData.shift === 'evening' ? '22:00' : '06:00'
      });
      await fetchRoster();
      setIsAssignDialogOpen(false);
      setAssignFormData({
        nurseId: '',
        nurseName: '',
        ward: '',
        shift: 'morning',
        date: new Date().toISOString().split('T')[0]
      });
      alert('Nurse assigned successfully!');
    } catch (error) {
      console.error('Error assigning nurse:', error);
      alert('Failed to assign nurse');
    } finally {
      setLoading(false);
    }
  };

  // Get ward allocation summary
  const getWardAllocation = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRoster = roster.filter(r => r.date === today);

    // Group by ward and shift
    const wardMap = new Map<string, { morning: string[], evening: string[], night: string[] }>();

    // Initialize with all known wards
    wards.forEach(ward => {
      wardMap.set(ward.name, { morning: [], evening: [], night: [] });
    });

    todayRoster.forEach(entry => {
      const wardName = entry.ward || 'Unassigned';
      if (!wardMap.has(wardName)) {
        wardMap.set(wardName, { morning: [], evening: [], night: [] });
      }
      const allocation = wardMap.get(wardName)!;
      if (entry.shift === 'morning') allocation.morning.push(entry.nurseName);
      else if (entry.shift === 'evening') allocation.evening.push(entry.nurseName);
      else allocation.night.push(entry.nurseName);
    });

    return Array.from(wardMap.entries()).map(([ward, shifts]) => ({
      ward,
      ...shifts
    }));
  };

  const wardAllocation = getWardAllocation();

  const stats = {
    totalPatients: patients.length,
    medicationsDue: medications.filter(m => m.status === 'pending').length,
    vitalsPending: patients.length - vitals.filter(v =>
      new Date(v.recordedAt).toDateString() === new Date().toDateString()
    ).length,
    onDutyNurses: roster.filter(r => r.date === new Date().toISOString().split('T')[0]).length
  };

  const todayRoster = roster.filter(r => r.date === new Date().toISOString().split('T')[0]);
  const todayHandovers = handoverNotes.filter(h =>
    new Date(h.timestamp).toDateString() === new Date().toDateString()
  );

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Nurse Station</h1>
          <p className="text-slate-600">Patient care, medication administration, and duty management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAllData} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserCog className="w-4 h-4 mr-1" />
                Quick Assign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Quick Assign Nurse</DialogTitle>
                <DialogDescription>Quickly assign a nurse to a ward for today</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nurse *</Label>
                  <Select
                    value={assignFormData.nurseId}
                    onValueChange={(value) => {
                      const nurse = nurses.find(n => n.id === value);
                      setAssignFormData(prev => ({
                        ...prev,
                        nurseId: value,
                        nurseName: nurse?.name || ''
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select nurse" />
                    </SelectTrigger>
                    <SelectContent>
                      {nurses.map(nurse => (
                        <SelectItem key={nurse.id} value={nurse.id}>
                          {nurse.name} {nurse.employeeId ? `(${nurse.employeeId})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ward *</Label>
                  <Select
                    value={assignFormData.ward}
                    onValueChange={(value) => setAssignFormData(prev => ({ ...prev, ward: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ward" />
                    </SelectTrigger>
                    <SelectContent>
                      {wards.map(ward => (
                        <SelectItem key={ward.id} value={ward.name}>
                          {ward.name} ({ward.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Shift *</Label>
                    <Select
                      value={assignFormData.shift}
                      onValueChange={(value: any) => setAssignFormData(prev => ({ ...prev, shift: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (6 AM - 2 PM)</SelectItem>
                        <SelectItem value="evening">Evening (2 PM - 10 PM)</SelectItem>
                        <SelectItem value="night">Night (10 PM - 6 AM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={assignFormData.date}
                      onChange={(e) => setAssignFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleQuickAssign}
                  disabled={loading || !assignFormData.nurseId || !assignFormData.ward}
                >
                  {loading ? 'Assigning...' : 'Assign Nurse'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Patients Under Care</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Medications Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.medicationsDue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Vitals Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.vitalsPending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Nurses On Duty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.onDutyNurses}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="allocation" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="allocation">Ward Allocation</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="roster">Duty Roster</TabsTrigger>
          <TabsTrigger value="handover">Handover Notes</TabsTrigger>
        </TabsList>

        {/* Ward Allocation Tab */}
        <TabsContent value="allocation">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Ward Allocation Overview
                  </CardTitle>
                  <CardDescription>Today's nurse assignments by ward and shift</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedShift} onValueChange={setSelectedShift}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Shifts</SelectItem>
                      <SelectItem value="morning">Morning Shift</SelectItem>
                      <SelectItem value="evening">Evening Shift</SelectItem>
                      <SelectItem value="night">Night Shift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {wardAllocation.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No ward allocations found for today</p>
                  <p className="text-sm mt-2">Use the "Quick Assign" button to assign nurses to wards</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wardAllocation.map(allocation => (
                    <Card key={allocation.ward} className="border-2">
                      <CardHeader className="pb-2 bg-slate-50">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {allocation.ward}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-3">
                        {(selectedShift === 'all' || selectedShift === 'morning') && (
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 mb-1">
                              <Badge variant="outline" className="bg-amber-50">Morning</Badge>
                              <span className="text-xs text-slate-500">(6 AM - 2 PM)</span>
                            </div>
                            {allocation.morning.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {allocation.morning.map((nurse, idx) => (
                                  <Badge key={idx} variant="secondary" className="bg-amber-100">
                                    {nurse}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No nurse assigned</p>
                            )}
                          </div>
                        )}
                        {(selectedShift === 'all' || selectedShift === 'evening') && (
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 mb-1">
                              <Badge variant="outline" className="bg-blue-50">Evening</Badge>
                              <span className="text-xs text-slate-500">(2 PM - 10 PM)</span>
                            </div>
                            {allocation.evening.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {allocation.evening.map((nurse, idx) => (
                                  <Badge key={idx} variant="secondary" className="bg-blue-100">
                                    {nurse}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No nurse assigned</p>
                            )}
                          </div>
                        )}
                        {(selectedShift === 'all' || selectedShift === 'night') && (
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 mb-1">
                              <Badge variant="outline" className="bg-purple-50">Night</Badge>
                              <span className="text-xs text-slate-500">(10 PM - 6 AM)</span>
                            </div>
                            {allocation.night.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {allocation.night.map((nurse, idx) => (
                                  <Badge key={idx} variant="secondary" className="bg-purple-100">
                                    {nurse}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No nurse assigned</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Summary Table */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Allocation Summary</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ward</TableHead>
                      <TableHead className="text-center">Morning</TableHead>
                      <TableHead className="text-center">Evening</TableHead>
                      <TableHead className="text-center">Night</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wardAllocation.map(allocation => (
                      <TableRow key={allocation.ward}>
                        <TableCell className="font-medium">{allocation.ward}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={allocation.morning.length > 0 ? 'default' : 'outline'}>
                            {allocation.morning.length}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={allocation.evening.length > 0 ? 'default' : 'outline'}>
                            {allocation.evening.length}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={allocation.night.length > 0 ? 'default' : 'outline'}>
                            {allocation.night.length}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {allocation.morning.length + allocation.evening.length + allocation.night.length}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medications Tab */}
        <TabsContent value="medications">
          <Card>
            <CardHeader>
              <CardTitle>Medication Administration Record (eMAR)</CardTitle>
              <CardDescription>Track and administer scheduled medications</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Medication</TableHead>
                    <TableHead>Dosage</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Scheduled Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No medications scheduled
                      </TableCell>
                    </TableRow>
                  ) : (
                    medications.map(med => (
                      <TableRow key={med.id}>
                        <TableCell className="font-medium">{med.patientName}</TableCell>
                        <TableCell>{med.medication}</TableCell>
                        <TableCell>{med.dosage}</TableCell>
                        <TableCell>{med.route}</TableCell>
                        <TableCell>{new Date(med.scheduledTime).toLocaleTimeString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            med.status === 'administered' ? 'default' :
                            med.status === 'pending' ? 'secondary' :
                            'destructive'
                          }>
                            {med.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {med.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleAdministerMedication(med.id)}
                            >
                              <Pill className="w-4 h-4 mr-1" />
                              Administer
                            </Button>
                          )}
                          {med.status === 'administered' && med.administeredAt && (
                            <span className="text-xs text-slate-500">
                              {new Date(med.administeredAt).toLocaleTimeString()}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vitals Tab */}
        <TabsContent value="vitals">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Vital Signs Monitoring</CardTitle>
                  <CardDescription>Record and track patient vital signs</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Temperature</TableHead>
                    <TableHead>BP</TableHead>
                    <TableHead>Pulse</TableHead>
                    <TableHead>RR</TableHead>
                    <TableHead>SpO2</TableHead>
                    <TableHead>Recorded At</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vitals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No vitals recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    vitals.slice(0, 20).map(vital => (
                      <TableRow key={vital.id}>
                        <TableCell className="font-medium">{vital.patientName}</TableCell>
                        <TableCell>{vital.temperature}°F</TableCell>
                        <TableCell>{vital.bloodPressure}</TableCell>
                        <TableCell>{vital.pulse} bpm</TableCell>
                        <TableCell>{vital.respiratoryRate}</TableCell>
                        <TableCell>{vital.oxygenSaturation}%</TableCell>
                        <TableCell>{new Date(vital.recordedAt).toLocaleString()}</TableCell>
                        <TableCell>{vital.recordedBy}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patients Tab */}
        <TabsContent value="patients">
          <Card>
            <CardHeader>
              <CardTitle>Patients Under Care</CardTitle>
              <CardDescription>View and manage patient assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MRN</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Bed</TableHead>
                    <TableHead>Admission Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        No patients assigned
                      </TableCell>
                    </TableRow>
                  ) : (
                    patients.map(patient => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">{patient.mrn}</TableCell>
                        <TableCell>{patient.name}</TableCell>
                        <TableCell>{patient.wardName}</TableCell>
                        <TableCell>{patient.bedNumber}</TableCell>
                        <TableCell>{new Date(patient.admissionDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPatientForDetails(patient);
                                setShowPatientDetails(true);
                              }}
                              title="View Patient Details"
                            >
                              <Eye className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openVitalsDialog(patient)}
                            >
                              <Heart className="w-4 h-4 mr-1" />
                              Record Vitals
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Duty Roster Tab */}
        <TabsContent value="roster">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Duty Roster Management</CardTitle>
                  <CardDescription>Manage nursing shifts and assignments</CardDescription>
                </div>
                <Dialog open={isRosterDialogOpen} onOpenChange={setIsRosterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Duty
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Duty Roster Entry</DialogTitle>
                      <DialogDescription>Schedule nurse for shift duty</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Nurse Name *</Label>
                        <Input
                          value={rosterFormData.nurseName}
                          onChange={(e) => setRosterFormData(prev => ({ ...prev, nurseName: e.target.value }))}
                          placeholder="Enter nurse name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ward *</Label>
                        <Input
                          value={rosterFormData.ward}
                          onChange={(e) => setRosterFormData(prev => ({ ...prev, ward: e.target.value }))}
                          placeholder="e.g., ICU, General Ward"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Shift *</Label>
                          <Select value={rosterFormData.shift} onValueChange={(value: any) => setRosterFormData(prev => ({ ...prev, shift: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="morning">Morning (6 AM - 2 PM)</SelectItem>
                              <SelectItem value="evening">Evening (2 PM - 10 PM)</SelectItem>
                              <SelectItem value="night">Night (10 PM - 6 AM)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Date *</Label>
                          <Input
                            type="date"
                            value={rosterFormData.date}
                            onChange={(e) => setRosterFormData(prev => ({ ...prev, date: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={rosterFormData.startTime}
                            onChange={(e) => setRosterFormData(prev => ({ ...prev, startTime: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={rosterFormData.endTime}
                            onChange={(e) => setRosterFormData(prev => ({ ...prev, endTime: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRosterDialogOpen(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddRoster} disabled={loading}>
                        {loading ? 'Adding...' : 'Add to Roster'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Today's Roster</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nurse Name</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayRoster.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No roster entries for today
                      </TableCell>
                    </TableRow>
                  ) : (
                    todayRoster.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.nurseName}</TableCell>
                        <TableCell>{entry.ward}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {entry.shift.charAt(0).toUpperCase() + entry.shift.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell>{entry.startTime} - {entry.endTime}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Handover Notes Tab */}
        <TabsContent value="handover">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Shift Handover Notes</CardTitle>
                  <CardDescription>Document patient handovers between shifts</CardDescription>
                </div>
                <Dialog open={isHandoverDialogOpen} onOpenChange={setIsHandoverDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-1" />
                      New Handover
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Handover Note</DialogTitle>
                      <DialogDescription>Document shift handover details</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Patient *</Label>
                        <Select value={handoverFormData.patientId} onValueChange={(value) => setHandoverFormData(prev => ({ ...prev, patientId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select patient" />
                          </SelectTrigger>
                          <SelectContent>
                            {patients.map(patient => (
                              <SelectItem key={patient.id} value={patient.id}>
                                {patient.name} - {patient.mrn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>From Nurse *</Label>
                          <Input
                            value={handoverFormData.fromNurse}
                            onChange={(e) => setHandoverFormData(prev => ({ ...prev, fromNurse: e.target.value }))}
                            placeholder="Outgoing nurse name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>To Nurse *</Label>
                          <Input
                            value={handoverFormData.toNurse}
                            onChange={(e) => setHandoverFormData(prev => ({ ...prev, toNurse: e.target.value }))}
                            placeholder="Incoming nurse name"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Shift</Label>
                        <Input
                          value={handoverFormData.shift}
                          onChange={(e) => setHandoverFormData(prev => ({ ...prev, shift: e.target.value }))}
                          placeholder="e.g., Morning to Evening"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Critical Issues / Alerts *</Label>
                        <textarea
                          className="w-full min-h-[80px] p-3 border rounded-md"
                          value={handoverFormData.criticalIssues}
                          onChange={(e) => setHandoverFormData(prev => ({ ...prev, criticalIssues: e.target.value }))}
                          placeholder="Any critical patient conditions, alerts, or concerns..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Pending Tasks</Label>
                        <textarea
                          className="w-full min-h-[60px] p-3 border rounded-md"
                          value={handoverFormData.pendingTasks}
                          onChange={(e) => setHandoverFormData(prev => ({ ...prev, pendingTasks: e.target.value }))}
                          placeholder="Tasks to be completed by next shift..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Medication Notes</Label>
                        <textarea
                          className="w-full min-h-[60px] p-3 border rounded-md"
                          value={handoverFormData.medications}
                          onChange={(e) => setHandoverFormData(prev => ({ ...prev, medications: e.target.value }))}
                          placeholder="Medication schedule and special instructions..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsHandoverDialogOpen(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveHandover} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Handover Note'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayHandovers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No handover notes for today
                  </div>
                ) : (
                  todayHandovers.map(handover => (
                    <Card key={handover.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{handover.patientName}</CardTitle>
                            <CardDescription>
                              {handover.fromNurse} → {handover.toNurse} | {handover.shift}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">
                            {new Date(handover.timestamp).toLocaleTimeString()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-1 text-red-600 mb-1">
                            <AlertCircle className="w-4 h-4" />
                            Critical Issues:
                          </div>
                          <p className="text-sm text-slate-700">{handover.criticalIssues}</p>
                        </div>
                        {handover.pendingTasks && (
                          <div>
                            <div className="font-semibold text-sm mb-1">Pending Tasks:</div>
                            <p className="text-sm text-slate-700">{handover.pendingTasks}</p>
                          </div>
                        )}
                        {handover.medications && (
                          <div>
                            <div className="font-semibold text-sm mb-1">Medications:</div>
                            <p className="text-sm text-slate-700">{handover.medications}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Vitals Dialog */}
      <Dialog open={isVitalsDialogOpen} onOpenChange={setIsVitalsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Vital Signs</DialogTitle>
            <DialogDescription>
              Patient: {selectedPatient?.name} ({selectedPatient?.mrn})
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Temperature (°F)</Label>
              <Input
                type="number"
                step="0.1"
                value={vitalsFormData.temperature}
                onChange={(e) => setVitalsFormData(prev => ({ ...prev, temperature: e.target.value }))}
                placeholder="98.6"
              />
            </div>
            <div className="space-y-2">
              <Label>Blood Pressure</Label>
              <Input
                value={vitalsFormData.bloodPressure}
                onChange={(e) => setVitalsFormData(prev => ({ ...prev, bloodPressure: e.target.value }))}
                placeholder="120/80"
              />
            </div>
            <div className="space-y-2">
              <Label>Pulse (bpm)</Label>
              <Input
                type="number"
                value={vitalsFormData.pulse}
                onChange={(e) => setVitalsFormData(prev => ({ ...prev, pulse: e.target.value }))}
                placeholder="72"
              />
            </div>
            <div className="space-y-2">
              <Label>Respiratory Rate</Label>
              <Input
                type="number"
                value={vitalsFormData.respiratoryRate}
                onChange={(e) => setVitalsFormData(prev => ({ ...prev, respiratoryRate: e.target.value }))}
                placeholder="16"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Oxygen Saturation (%)</Label>
              <Input
                type="number"
                value={vitalsFormData.oxygenSaturation}
                onChange={(e) => setVitalsFormData(prev => ({ ...prev, oxygenSaturation: e.target.value }))}
                placeholder="98"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVitalsDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleRecordVitals} disabled={loading}>
              {loading ? 'Recording...' : 'Record Vitals'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comprehensive Patient Details Dialog */}
      {selectedPatientForDetails && (
        <BedPatientDetails
          open={showPatientDetails}
          onClose={() => {
            setShowPatientDetails(false);
            setSelectedPatientForDetails(null);
          }}
          bedId={selectedPatientForDetails.bedNumber}
          patientId={selectedPatientForDetails.id}
          admissionId={selectedPatientForDetails.id}
          onRefresh={fetchPatients}
        />
      )}
    </div>
  );
}
