import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, UserPlus, Clock, Activity, AlertTriangle, CheckCircle2, Users, Bed, FileText, Shield } from 'lucide-react';
import api from '../services/api';

interface EmergencyCase {
  id: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  age: number;
  gender: string;
  arrivalTime: string;
  triageCategory: 'RED' | 'YELLOW' | 'GREEN';
  chiefComplaint: string;
  vitalSigns: {
    bp: string;
    pulse: string;
    temperature: string;
    spo2: string;
    respiratoryRate: string;
  };
  status: string;
  assignedDoctor: string;
  isMLC: boolean;
  mlcNumber?: string;
  waitingTime?: string;
}

interface TriageFormData {
  patientId: string;
  patientName: string;
  age: string;
  gender: string;
  chiefComplaint: string;
  triageCategory: string;
  bp: string;
  pulse: string;
  temperature: string;
  spo2: string;
  respiratoryRate: string;
  isMLC: boolean;
  mlcNumber: string;
  guardianName: string;
  guardianPhone: string;
}

export default function Emergency() {
  const [emergencyCases, setEmergencyCases] = useState<EmergencyCase[]>([]);
  const [isTriageDialogOpen, setIsTriageDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<EmergencyCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [triageFormData, setTriageFormData] = useState<TriageFormData>({
    patientId: '',
    patientName: '',
    age: '',
    gender: '',
    chiefComplaint: '',
    triageCategory: 'YELLOW',
    bp: '',
    pulse: '',
    temperature: '',
    spo2: '',
    respiratoryRate: '',
    isMLC: false,
    mlcNumber: '',
    guardianName: '',
    guardianPhone: ''
  });

  useEffect(() => {
    fetchEmergencyCases();
    const interval = setInterval(fetchEmergencyCases, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchEmergencyCases = async () => {
    try {
      const response = await api.get('/api/emergency/cases');
      const transformedCases = response.data.map((c: any) => {
        const arrivalTime = new Date(c.arrivalTime);
        const now = new Date();
        const waitingMinutes = Math.floor((now.getTime() - arrivalTime.getTime()) / 60000);

        return {
          id: c.id,
          patientId: c.patientId,
          patientName: c.patient?.name || 'Unknown',
          patientMRN: c.patient?.mrn || 'N/A',
          age: c.patient?.age || 0,
          gender: c.patient?.gender || 'Unknown',
          arrivalTime: arrivalTime.toLocaleTimeString(),
          triageCategory: c.triageCategory,
          chiefComplaint: c.chiefComplaint,
          vitalSigns: c.vitalSigns || {},
          status: c.status,
          assignedDoctor: c.assignedDoctor || 'Unassigned',
          isMLC: c.isMLC || false,
          mlcNumber: c.mlcNumber,
          waitingTime: `${waitingMinutes} min`
        };
      });
      setEmergencyCases(transformedCases);
    } catch (error) {
      console.error('Error fetching emergency cases:', error);
    }
  };

  const handleTriage = async () => {
    setLoading(true);
    try {
      await api.post('/api/emergency/cases', {
        patientId: triageFormData.patientId || null,
        patientName: triageFormData.patientName,
        age: parseInt(triageFormData.age),
        gender: triageFormData.gender,
        chiefComplaint: triageFormData.chiefComplaint,
        triageCategory: triageFormData.triageCategory,
        vitalSigns: {
          bp: triageFormData.bp,
          pulse: triageFormData.pulse,
          temperature: triageFormData.temperature,
          spo2: triageFormData.spo2,
          respiratoryRate: triageFormData.respiratoryRate
        },
        isMLC: triageFormData.isMLC,
        mlcNumber: triageFormData.isMLC ? triageFormData.mlcNumber : null,
        guardianName: triageFormData.guardianName,
        guardianPhone: triageFormData.guardianPhone
      });

      await fetchEmergencyCases();
      setIsTriageDialogOpen(false);
      resetTriageForm();
    } catch (error) {
      console.error('Error creating emergency case:', error);
      alert('Failed to create emergency case');
    } finally {
      setLoading(false);
    }
  };

  const handleAdmit = async (caseId: string) => {
    setLoading(true);
    try {
      await api.post(`/api/emergency/cases/${caseId}/admit`);
      await fetchEmergencyCases();
      alert('Patient admitted successfully');
    } catch (error) {
      console.error('Error admitting patient:', error);
      alert('Failed to admit patient');
    } finally {
      setLoading(false);
    }
  };

  const handleDischarge = async (caseId: string) => {
    setLoading(true);
    try {
      await api.post(`/api/emergency/cases/${caseId}/discharge`);
      await fetchEmergencyCases();
      alert('Patient discharged successfully');
    } catch (error) {
      console.error('Error discharging patient:', error);
      alert('Failed to discharge patient');
    } finally {
      setLoading(false);
    }
  };

  const resetTriageForm = () => {
    setTriageFormData({
      patientId: '',
      patientName: '',
      age: '',
      gender: '',
      chiefComplaint: '',
      triageCategory: 'YELLOW',
      bp: '',
      pulse: '',
      temperature: '',
      spo2: '',
      respiratoryRate: '',
      isMLC: false,
      mlcNumber: '',
      guardianName: '',
      guardianPhone: ''
    });
  };

  const openDetailsDialog = (emergencyCase: EmergencyCase) => {
    setSelectedCase(emergencyCase);
    setIsDetailsDialogOpen(true);
  };

  const getTriageBadgeColor = (category: string) => {
    switch (category) {
      case 'RED':
        return 'bg-red-600 text-white';
      case 'YELLOW':
        return 'bg-yellow-500 text-white';
      case 'GREEN':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const stats = {
    totalActive: emergencyCases.filter(c => c.status === 'ACTIVE').length,
    critical: emergencyCases.filter(c => c.triageCategory === 'RED' && c.status === 'ACTIVE').length,
    urgent: emergencyCases.filter(c => c.triageCategory === 'YELLOW' && c.status === 'ACTIVE').length,
    stable: emergencyCases.filter(c => c.triageCategory === 'GREEN' && c.status === 'ACTIVE').length,
    mlcCases: emergencyCases.filter(c => c.isMLC && c.status === 'ACTIVE').length
  };

  const activeCases = emergencyCases.filter(c => c.status === 'ACTIVE');
  const redCases = activeCases.filter(c => c.triageCategory === 'RED');
  const yellowCases = activeCases.filter(c => c.triageCategory === 'YELLOW');
  const greenCases = activeCases.filter(c => c.triageCategory === 'GREEN');

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Emergency / Casualty</h1>
          <p className="text-slate-600">Triage, emergency board, and critical care management</p>
        </div>
        <Button onClick={() => setIsTriageDialogOpen(true)} size="lg">
          <UserPlus className="w-5 h-5 mr-2" />
          New Triage
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Active Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActive}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              Critical (Red)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="w-4 h-4" />
              Urgent (Yellow)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.urgent}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              Stable (Green)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.stable}</div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-700">
              <Shield className="w-4 h-4" />
              MLC Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.mlcCases}</div>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Board */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Board</CardTitle>
          <CardDescription>Real-time tracking of all emergency patients</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Active ({stats.totalActive})</TabsTrigger>
              <TabsTrigger value="red">Critical ({stats.critical})</TabsTrigger>
              <TabsTrigger value="yellow">Urgent ({stats.urgent})</TabsTrigger>
              <TabsTrigger value="green">Stable ({stats.stable})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Wait Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Age/Gender</TableHead>
                    <TableHead>Triage</TableHead>
                    <TableHead>Chief Complaint</TableHead>
                    <TableHead>Vitals</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeCases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                        No active emergency cases
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeCases.map((c) => (
                      <TableRow key={c.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{c.arrivalTime}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <span>{c.waitingTime}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {c.patientName}
                              {c.isMLC && <Shield className="w-4 h-4 text-purple-600" />}
                            </div>
                            <div className="text-xs text-slate-500">{c.patientMRN}</div>
                          </div>
                        </TableCell>
                        <TableCell>{c.age}/{c.gender}</TableCell>
                        <TableCell>
                          <Badge className={getTriageBadgeColor(c.triageCategory)}>
                            {c.triageCategory}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{c.chiefComplaint}</TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            <div>BP: {c.vitalSigns.bp || 'N/A'}</div>
                            <div>SpO2: {c.vitalSigns.spo2 || 'N/A'}%</div>
                          </div>
                        </TableCell>
                        <TableCell>{c.assignedDoctor}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openDetailsDialog(c)}>
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button size="sm" onClick={() => handleAdmit(c.id)}>
                              <Bed className="w-4 h-4 mr-1" />
                              Admit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="red">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Wait Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Chief Complaint</TableHead>
                    <TableHead>Vitals</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redCases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        No critical cases
                      </TableCell>
                    </TableRow>
                  ) : (
                    redCases.map((c) => (
                      <TableRow key={c.id} className="bg-red-50">
                        <TableCell className="font-medium">{c.arrivalTime}</TableCell>
                        <TableCell>{c.waitingTime}</TableCell>
                        <TableCell>
                          <div className="font-medium">{c.patientName}</div>
                          <div className="text-xs text-slate-500">{c.patientMRN}</div>
                        </TableCell>
                        <TableCell>{c.chiefComplaint}</TableCell>
                        <TableCell>
                          <div className="text-xs">BP: {c.vitalSigns.bp}, SpO2: {c.vitalSigns.spo2}%</div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => handleAdmit(c.id)}>
                            <Bed className="w-4 h-4 mr-1" />
                            Admit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="yellow">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Chief Complaint</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yellowCases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        No urgent cases
                      </TableCell>
                    </TableRow>
                  ) : (
                    yellowCases.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.arrivalTime}</TableCell>
                        <TableCell>{c.patientName}</TableCell>
                        <TableCell>{c.chiefComplaint}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => openDetailsDialog(c)}>
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="green">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Chief Complaint</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {greenCases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        No stable cases
                      </TableCell>
                    </TableRow>
                  ) : (
                    greenCases.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.arrivalTime}</TableCell>
                        <TableCell>{c.patientName}</TableCell>
                        <TableCell>{c.chiefComplaint}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleDischarge(c.id)}>
                            Discharge
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Triage Dialog */}
      <Dialog open={isTriageDialogOpen} onOpenChange={setIsTriageDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emergency Triage - New Patient</DialogTitle>
            <DialogDescription>
              Quick registration and triage assessment for emergency patient
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient Name *</Label>
                <Input
                  placeholder="Enter patient name"
                  value={triageFormData.patientName}
                  onChange={(e) => setTriageFormData({ ...triageFormData, patientName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Existing MRN (Optional)</Label>
                <Input
                  placeholder="Search existing patient"
                  value={triageFormData.patientId}
                  onChange={(e) => setTriageFormData({ ...triageFormData, patientId: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Age *</Label>
                <Input
                  type="number"
                  placeholder="Age"
                  value={triageFormData.age}
                  onChange={(e) => setTriageFormData({ ...triageFormData, age: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select
                  value={triageFormData.gender}
                  onValueChange={(value) => setTriageFormData({ ...triageFormData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Chief Complaint *</Label>
              <textarea
                className="w-full min-h-[80px] p-3 border rounded-md"
                placeholder="Brief description of presenting complaint..."
                value={triageFormData.chiefComplaint}
                onChange={(e) => setTriageFormData({ ...triageFormData, chiefComplaint: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Triage Category *</Label>
              <Select
                value={triageFormData.triageCategory}
                onValueChange={(value) => setTriageFormData({ ...triageFormData, triageCategory: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RED">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-600"></div>
                      RED - Critical (Immediate)
                    </div>
                  </SelectItem>
                  <SelectItem value="YELLOW">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      YELLOW - Urgent (15-30 min)
                    </div>
                  </SelectItem>
                  <SelectItem value="GREEN">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-600"></div>
                      GREEN - Stable (60+ min)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Vital Signs</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>BP (mmHg)</Label>
                  <Input
                    placeholder="120/80"
                    value={triageFormData.bp}
                    onChange={(e) => setTriageFormData({ ...triageFormData, bp: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pulse (bpm)</Label>
                  <Input
                    placeholder="72"
                    value={triageFormData.pulse}
                    onChange={(e) => setTriageFormData({ ...triageFormData, pulse: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temp (°F)</Label>
                  <Input
                    placeholder="98.6"
                    value={triageFormData.temperature}
                    onChange={(e) => setTriageFormData({ ...triageFormData, temperature: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SpO2 (%)</Label>
                  <Input
                    placeholder="98"
                    value={triageFormData.spo2}
                    onChange={(e) => setTriageFormData({ ...triageFormData, spo2: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RR (per min)</Label>
                  <Input
                    placeholder="16"
                    value={triageFormData.respiratoryRate}
                    onChange={(e) => setTriageFormData({ ...triageFormData, respiratoryRate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="mlc"
                  checked={triageFormData.isMLC}
                  onChange={(e) => setTriageFormData({ ...triageFormData, isMLC: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="mlc" className="cursor-pointer">
                  Medico-Legal Case (MLC)
                </Label>
              </div>
              {triageFormData.isMLC && (
                <div className="space-y-2">
                  <Label>MLC Number</Label>
                  <Input
                    placeholder="MLC number"
                    value={triageFormData.mlcNumber}
                    onChange={(e) => setTriageFormData({ ...triageFormData, mlcNumber: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Guardian/Attendant Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="Guardian name"
                    value={triageFormData.guardianName}
                    onChange={(e) => setTriageFormData({ ...triageFormData, guardianName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="Contact number"
                    value={triageFormData.guardianPhone}
                    onChange={(e) => setTriageFormData({ ...triageFormData, guardianPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTriageDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleTriage} disabled={loading}>
              {loading ? 'Creating...' : 'Complete Triage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Case Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Emergency Case Details</DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-slate-500">Patient Name</Label>
                  <div className="font-medium">{selectedCase.patientName}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">MRN</Label>
                  <div className="font-medium">{selectedCase.patientMRN}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Age / Gender</Label>
                  <div className="font-medium">{selectedCase.age} / {selectedCase.gender}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Arrival Time</Label>
                  <div className="font-medium">{selectedCase.arrivalTime}</div>
                </div>
              </div>

              <div>
                <Label className="text-sm text-slate-500">Triage Category</Label>
                <div className="mt-1">
                  <Badge className={getTriageBadgeColor(selectedCase.triageCategory)}>
                    {selectedCase.triageCategory}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm text-slate-500">Chief Complaint</Label>
                <div className="font-medium">{selectedCase.chiefComplaint}</div>
              </div>

              <div>
                <Label className="text-sm text-slate-500">Vital Signs</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="p-3 bg-slate-50 rounded-md">
                    <div className="text-xs text-slate-500">Blood Pressure</div>
                    <div className="font-semibold">{selectedCase.vitalSigns.bp || 'N/A'}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-md">
                    <div className="text-xs text-slate-500">Pulse</div>
                    <div className="font-semibold">{selectedCase.vitalSigns.pulse || 'N/A'} bpm</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-md">
                    <div className="text-xs text-slate-500">Temperature</div>
                    <div className="font-semibold">{selectedCase.vitalSigns.temperature || 'N/A'}°F</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-md">
                    <div className="text-xs text-slate-500">SpO2</div>
                    <div className="font-semibold">{selectedCase.vitalSigns.spo2 || 'N/A'}%</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-md">
                    <div className="text-xs text-slate-500">Respiratory Rate</div>
                    <div className="font-semibold">{selectedCase.vitalSigns.respiratoryRate || 'N/A'}/min</div>
                  </div>
                </div>
              </div>

              {selectedCase.isMLC && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex items-center gap-2 text-purple-700 font-semibold mb-1">
                    <Shield className="w-5 h-5" />
                    Medico-Legal Case
                  </div>
                  <div className="text-sm">MLC Number: {selectedCase.mlcNumber || 'Pending'}</div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => handleAdmit(selectedCase.id)} className="flex-1">
                  <Bed className="w-4 h-4 mr-2" />
                  Admit to IPD
                </Button>
                <Button variant="outline" onClick={() => handleDischarge(selectedCase.id)} className="flex-1">
                  Discharge
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
