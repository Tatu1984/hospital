import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Stethoscope, RefreshCw, FlaskConical, Scan, Calendar, Pill, Save, CheckCircle } from 'lucide-react';
import api from '../services/api';

interface QueueItem {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  department: string;
  chiefComplaint: string;
  appointmentTime: string;
  checkInTime: string;
  status: string;
  tokenNumber: string;
  encounterId?: string;
}

interface LabTest {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
}

interface RadiologyTest {
  id: string;
  code: string;
  name: string;
  modality: string;
  price: number;
}

interface Drug {
  id: string;
  code: string;
  name: string;
  genericName: string;
  form: string;
  strength: string;
}

interface PrescriptionItem {
  drugId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export default function OPD() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<QueueItem | null>(null);
  const [isConsultDialogOpen, setIsConsultDialogOpen] = useState(false);
  const [isLabDialogOpen, setIsLabDialogOpen] = useState(false);
  const [isRadiologyDialogOpen, setIsRadiologyDialogOpen] = useState(false);
  const [isPrescriptionDialogOpen, setIsPrescriptionDialogOpen] = useState(false);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Master data
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [radiologyTests, setRadiologyTests] = useState<RadiologyTest[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);

  // Form states
  const [soapNotes, setSoapNotes] = useState({
    subjective: '',
    objective: '',
    vitals: { bp: '', pulse: '', temp: '', weight: '', height: '', spo2: '' },
    assessment: '',
    plan: '',
    diagnosis: '',
    icdCode: ''
  });

