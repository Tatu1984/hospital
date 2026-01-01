import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Bed, LogOut, Search, Settings, Building2, Trash2, Edit } from 'lucide-react';
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

interface Ward {
  id: string;
  name: string;
  type: string;
  floor?: string;
  building?: string;
  totalBeds: number;
  tariffPerDay: number;
  isActive: boolean;
  occupiedBeds?: number;
  vacantBeds?: number;
  actualTotalBeds?: number;
}

interface Bed {
  id: string;
  bedNumber: string;
  wardId?: string;
  ward?: {
    id: string;
    name: string;
    building?: string;
    floor?: string;
    tariffPerDay?: number;
  };
  status: string;
  bedType: string;
  category: string;
  dailyRate?: number;
  floor?: string;
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
  const [wards, setWards] = useState<Ward[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isAdmitDialogOpen, setIsAdmitDialogOpen] = useState(false);
  const [isDischargeDialogOpen, setIsDischargeDialogOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Bed Management State
  const [isBedDialogOpen, setIsBedDialogOpen] = useState(false);
  const [isWardDialogOpen, setIsWardDialogOpen] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [bedFormData, setBedFormData] = useState({
    bedNumber: '',
    wardId: '',
    category: 'general',
    status: 'vacant',
    floor: '',
    dailyRate: ''
  });
  const [wardFormData, setWardFormData] = useState({
    name: '',
    type: 'general',
    floor: '',
    building: '',
    totalBeds: 0,
    tariffPerDay: ''
  });

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

  useEffect(() => {
    fetchAdmissions();
    fetchBeds();
    fetchWards();
    fetchPatients();
  }, []);

  const fetchWards = async () => {
    try {
      const response = await api.get('/api/wards');
      setWards(response.data);
    } catch (error) {
      console.error('Error fetching wards:', error);
    }
  };

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

  // Bed CRUD operations
  const openBedDialog = (bed?: Bed) => {
    if (bed) {
      setEditingBed(bed);
      setBedFormData({
        bedNumber: bed.bedNumber,
        wardId: bed.wardId || '',
        category: bed.category || 'general',
        status: bed.status || 'vacant',
        floor: bed.floor || '',
        dailyRate: bed.dailyRate?.toString() || ''
      });
    } else {
      setEditingBed(null);
      setBedFormData({
        bedNumber: '',
        wardId: '',
        category: 'general',
        status: 'vacant',
        floor: '',
        dailyRate: ''
      });
    }
    setIsBedDialogOpen(true);
  };

  const handleSaveBed = async () => {
    setLoading(true);
    try {
      const payload = {
        bedNumber: bedFormData.bedNumber,
        wardId: bedFormData.wardId || null,
        category: bedFormData.category,
        status: bedFormData.status,
        floor: bedFormData.floor || null,
        dailyRate: bedFormData.dailyRate ? parseFloat(bedFormData.dailyRate) : null
      };

      if (editingBed) {
        await api.put(`/api/beds/${editingBed.id}`, payload);
      } else {
        await api.post('/api/beds', payload);
      }

      await fetchBeds();
      setIsBedDialogOpen(false);
      setEditingBed(null);
    } catch (error: any) {
      console.error('Error saving bed:', error);
      alert(error.response?.data?.error || 'Failed to save bed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBed = async (bedId: string) => {
    if (!confirm('Are you sure you want to delete this bed?')) return;

    try {
      await api.delete(`/api/beds/${bedId}`);
      await fetchBeds();
    } catch (error: any) {
      console.error('Error deleting bed:', error);
      alert(error.response?.data?.error || 'Failed to delete bed');
    }
  };

  // Ward CRUD operations
  const openWardDialog = (ward?: Ward) => {
    if (ward) {
      setEditingWard(ward);
      setWardFormData({
        name: ward.name,
        type: ward.type,
        floor: ward.floor || '',
        building: ward.building || '',
        totalBeds: ward.totalBeds,
        tariffPerDay: ward.tariffPerDay?.toString() || ''
      });
    } else {
      setEditingWard(null);
      setWardFormData({
        name: '',
        type: 'general',
        floor: '',
        building: '',
        totalBeds: 0,
        tariffPerDay: ''
      });
    }
    setIsWardDialogOpen(true);
  };

  const handleSaveWard = async () => {
    setLoading(true);
    try {
      const payload = {
        name: wardFormData.name,
        type: wardFormData.type,
        floor: wardFormData.floor || null,
        building: wardFormData.building || null,
        totalBeds: wardFormData.totalBeds,
        tariffPerDay: wardFormData.tariffPerDay ? parseFloat(wardFormData.tariffPerDay) : 0
      };

      if (editingWard) {
        await api.put(`/api/wards/${editingWard.id}`, payload);
      } else {
        await api.post('/api/wards', payload);
      }

      await fetchWards();
      await fetchBeds();
      setIsWardDialogOpen(false);
      setEditingWard(null);
    } catch (error: any) {
      console.error('Error saving ward:', error);
      alert(error.response?.data?.error || 'Failed to save ward');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWard = async (wardId: string) => {
    if (!confirm('Are you sure you want to delete this ward? All beds must be reassigned first.')) return;

    try {
      await api.delete(`/api/wards/${wardId}`);
      await fetchWards();
    } catch (error: any) {
      console.error('Error deleting ward:', error);
      alert(error.response?.data?.error || 'Failed to delete ward');
    }
  };

  const filteredAdmissions = admissions.filter(adm =>
    adm.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adm.patientMRN.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adm.ward.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableBeds = beds.filter(bed => bed.status === 'vacant' || bed.status === 'available');
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
                        {bed.ward?.name || 'Unassigned'} - {bed.bedNumber} ({bed.bedType || bed.category})
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

      {/* Bed & Ward Management Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <CardTitle>Bed & Ward Management</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openWardDialog()}>
                <Building2 className="w-4 h-4 mr-2" />
                Add Ward
              </Button>
              <Button onClick={() => openBedDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Bed
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="beds">
            <TabsList>
              <TabsTrigger value="beds">Beds ({beds.length})</TabsTrigger>
              <TabsTrigger value="wards">Wards ({wards.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="beds">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bed Number</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Daily Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {beds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No beds configured. Add your first bed to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    beds.map((bed) => (
                      <TableRow key={bed.id}>
                        <TableCell className="font-medium">{bed.bedNumber}</TableCell>
                        <TableCell>{bed.ward?.name || 'Unassigned'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{bed.category || bed.bedType}</Badge>
                        </TableCell>
                        <TableCell>{bed.floor || bed.ward?.floor || '-'}</TableCell>
                        <TableCell>
                          {bed.dailyRate ? `₹${bed.dailyRate}` : (bed.ward?.tariffPerDay ? `₹${bed.ward.tariffPerDay}` : '-')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={bed.status === 'vacant' ? 'default' : bed.status === 'occupied' ? 'destructive' : 'secondary'}>
                            {bed.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openBedDialog(bed)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteBed(bed.id)} disabled={bed.status === 'occupied'}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="wards">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ward Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Beds (Occupied/Total)</TableHead>
                    <TableHead>Tariff/Day</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No wards configured. Add your first ward to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    wards.map((ward) => (
                      <TableRow key={ward.id}>
                        <TableCell className="font-medium">{ward.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ward.type}</Badge>
                        </TableCell>
                        <TableCell>{ward.building || '-'}</TableCell>
                        <TableCell>{ward.floor || '-'}</TableCell>
                        <TableCell>
                          <span className="text-orange-600">{ward.occupiedBeds || 0}</span>
                          {' / '}
                          <span className="text-green-600">{ward.actualTotalBeds || ward.totalBeds}</span>
                        </TableCell>
                        <TableCell>₹{ward.tariffPerDay}</TableCell>
                        <TableCell>
                          <Badge variant={ward.isActive ? 'default' : 'secondary'}>
                            {ward.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openWardDialog(ward)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteWard(ward.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
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

      {/* Bed Dialog */}
      <Dialog open={isBedDialogOpen} onOpenChange={setIsBedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBed ? 'Edit Bed' : 'Add New Bed'}</DialogTitle>
            <DialogDescription>
              {editingBed ? 'Update bed details' : 'Add a new bed to the hospital'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedNumber">Bed Number *</Label>
                <Input
                  id="bedNumber"
                  value={bedFormData.bedNumber}
                  onChange={(e) => setBedFormData(prev => ({ ...prev, bedNumber: e.target.value }))}
                  placeholder="e.g., B-101"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wardId">Ward</Label>
                <Select value={bedFormData.wardId} onValueChange={(value) => setBedFormData(prev => ({ ...prev, wardId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ward" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Ward</SelectItem>
                    {wards.map((ward) => (
                      <SelectItem key={ward.id} value={ward.id}>{ward.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={bedFormData.category} onValueChange={(value) => setBedFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="semi-private">Semi-Private</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="deluxe">Deluxe</SelectItem>
                    <SelectItem value="icu">ICU</SelectItem>
                    <SelectItem value="nicu">NICU</SelectItem>
                    <SelectItem value="isolation">Isolation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={bedFormData.status} onValueChange={(value) => setBedFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  value={bedFormData.floor}
                  onChange={(e) => setBedFormData(prev => ({ ...prev, floor: e.target.value }))}
                  placeholder="e.g., 2nd Floor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyRate">Daily Rate (₹)</Label>
                <Input
                  id="dailyRate"
                  type="number"
                  value={bedFormData.dailyRate}
                  onChange={(e) => setBedFormData(prev => ({ ...prev, dailyRate: e.target.value }))}
                  placeholder="Override ward tariff"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBedDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSaveBed} disabled={loading || !bedFormData.bedNumber}>
              {loading ? 'Saving...' : (editingBed ? 'Update Bed' : 'Add Bed')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ward Dialog */}
      <Dialog open={isWardDialogOpen} onOpenChange={setIsWardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWard ? 'Edit Ward' : 'Add New Ward'}</DialogTitle>
            <DialogDescription>
              {editingWard ? 'Update ward details' : 'Add a new ward to the hospital'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wardName">Ward Name *</Label>
                <Input
                  id="wardName"
                  value={wardFormData.name}
                  onChange={(e) => setWardFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., General Ward A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wardType">Type *</Label>
                <Select value={wardFormData.type} onValueChange={(value) => setWardFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="semi-private">Semi-Private</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="icu">ICU</SelectItem>
                    <SelectItem value="nicu">NICU</SelectItem>
                    <SelectItem value="maternity">Maternity</SelectItem>
                    <SelectItem value="pediatric">Pediatric</SelectItem>
                    <SelectItem value="surgical">Surgical</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <Input
                  id="building"
                  value={wardFormData.building}
                  onChange={(e) => setWardFormData(prev => ({ ...prev, building: e.target.value }))}
                  placeholder="e.g., Main Building"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wardFloor">Floor</Label>
                <Input
                  id="wardFloor"
                  value={wardFormData.floor}
                  onChange={(e) => setWardFormData(prev => ({ ...prev, floor: e.target.value }))}
                  placeholder="e.g., Ground Floor"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalBeds">Total Beds Capacity</Label>
                <Input
                  id="totalBeds"
                  type="number"
                  value={wardFormData.totalBeds}
                  onChange={(e) => setWardFormData(prev => ({ ...prev, totalBeds: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tariffPerDay">Tariff Per Day (₹) *</Label>
                <Input
                  id="tariffPerDay"
                  type="number"
                  value={wardFormData.tariffPerDay}
                  onChange={(e) => setWardFormData(prev => ({ ...prev, tariffPerDay: e.target.value }))}
                  placeholder="e.g., 1500"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWardDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSaveWard} disabled={loading || !wardFormData.name || !wardFormData.type}>
              {loading ? 'Saving...' : (editingWard ? 'Update Ward' : 'Add Ward')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
