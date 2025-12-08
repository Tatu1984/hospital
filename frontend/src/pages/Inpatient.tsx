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
import { Plus, Bed, ArrowRightLeft, LogOut, FileText, Activity, Search } from 'lucide-react';
import api from '../services/api';

interface Admission {
  id: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  bedId: string | null;
  bedNumber: string;
  ward: string;
  admissionDate: string;
  status: string;
  diagnosis: string;
  admittingDoctor: string;
}

interface Bed {
  id: string;
  bedNumber: string;
  ward: {
    name: string;
    building: string;
    floor: string;
  };
  status: string;
  bedType: string;
}

interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  contact: string;
}

export default function Inpatient() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isAdmitDialogOpen, setIsAdmitDialogOpen] = useState(false);
  const [isDischargeDialogOpen, setIsDischargeDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [admitFormData, setAdmitFormData] = useState({
    patientId: '',
    bedId: '',
    diagnosis: '',
    admissionNotes: ''
  });

  const [dischargeFormData, setDischargeFormData] = useState({
    dischargeSummary: '',
    followUpDate: '',
    instructions: ''
  });

  const [transferFormData, setTransferFormData] = useState({
    newBedId: '',
    reason: ''
  });

  useEffect(() => {
    fetchAdmissions();
    fetchBeds();
    fetchPatients();
  }, []);

  const fetchAdmissions = async () => {
    try {
      const response = await api.get('/api/admissions');

      const transformedAdmissions = response.data.map((adm: any) => ({
        id: adm.id,
        patientId: adm.patientId,
        patientName: adm.patient?.name || '',
        patientMRN: adm.patient?.mrn || '',
        bedId: adm.bedId,
        bedNumber: adm.bed?.bedNumber || 'Unassigned',
        ward: adm.bed?.ward?.name || 'N/A',
        admissionDate: new Date(adm.admissionDate).toLocaleDateString(),
        status: adm.status,
        diagnosis: adm.diagnosis || '',
        admittingDoctor: 'Dr. ' + (adm.admittingDoctorId?.substring(0, 8) || 'Unknown')
      }));

      setAdmissions(transformedAdmissions);
    } catch (error) {
      console.error('Error fetching admissions:', error);
    }
  };

  const fetchBeds = async () => {
    try {
      const response = await api.get('/api/beds');
      setBeds(response.data);
    } catch (error) {
      console.error('Error fetching beds:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/api/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleAdmit = async () => {
    setLoading(true);
    try {
      await api.post('/api/admissions', {
        patientId: admitFormData.patientId,
        bedId: admitFormData.bedId || null,
        diagnosis: admitFormData.diagnosis,
        admissionNotes: admitFormData.admissionNotes
      });

      await fetchAdmissions();
      await fetchBeds();
      setIsAdmitDialogOpen(false);
      setAdmitFormData({ patientId: '', bedId: '', diagnosis: '', admissionNotes: '' });
    } catch (error) {
      console.error('Error admitting patient:', error);
      alert('Failed to admit patient');
    } finally {
      setLoading(false);
    }
  };

  const handleDischarge = async () => {
    if (!selectedAdmission) return;

    setLoading(true);
    try {
      await api.post(`/api/admissions/${selectedAdmission.id}/discharge`, {
        dischargeSummary: dischargeFormData.dischargeSummary,
        followUpDate: dischargeFormData.followUpDate || null,
        instructions: dischargeFormData.instructions
      });

      await fetchAdmissions();
      await fetchBeds();
      setIsDischargeDialogOpen(false);
      setSelectedAdmission(null);
      setDischargeFormData({ dischargeSummary: '', followUpDate: '', instructions: '' });
    } catch (error) {
      console.error('Error discharging patient:', error);
      alert('Failed to discharge patient');
    } finally {
      setLoading(false);
    }
  };

  const openDischargeDialog = (admission: Admission) => {
    setSelectedAdmission(admission);
    setIsDischargeDialogOpen(true);
  };

  const openTransferDialog = (admission: Admission) => {
    setSelectedAdmission(admission);
    setIsTransferDialogOpen(true);
  };

  const filteredAdmissions = admissions.filter(adm =>
    adm.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adm.patientMRN.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adm.ward.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableBeds = beds.filter(bed => bed.status === 'available');
  const occupiedBeds = beds.filter(bed => bed.status === 'occupied');
  const activeAdmissions = admissions.filter(adm => adm.status === 'active');

  const stats = {
    totalBeds: beds.length,
    occupied: occupiedBeds.length,
    available: availableBeds.length,
    activeAdmissions: activeAdmissions.length
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inpatient Department (IPD)</h1>
          <p className="text-slate-600">Ward management, admissions, and patient care</p>
        </div>
        <Dialog open={isAdmitDialogOpen} onOpenChange={setIsAdmitDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Admission
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Admit Patient</DialogTitle>
              <DialogDescription>Admit a patient to the ward</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="patient">Patient *</Label>
                <Select value={admitFormData.patientId} onValueChange={(value) => setAdmitFormData(prev => ({ ...prev, patientId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} - {patient.mrn} ({patient.age}Y, {patient.gender})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bed">Bed Assignment</Label>
                <Select value={admitFormData.bedId} onValueChange={(value) => setAdmitFormData(prev => ({ ...prev, bedId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bed (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBeds.map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>
                        {bed.ward.name} - {bed.bedNumber} ({bed.bedType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnosis">Admission Diagnosis *</Label>
                <Input
                  id="diagnosis"
                  value={admitFormData.diagnosis}
                  onChange={(e) => setAdmitFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="Primary diagnosis for admission"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admissionNotes">Admission Notes</Label>
                <textarea
                  id="admissionNotes"
                  className="w-full min-h-[100px] p-3 border rounded-md"
                  value={admitFormData.admissionNotes}
                  onChange={(e) => setAdmitFormData(prev => ({ ...prev, admissionNotes: e.target.value }))}
                  placeholder="Admission notes, history, plan..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAdmitDialogOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleAdmit} disabled={loading || !admitFormData.patientId || !admitFormData.diagnosis}>
                {loading ? 'Admitting...' : 'Admit Patient'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Beds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBeds}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.occupied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Admissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeAdmissions}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Current Admissions</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search patients, ward..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Active ({activeAdmissions.length})</TabsTrigger>
              <TabsTrigger value="all">All Admissions</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Ward / Bed</TableHead>
                    <TableHead>Admission Date</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmissions.filter(a => a.status === 'active').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No active admissions
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAdmissions.filter(a => a.status === 'active').map((admission) => (
                      <TableRow key={admission.id}>
                        <TableCell className="font-medium">{admission.patientName}</TableCell>
                        <TableCell>{admission.patientMRN}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Bed className="w-4 h-4" />
                            {admission.ward} / {admission.bedNumber}
                          </div>
                        </TableCell>
                        <TableCell>{admission.admissionDate}</TableCell>
                        <TableCell className="text-sm">{admission.diagnosis}</TableCell>
                        <TableCell>{admission.admittingDoctor}</TableCell>
                        <TableCell>
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openTransferDialog(admission)}
                            >
                              <ArrowRightLeft className="w-4 h-4 mr-1" />
                              Transfer
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openDischargeDialog(admission)}
                            >
                              <LogOut className="w-4 h-4 mr-1" />
                              Discharge
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="all">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Ward / Bed</TableHead>
                    <TableHead>Admission Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmissions.map((admission) => (
                    <TableRow key={admission.id}>
                      <TableCell className="font-medium">{admission.patientName}</TableCell>
                      <TableCell>{admission.patientMRN}</TableCell>
                      <TableCell>{admission.ward} / {admission.bedNumber}</TableCell>
                      <TableCell>{admission.admissionDate}</TableCell>
                      <TableCell>
                        <Badge variant={admission.status === 'active' ? 'default' : 'secondary'}>
                          {admission.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Discharge Dialog */}
      <Dialog open={isDischargeDialogOpen} onOpenChange={setIsDischargeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Discharge Patient</DialogTitle>
            <DialogDescription>
              Patient: {selectedAdmission?.patientName} ({selectedAdmission?.patientMRN})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dischargeSummary">Discharge Summary *</Label>
              <textarea
                id="dischargeSummary"
                className="w-full min-h-[150px] p-3 border rounded-md"
                value={dischargeFormData.dischargeSummary}
                onChange={(e) => setDischargeFormData(prev => ({ ...prev, dischargeSummary: e.target.value }))}
                placeholder="Final diagnosis, treatment given, outcome..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="followUpDate">Follow-up Date</Label>
              <Input
                id="followUpDate"
                type="date"
                value={dischargeFormData.followUpDate}
                onChange={(e) => setDischargeFormData(prev => ({ ...prev, followUpDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Discharge Instructions</Label>
              <textarea
                id="instructions"
                className="w-full min-h-[100px] p-3 border rounded-md"
                value={dischargeFormData.instructions}
                onChange={(e) => setDischargeFormData(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Home care instructions, medications, activity restrictions..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDischargeDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleDischarge} disabled={loading || !dischargeFormData.dischargeSummary}>
              {loading ? 'Discharging...' : 'Confirm Discharge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