  const [selectedLabTests, setSelectedLabTests] = useState<string[]>([]);
  const [selectedRadiologyTests, setSelectedRadiologyTests] = useState<string[]>([]);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [newPrescriptionItem, setNewPrescriptionItem] = useState<PrescriptionItem>({
    drugId: '',
    drugName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  });
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalToday: 0,
    waiting: 0,
    inProgress: 0,
    completed: 0
  });

  useEffect(() => {
    fetchQueue();
    fetchMasterData();
    const interval = setInterval(fetchQueue, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const response = await api.get('/api/queue/opd');
      const queueData = response.data || [];
      setQueue(queueData);

      // Calculate stats
      setStats({
        totalToday: queueData.length,
        waiting: queueData.filter((q: QueueItem) => q.status === 'waiting' || q.status === 'checked_in').length,
        inProgress: queueData.filter((q: QueueItem) => q.status === 'in_progress').length,
        completed: queueData.filter((q: QueueItem) => q.status === 'completed').length
      });
    } catch (error) {
      console.error('Error fetching OPD queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [labRes, radRes, drugRes] = await Promise.all([
        api.get('/api/master/lab-tests').catch(() => ({ data: [] })),
        api.get('/api/master/radiology-tests').catch(() => ({ data: [] })),
        api.get('/api/master/drugs').catch(() => ({ data: [] }))
      ]);
      setLabTests(labRes.data || []);
      setRadiologyTests(radRes.data || []);
      setDrugs(drugRes.data || []);
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const openConsultation = async (patient: QueueItem) => {
    setSelectedPatient(patient);
    setSoapNotes({
      subjective: patient.chiefComplaint || '',
      objective: '',
      vitals: { bp: '', pulse: '', temp: '', weight: '', height: '', spo2: '' },
      assessment: '',
      plan: '',
      diagnosis: '',
      icdCode: ''
    });
    setSelectedLabTests([]);
    setSelectedRadiologyTests([]);
    setPrescriptionItems([]);

    // If encounter exists, fetch existing notes
    if (patient.encounterId) {
      try {
        const response = await api.get(`/api/opd-notes/${patient.encounterId}`);
        if (response.data) {
          const notes = response.data;
          setSoapNotes({
            subjective: notes.subjective || patient.chiefComplaint || '',
            objective: notes.objective || '',
            vitals: notes.vitals || { bp: '', pulse: '', temp: '', weight: '', height: '', spo2: '' },
            assessment: notes.assessment || '',
            plan: notes.plan || '',
            diagnosis: notes.diagnosis || '',
            icdCode: notes.icdCode || ''
          });
        }
      } catch (error) {
        // No existing notes, that's fine
      }
    }

    // Update status to in_progress if currently waiting
    if (patient.status === 'waiting' || patient.status === 'checked_in') {
      try {
        await api.post(`/api/queue/call-next/${patient.appointmentId}`);
        fetchQueue();
      } catch (error) {
        console.error('Error updating status:', error);
      }
    }

    setIsConsultDialogOpen(true);
  };

  const handleSaveNotes = async (complete = false) => {
    if (!selectedPatient) return;

    setSaving(true);
    try {
      // Create or get encounter
      let encounterId = selectedPatient.encounterId;

      if (!encounterId) {
        const encounterRes = await api.post('/api/encounters', {
          patientId: selectedPatient.patientId,
          doctorId: selectedPatient.doctorId,
          appointmentId: selectedPatient.appointmentId,
          type: 'opd',
          chiefComplaint: soapNotes.subjective,
          status: complete ? 'completed' : 'in_progress'
        });
        encounterId = encounterRes.data.id;
      }

      // Save OPD notes
      await api.post('/api/opd-notes', {
        encounterId,
        subjective: soapNotes.subjective,
        objective: soapNotes.objective,
        assessment: soapNotes.assessment,
        plan: soapNotes.plan,
        vitals: soapNotes.vitals,
        diagnosis: soapNotes.diagnosis,
        icdCode: soapNotes.icdCode
      });

      if (complete) {
        // Update appointment status to completed
        await api.post(`/api/appointments/${selectedPatient.appointmentId}/complete`).catch(() => {});
        setIsConsultDialogOpen(false);
        fetchQueue();
      }

      alert(complete ? 'Consultation completed successfully!' : 'Notes saved as draft');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleOrderLabTests = async () => {
    if (!selectedPatient || selectedLabTests.length === 0) return;

    setSaving(true);
    try {
      const tests = labTests.filter(t => selectedLabTests.includes(t.id));

      await api.post('/api/orders', {
        patientId: selectedPatient.patientId,
        orderType: 'lab',
        priority: 'routine',
        items: tests.map(test => ({
          testId: test.id,
          testName: test.name,
          testCode: test.code,
          price: test.price
        }))
      });

      alert(`Successfully ordered ${selectedLabTests.length} lab test(s)`);
      setSelectedLabTests([]);
      setIsLabDialogOpen(false);
    } catch (error) {
      console.error('Error ordering lab tests:', error);
      alert('Failed to order lab tests');
    } finally {
      setSaving(false);
    }
  };

  const handleOrderRadiology = async () => {
    if (!selectedPatient || selectedRadiologyTests.length === 0) return;

    setSaving(true);
    try {
      const tests = radiologyTests.filter(t => selectedRadiologyTests.includes(t.id));

      await api.post('/api/orders', {
        patientId: selectedPatient.patientId,
        orderType: 'radiology',
        priority: 'routine',
        items: tests.map(test => ({
          testId: test.id,
          testName: test.name,
          testCode: test.code,
          modality: test.modality,
          price: test.price
        }))
      });

      alert(`Successfully ordered ${selectedRadiologyTests.length} radiology test(s)`);
      setSelectedRadiologyTests([]);
      setIsRadiologyDialogOpen(false);
    } catch (error) {
      console.error('Error ordering radiology tests:', error);
      alert('Failed to order radiology tests');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPrescriptionItem = () => {
    if (!newPrescriptionItem.drugId || !newPrescriptionItem.dosage) {
      alert('Please select a drug and enter dosage');
      return;
    }
    setPrescriptionItems([...prescriptionItems, { ...newPrescriptionItem }]);
    setNewPrescriptionItem({
      drugId: '',
      drugName: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    });
  };

  const handleSavePrescription = async () => {
    if (!selectedPatient || prescriptionItems.length === 0) return;

    setSaving(true);
    try {
      await api.post('/api/prescriptions', {
        patientId: selectedPatient.patientId,
        doctorId: selectedPatient.doctorId,
        encounterId: selectedPatient.encounterId,
        items: prescriptionItems.map(item => ({
          drugId: item.drugId,
          drugName: item.drugName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions
        }))
      });

      alert('Prescription saved successfully!');
      setPrescriptionItems([]);
      setIsPrescriptionDialogOpen(false);
    } catch (error) {
      console.error('Error saving prescription:', error);
      alert('Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!selectedPatient || !followUpDate) {
      alert('Please select a follow-up date');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/appointments', {
        patientId: selectedPatient.patientId,
        doctorId: selectedPatient.doctorId,
        appointmentDate: followUpDate,
        appointmentTime: '10:00',
        type: 'follow_up',
        reason: followUpNotes || 'Follow-up consultation',
        status: 'scheduled'
      });

      alert('Follow-up appointment scheduled successfully!');
      setFollowUpDate('');
      setFollowUpNotes('');
      setIsFollowUpDialogOpen(false);
    } catch (error) {
      console.error('Error scheduling follow-up:', error);
      alert('Failed to schedule follow-up');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
      case 'checked_in':
        return <Badge variant="secondary">Waiting</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-600">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-600">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">OutPatient Department (OPD)</h1>
          <p className="text-slate-600">Manage OPD consultations and EMR</p>
        </div>
        <Button variant="outline" onClick={fetchQueue}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.waiting}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* OPD Queue */}
      <Card>
        <CardHeader>
          <CardTitle>OPD Queue</CardTitle>
          <CardDescription>Patient consultation queue - Click "Consult" to start consultation</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Chief Complaint</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No patients in queue. Patients will appear here after check-in.
                  </TableCell>
                </TableRow>
              ) : (
                queue.map((item) => (
                  <TableRow key={item.id} className={item.status === 'in_progress' ? 'bg-blue-50' : ''}>
                    <TableCell className="font-medium">{item.tokenNumber || '-'}</TableCell>
                    <TableCell className="font-medium">{item.patientName}</TableCell>
                    <TableCell>{item.patientMrn}</TableCell>
                    <TableCell>{item.doctorName}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.chiefComplaint || '-'}</TableCell>
                    <TableCell>{item.appointmentTime}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      {item.status !== 'completed' && (
                        <Button variant="outline" size="sm" onClick={() => openConsultation(item)}>
                          <Stethoscope className="w-4 h-4 mr-1" />
                          Consult
                        </Button>
                      )}
                      {item.status === 'completed' && (
                        <Button variant="ghost" size="sm" onClick={() => openConsultation(item)}>
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Consultation Dialog */}
      <Dialog open={isConsultDialogOpen} onOpenChange={setIsConsultDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>OPD Consultation - {selectedPatient?.patientName}</DialogTitle>
            <DialogDescription>
              MRN: {selectedPatient?.patientMrn} | Doctor: {selectedPatient?.doctorName}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="vitals" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="vitals">Vitals</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="examination">Examination</TabsTrigger>
              <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="vitals" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Blood Pressure</Label>
                  <Input
                    placeholder="120/80 mmHg"
                    value={soapNotes.vitals.bp}
                    onChange={(e) => setSoapNotes(prev => ({
                      ...prev,
                      vitals: { ...prev.vitals, bp: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pulse Rate</Label>
                  <Input
                    placeholder="72 bpm"
                    value={soapNotes.vitals.pulse}
                    onChange={(e) => setSoapNotes(prev => ({
                      ...prev,
                      vitals: { ...prev.vitals, pulse: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Input
                    placeholder="98.6 °F"
                    value={soapNotes.vitals.temp}
                    onChange={(e) => setSoapNotes(prev => ({
                      ...prev,
                      vitals: { ...prev.vitals, temp: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SpO2</Label>
                  <Input
                    placeholder="98%"
                    value={soapNotes.vitals.spo2}
                    onChange={(e) => setSoapNotes(prev => ({
                      ...prev,
                      vitals: { ...prev.vitals, spo2: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight</Label>
                  <Input
                    placeholder="70 kg"
                    value={soapNotes.vitals.weight}
                    onChange={(e) => setSoapNotes(prev => ({
                      ...prev,
                      vitals: { ...prev.vitals, weight: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height</Label>
                  <Input
                    placeholder="170 cm"
                    value={soapNotes.vitals.height}
                    onChange={(e) => setSoapNotes(prev => ({
                      ...prev,
                      vitals: { ...prev.vitals, height: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Chief Complaints & History (Subjective)</Label>
                <textarea
                  className="w-full h-40 p-3 border rounded-md"
                  placeholder="Enter patient's complaints, history of present illness, past history, family history..."
                  value={soapNotes.subjective}
                  onChange={(e) => setSoapNotes(prev => ({ ...prev, subjective: e.target.value }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="examination" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Physical Examination Findings (Objective)</Label>
                <textarea
                  className="w-full h-40 p-3 border rounded-md"
                  placeholder="Enter general examination, systemic examination findings..."
                  value={soapNotes.objective}
                  onChange={(e) => setSoapNotes(prev => ({ ...prev, objective: e.target.value }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="diagnosis" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Diagnosis</Label>
                  <Input
                    placeholder="Primary diagnosis"
                    value={soapNotes.diagnosis}
                    onChange={(e) => setSoapNotes(prev => ({ ...prev, diagnosis: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ICD-10 Code</Label>
                  <Input
                    placeholder="e.g., J06.9"
                    value={soapNotes.icdCode}
                    onChange={(e) => setSoapNotes(prev => ({ ...prev, icdCode: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assessment & Clinical Impression</Label>
                <textarea
                  className="w-full h-24 p-3 border rounded-md"
                  placeholder="Clinical assessment, differential diagnosis..."
                  value={soapNotes.assessment}
                  onChange={(e) => setSoapNotes(prev => ({ ...prev, assessment: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Treatment Plan</Label>
                <textarea
                  className="w-full h-24 p-3 border rounded-md"
                  placeholder="Treatment plan, advice, follow-up instructions..."
                  value={soapNotes.plan}
                  onChange={(e) => setSoapNotes(prev => ({ ...prev, plan: e.target.value }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="orders" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Investigations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start" variant="outline" onClick={() => setIsLabDialogOpen(true)}>
                      <FlaskConical className="w-4 h-4 mr-2" />
                      Order Lab Tests
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setIsRadiologyDialogOpen(true)}>
                      <Scan className="w-4 h-4 mr-2" />
                      Order Radiology
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Prescription & Follow-up</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start" variant="outline" onClick={() => setIsPrescriptionDialogOpen(true)}>
                      <Pill className="w-4 h-4 mr-2" />
                      Write Prescription
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setIsFollowUpDialogOpen(true)}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Follow-up
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => handleSaveNotes(false)} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button onClick={() => handleSaveNotes(true)} disabled={saving}>
              <CheckCircle className="w-4 h-4 mr-2" />
              {saving ? 'Completing...' : 'Complete Consultation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lab Tests Dialog */}
      <Dialog open={isLabDialogOpen} onOpenChange={setIsLabDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Order Lab Tests</DialogTitle>
            <DialogDescription>Select laboratory investigations</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto py-4">
            <div className="grid grid-cols-1 gap-2">
              {labTests.map((test) => (
                <div
                  key={test.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-slate-50 ${selectedLabTests.includes(test.id) ? 'bg-blue-50 border-blue-300' : ''}`}
                  onClick={() => {
                    setSelectedLabTests(prev =>
                      prev.includes(test.id)
                        ? prev.filter(id => id !== test.id)
                        : [...prev, test.id]
                    );
                  }}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedLabTests.includes(test.id)}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium">{test.name}</p>
                      <p className="text-xs text-slate-500">{test.code} - {test.category}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">Rs. {test.price}</span>
                </div>
              ))}
              {labTests.length === 0 && (
                <p className="text-center py-8 text-slate-500">No lab tests available</p>
              )}
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium">Selected: {selectedLabTests.length} test(s)</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLabDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleOrderLabTests} disabled={saving || selectedLabTests.length === 0}>
              {saving ? 'Ordering...' : 'Order Tests'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Radiology Dialog */}
      <Dialog open={isRadiologyDialogOpen} onOpenChange={setIsRadiologyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Order Radiology Tests</DialogTitle>
            <DialogDescription>Select radiology investigations</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto py-4">
            <div className="grid grid-cols-1 gap-2">
              {radiologyTests.map((test) => (
                <div
                  key={test.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-slate-50 ${selectedRadiologyTests.includes(test.id) ? 'bg-blue-50 border-blue-300' : ''}`}
                  onClick={() => {
                    setSelectedRadiologyTests(prev =>
                      prev.includes(test.id)
                        ? prev.filter(id => id !== test.id)
                        : [...prev, test.id]
                    );
                  }}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedRadiologyTests.includes(test.id)}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium">{test.name}</p>
                      <p className="text-xs text-slate-500">{test.code} - {test.modality}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">Rs. {test.price}</span>
                </div>
              ))}
              {radiologyTests.length === 0 && (
                <p className="text-center py-8 text-slate-500">No radiology tests available</p>
              )}
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium">Selected: {selectedRadiologyTests.length} test(s)</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRadiologyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleOrderRadiology} disabled={saving || selectedRadiologyTests.length === 0}>
              {saving ? 'Ordering...' : 'Order Tests'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prescription Dialog */}
      <Dialog open={isPrescriptionDialogOpen} onOpenChange={setIsPrescriptionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Write Prescription</DialogTitle>
            <DialogDescription>Add medications for the patient</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Add new medication form */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label>Medication</Label>
                    <Select
                      value={newPrescriptionItem.drugId}
                      onValueChange={(value) => {
                        const drug = drugs.find(d => d.id === value);
                        setNewPrescriptionItem(prev => ({
                          ...prev,
                          drugId: value,
                          drugName: drug ? `${drug.name} ${drug.strength}` : ''
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select drug" />
                      </SelectTrigger>
                      <SelectContent>
                        {drugs.map(drug => (
                          <SelectItem key={drug.id} value={drug.id}>
                            {drug.name} {drug.strength} ({drug.form})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dosage</Label>
                    <Input
                      placeholder="1 tablet"
                      value={newPrescriptionItem.dosage}
                      onChange={(e) => setNewPrescriptionItem(prev => ({ ...prev, dosage: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={newPrescriptionItem.frequency}
                      onValueChange={(value) => setNewPrescriptionItem(prev => ({ ...prev, frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OD">Once daily (OD)</SelectItem>
                        <SelectItem value="BD">Twice daily (BD)</SelectItem>
                        <SelectItem value="TDS">Three times (TDS)</SelectItem>
                        <SelectItem value="QID">Four times (QID)</SelectItem>
                        <SelectItem value="SOS">As needed (SOS)</SelectItem>
                        <SelectItem value="HS">At bedtime (HS)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input
                      placeholder="5 days"
                      value={newPrescriptionItem.duration}
                      onChange={(e) => setNewPrescriptionItem(prev => ({ ...prev, duration: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddPrescriptionItem} className="w-full">Add</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prescription items list */}
            {prescriptionItems.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptionItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.drugName}</TableCell>
                        <TableCell>{item.dosage}</TableCell>
                        <TableCell>{item.frequency}</TableCell>
                        <TableCell>{item.duration}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPrescriptionItems(prev => prev.filter((_, i) => i !== index))}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrescriptionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePrescription} disabled={saving || prescriptionItems.length === 0}>
              {saving ? 'Saving...' : 'Save Prescription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={isFollowUpDialogOpen} onOpenChange={setIsFollowUpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up Appointment</DialogTitle>
            <DialogDescription>Set next appointment date for the patient</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <textarea
                className="w-full p-3 border rounded-md"
                rows={3}
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="Special instructions or reason for follow-up..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFollowUpDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleScheduleFollowUp} disabled={saving || !followUpDate}>
              {saving ? 'Scheduling...' : 'Schedule Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
