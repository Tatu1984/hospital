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
import { Textarea } from '@/components/ui/textarea';
import { Heart, Activity, Droplet, Thermometer, Users, Bed, TrendingUp, FileText, Eye, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import BedPatientDetails from '../components/BedPatientDetails';

interface HDUBed {
  id: string;
  bedNumber: string;
  hduUnit: string;
  status: string;
  patient?: {
    id: string;
    name: string;
    mrn: string;
    age: number;
    gender: string;
  };
  admission?: {
    id: string;
    admissionDate: string;
    diagnosis: string;
    sourceUnit?: string; // ICU, Ward, etc.
  };
  latestVitals?: {
    hr: string;
    bp: string;
    spo2: string;
    temp: string;
    rr: string;
    timestamp: string;
  };
}

interface VitalsFormData {
  bedId: string;
  hr: string;
  bp: string;
  spo2: string;
  temp: string;
  rr: string;
  gcs: string;
  notes: string;
}

interface AvailableBed {
  id: string;
  bedNumber: string;
  wardName: string;
  wardType: string;
}

interface TransferFormData {
  toBedId: string;
  reason: string;
  clinicalNotes: string;
}

export default function HDU() {
  const [hduBeds, setHDUBeds] = useState<HDUBed[]>([]);
  const [selectedBed, setSelectedBed] = useState<HDUBed | null>(null);
  const [isVitalsDialogOpen, setIsVitalsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Available beds for transfer
  const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([]);
  const [targetWardType, setTargetWardType] = useState<string>('general');

  // Comprehensive Patient Details
  const [showFullPatientDetails, setShowFullPatientDetails] = useState(false);

  const [vitalsFormData, setVitalsFormData] = useState<VitalsFormData>({
    bedId: '',
    hr: '',
    bp: '',
    spo2: '',
    temp: '',
    rr: '',
    gcs: '',
    notes: ''
  });

  const [transferFormData, setTransferFormData] = useState<TransferFormData>({
    toBedId: '',
    reason: 'de-escalation',
    clinicalNotes: ''
  });

  useEffect(() => {
    fetchHDUBeds();
    const interval = setInterval(fetchHDUBeds, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchHDUBeds = async () => {
    try {
      // HDU beds have category 'hdu' or are in HDU ward
      const response = await api.get('/api/beds', { params: { category: 'hdu' } });

      // Transform data to HDU format
      const transformedBeds: HDUBed[] = response.data.map((bed: any) => ({
        id: bed.id,
        bedNumber: bed.bedNumber,
        hduUnit: bed.ward?.name || 'HDU',
        status: bed.status === 'occupied' ? 'occupied' : 'vacant',
        patient: bed.currentAdmission?.patient ? {
          id: bed.currentAdmission.patient.id,
          name: bed.currentAdmission.patient.name,
          mrn: bed.currentAdmission.patient.mrn,
          age: bed.currentAdmission.patient.age || 0,
          gender: bed.currentAdmission.patient.gender || 'Unknown'
        } : undefined,
        admission: bed.currentAdmission ? {
          id: bed.currentAdmission.id,
          admissionDate: bed.currentAdmission.admissionDate,
          diagnosis: bed.currentAdmission.diagnosis || 'N/A',
          sourceUnit: bed.currentAdmission.sourceUnit
        } : undefined,
        latestVitals: bed.currentAdmission?.latestVitals ? {
          hr: bed.currentAdmission.latestVitals.heartRate?.toString() || '',
          bp: bed.currentAdmission.latestVitals.bloodPressure || '',
          spo2: bed.currentAdmission.latestVitals.oxygenSaturation?.toString() || '',
          temp: bed.currentAdmission.latestVitals.temperature?.toString() || '',
          rr: bed.currentAdmission.latestVitals.respiratoryRate?.toString() || '',
          timestamp: bed.currentAdmission.latestVitals.recordedAt
        } : undefined
      }));

      setHDUBeds(transformedBeds);
    } catch (error) {
      console.error('Error fetching HDU beds:', error);
      // Fallback: mock data for testing
      setHDUBeds([
        {
          id: 'hdu-1',
          bedNumber: 'HDU-01',
          hduUnit: 'High Dependency Unit',
          status: 'vacant'
        },
        {
          id: 'hdu-2',
          bedNumber: 'HDU-02',
          hduUnit: 'High Dependency Unit',
          status: 'vacant'
        },
        {
          id: 'hdu-3',
          bedNumber: 'HDU-03',
          hduUnit: 'High Dependency Unit',
          status: 'vacant'
        }
      ]);
    }
  };

  const fetchAvailableBeds = async (wardType: string) => {
    try {
      const response = await api.get('/api/bed-transfers/available-beds', {
        params: { wardType }
      });
      setAvailableBeds(response.data);
    } catch (error) {
      console.error('Error fetching available beds:', error);
      setAvailableBeds([]);
    }
  };

  const openVitalsDialog = (bed: HDUBed) => {
    setSelectedBed(bed);
    setVitalsFormData({
      bedId: bed.id,
      hr: bed.latestVitals?.hr || '',
      bp: bed.latestVitals?.bp || '',
      spo2: bed.latestVitals?.spo2 || '',
      temp: bed.latestVitals?.temp || '',
      rr: bed.latestVitals?.rr || '',
      gcs: '',
      notes: ''
    });
    setIsVitalsDialogOpen(true);
  };

  const openDetailsDialog = (bed: HDUBed) => {
    setSelectedBed(bed);
    setIsDetailsDialogOpen(true);
  };

  const openTransferDialog = (bed: HDUBed) => {
    setSelectedBed(bed);
    setTransferFormData({
      toBedId: '',
      reason: 'de-escalation',
      clinicalNotes: ''
    });
    setTargetWardType('general');
    fetchAvailableBeds('general');
    setIsTransferDialogOpen(true);
  };

  const openPatientDetailsPopup = (bed: HDUBed) => {
    if (bed.patient && bed.admission) {
      setSelectedBed(bed);
      setShowFullPatientDetails(true);
    }
  };

  const handleRecordVitals = async () => {
    setLoading(true);
    try {
      await api.post('/api/vitals', {
        admissionId: selectedBed?.admission?.id,
        heartRate: parseFloat(vitalsFormData.hr) || null,
        bloodPressure: vitalsFormData.bp || null,
        oxygenSaturation: parseFloat(vitalsFormData.spo2) || null,
        temperature: parseFloat(vitalsFormData.temp) || null,
        respiratoryRate: parseFloat(vitalsFormData.rr) || null,
        notes: vitalsFormData.notes
      });

      await fetchHDUBeds();
      setIsVitalsDialogOpen(false);
      setSelectedBed(null);
    } catch (error) {
      console.error('Error recording vitals:', error);
      alert('Failed to record vitals');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedBed || !transferFormData.toBedId) {
      alert('Please select a destination bed');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/bed-transfers', {
        admissionId: selectedBed.admission?.id,
        patientId: selectedBed.patient?.id,
        fromBedId: selectedBed.id,
        toBedId: transferFormData.toBedId,
        fromWardType: 'hdu',
        toWardType: targetWardType,
        reason: transferFormData.reason,
        clinicalNotes: transferFormData.clinicalNotes
      });

      await fetchHDUBeds();
      setIsTransferDialogOpen(false);
      setSelectedBed(null);
      alert('Patient transferred successfully');
    } catch (error) {
      console.error('Error transferring patient:', error);
      alert('Failed to transfer patient');
    } finally {
      setLoading(false);
    }
  };

  const handleWardTypeChange = (wardType: string) => {
    setTargetWardType(wardType);
    setTransferFormData(prev => ({ ...prev, toBedId: '' }));
    fetchAvailableBeds(wardType);
  };

  const occupiedBeds = hduBeds.filter(b => b.status === 'occupied');
  const availableBedsList = hduBeds.filter(b => b.status === 'vacant');

  const stats = {
    totalBeds: hduBeds.length,
    occupied: occupiedBeds.length,
    available: availableBedsList.length,
    occupancyRate: hduBeds.length > 0 ? Math.round((occupiedBeds.length / hduBeds.length) * 100) : 0
  };

  const getVitalStatus = (vital: string, type: string): 'normal' | 'warning' | 'critical' => {
    if (!vital) return 'normal';

    const value = parseFloat(vital);

    switch (type) {
      case 'spo2':
        if (value < 90) return 'critical';
        if (value < 94) return 'warning';
        return 'normal';
      case 'hr':
        if (value < 40 || value > 140) return 'critical';
        if (value < 50 || value > 120) return 'warning';
        return 'normal';
      case 'temp':
        if (value < 95 || value > 104) return 'critical';
        if (value < 96.8 || value > 100.4) return 'warning';
        return 'normal';
      default:
        return 'normal';
    }
  };

  const getVitalColor = (status: 'normal' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return 'text-red-600 font-semibold';
      case 'warning':
        return 'text-yellow-600 font-semibold';
      default:
        return 'text-slate-700';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">High Dependency Unit (HDU)</h1>
          <p className="text-slate-600">Step-down care and continuous monitoring</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bed className="w-4 h-4" />
              Total Beds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBeds}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Occupied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.occupied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bed className="w-4 h-4" />
              Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* HDU Beds Overview */}
      <Card>
        <CardHeader>
          <CardTitle>HDU Bed Status</CardTitle>
          <CardDescription>Continuous patient monitoring and step-down care management</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Beds ({stats.totalBeds})</TabsTrigger>
              <TabsTrigger value="occupied">Occupied ({stats.occupied})</TabsTrigger>
              <TabsTrigger value="available">Available ({stats.available})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hduBeds.map((bed) => (
                  <Card key={bed.id} className={bed.status === 'occupied' ? 'border-purple-200 bg-purple-50' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{bed.bedNumber}</CardTitle>
                          <p className="text-sm text-slate-500">{bed.hduUnit}</p>
                        </div>
                        <Badge variant={bed.status === 'occupied' ? 'default' : 'secondary'}>
                          {bed.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {bed.status === 'occupied' && bed.patient ? (
                        <div className="space-y-3">
                          <div>
                            <div className="font-medium">{bed.patient.name}</div>
                            <div className="text-sm text-slate-500">
                              {bed.patient.mrn} - {bed.patient.age}/{bed.patient.gender}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {bed.admission?.diagnosis}
                            </div>
                            {bed.admission?.sourceUnit && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                From: {bed.admission.sourceUnit}
                              </Badge>
                            )}
                          </div>

                          {bed.latestVitals && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-1">
                                <Heart className="w-3 h-3 text-red-500" />
                                <span className={getVitalColor(getVitalStatus(bed.latestVitals.hr, 'hr'))}>
                                  {bed.latestVitals.hr || '--'} bpm
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Activity className="w-3 h-3 text-blue-500" />
                                <span className={getVitalColor(getVitalStatus(bed.latestVitals.spo2, 'spo2'))}>
                                  {bed.latestVitals.spo2 || '--'}%
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Droplet className="w-3 h-3 text-purple-500" />
                                <span>{bed.latestVitals.bp || '--'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Thermometer className="w-3 h-3 text-orange-500" />
                                <span className={getVitalColor(getVitalStatus(bed.latestVitals.temp, 'temp'))}>
                                  {bed.latestVitals.temp || '--'}°F
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2 border-t">
                            <Button size="sm" variant="outline" onClick={() => openVitalsDialog(bed)} className="flex-1">
                              <Activity className="w-3 h-3 mr-1" />
                              Vitals
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openTransferDialog(bed)} title="Transfer Patient">
                              <ArrowRightLeft className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openDetailsDialog(bed)} title="Quick View">
                              <FileText className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openPatientDetailsPopup(bed)} title="Full Patient Details">
                              <Eye className="w-3 h-3 text-blue-500" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-500">
                          <Bed className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <div className="text-sm">Bed Available</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="occupied">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bed</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Admission Date</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Latest Vitals</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {occupiedBeds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No occupied beds
                      </TableCell>
                    </TableRow>
                  ) : (
                    occupiedBeds.map((bed) => (
                      <TableRow key={bed.id}>
                        <TableCell className="font-medium">{bed.bedNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{bed.patient?.name}</div>
                            <div className="text-xs text-slate-500">{bed.patient?.mrn}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {bed.admission?.admissionDate ?
                            new Date(bed.admission.admissionDate).toLocaleDateString() :
                            'N/A'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{bed.admission?.diagnosis}</TableCell>
                        <TableCell>
                          {bed.latestVitals ? (
                            <div className="text-sm">
                              <div className={getVitalColor(getVitalStatus(bed.latestVitals.hr, 'hr'))}>
                                HR: {bed.latestVitals.hr}
                              </div>
                              <div className={getVitalColor(getVitalStatus(bed.latestVitals.spo2, 'spo2'))}>
                                SpO2: {bed.latestVitals.spo2}%
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">No data</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {bed.admission?.sourceUnit && (
                            <Badge variant="outline">{bed.admission.sourceUnit}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openVitalsDialog(bed)}>
                              Vitals
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openTransferDialog(bed)}>
                              <ArrowRightLeft className="w-3 h-3 mr-1" />
                              Transfer
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openPatientDetailsPopup(bed)} title="View Patient Details">
                              <Eye className="w-4 h-4 text-blue-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="available">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {availableBedsList.map((bed) => (
                  <Card key={bed.id} className="border-green-200 bg-green-50">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{bed.bedNumber}</CardTitle>
                        <Badge variant="secondary" className="bg-green-200">Available</Badge>
                      </div>
                      <p className="text-sm text-slate-500">{bed.hduUnit}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-2">
                        <Bed className="w-8 h-8 mx-auto text-green-500" />
                        <p className="text-sm text-green-700 mt-2">Ready for admission</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Vitals Dialog */}
      <Dialog open={isVitalsDialogOpen} onOpenChange={setIsVitalsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Vitals - {selectedBed?.bedNumber}</DialogTitle>
            <DialogDescription>
              Patient: {selectedBed?.patient?.name} ({selectedBed?.patient?.mrn})
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hr">Heart Rate (bpm)</Label>
              <Input
                id="hr"
                type="number"
                value={vitalsFormData.hr}
                onChange={(e) => setVitalsFormData({ ...vitalsFormData, hr: e.target.value })}
                placeholder="e.g., 72"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp">Blood Pressure</Label>
              <Input
                id="bp"
                value={vitalsFormData.bp}
                onChange={(e) => setVitalsFormData({ ...vitalsFormData, bp: e.target.value })}
                placeholder="e.g., 120/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spo2">SpO2 (%)</Label>
              <Input
                id="spo2"
                type="number"
                value={vitalsFormData.spo2}
                onChange={(e) => setVitalsFormData({ ...vitalsFormData, spo2: e.target.value })}
                placeholder="e.g., 98"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temp">Temperature (°F)</Label>
              <Input
                id="temp"
                type="number"
                step="0.1"
                value={vitalsFormData.temp}
                onChange={(e) => setVitalsFormData({ ...vitalsFormData, temp: e.target.value })}
                placeholder="e.g., 98.6"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rr">Respiratory Rate</Label>
              <Input
                id="rr"
                type="number"
                value={vitalsFormData.rr}
                onChange={(e) => setVitalsFormData({ ...vitalsFormData, rr: e.target.value })}
                placeholder="e.g., 16"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gcs">GCS Score</Label>
              <Input
                id="gcs"
                type="number"
                min="3"
                max="15"
                value={vitalsFormData.gcs}
                onChange={(e) => setVitalsFormData({ ...vitalsFormData, gcs: e.target.value })}
                placeholder="3-15"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={vitalsFormData.notes}
              onChange={(e) => setVitalsFormData({ ...vitalsFormData, notes: e.target.value })}
              placeholder="Additional observations..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVitalsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordVitals} disabled={loading}>
              {loading ? 'Saving...' : 'Save Vitals'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              Transfer Patient
            </DialogTitle>
            <DialogDescription>
              Transfer {selectedBed?.patient?.name} from {selectedBed?.bedNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Transfer To</Label>
              <Select value={targetWardType} onValueChange={handleWardTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ward type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Ward</SelectItem>
                  <SelectItem value="icu">ICU (Escalation)</SelectItem>
                  <SelectItem value="private">Private Ward</SelectItem>
                  <SelectItem value="semi-private">Semi-Private Ward</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Bed</Label>
              <Select
                value={transferFormData.toBedId}
                onValueChange={(value) => setTransferFormData({ ...transferFormData, toBedId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination bed" />
                </SelectTrigger>
                <SelectContent>
                  {availableBeds.length === 0 ? (
                    <SelectItem value="none" disabled>No beds available</SelectItem>
                  ) : (
                    availableBeds.map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>
                        {bed.bedNumber} - {bed.wardName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Transfer Reason</Label>
              <Select
                value={transferFormData.reason}
                onValueChange={(value) => setTransferFormData({ ...transferFormData, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de-escalation">De-escalation (Improving)</SelectItem>
                  <SelectItem value="escalation">Escalation (Worsening)</SelectItem>
                  <SelectItem value="patient-request">Patient/Family Request</SelectItem>
                  <SelectItem value="bed-management">Bed Management</SelectItem>
                  <SelectItem value="step-down">Step-down Care</SelectItem>
                  <SelectItem value="specialty-transfer">Specialty Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetWardType === 'icu' && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Escalation to ICU:</strong> This indicates patient condition is worsening and requires intensive care.
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Clinical Notes</Label>
              <Textarea
                value={transferFormData.clinicalNotes}
                onChange={(e) => setTransferFormData({ ...transferFormData, clinicalNotes: e.target.value })}
                placeholder="Reason for transfer, patient condition, handoff notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleTransfer}
              disabled={loading || !transferFormData.toBedId}
            >
              {loading ? 'Transferring...' : 'Transfer Patient'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Patient Details - {selectedBed?.bedNumber}</DialogTitle>
          </DialogHeader>

          {selectedBed && selectedBed.patient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Patient Name</Label>
                  <p className="font-medium">{selectedBed.patient.name}</p>
                </div>
                <div>
                  <Label className="text-slate-500">MRN</Label>
                  <p className="font-medium">{selectedBed.patient.mrn}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Age / Gender</Label>
                  <p className="font-medium">{selectedBed.patient.age} / {selectedBed.patient.gender}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Admission Date</Label>
                  <p className="font-medium">
                    {selectedBed.admission?.admissionDate ?
                      new Date(selectedBed.admission.admissionDate).toLocaleDateString() :
                      'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-slate-500">Diagnosis</Label>
                <p className="font-medium">{selectedBed.admission?.diagnosis || 'N/A'}</p>
              </div>

              {selectedBed.latestVitals && (
                <div>
                  <Label className="text-slate-500 block mb-2">Latest Vitals</Label>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="p-2 bg-slate-50 rounded">
                      <span className="text-slate-500">HR:</span> {selectedBed.latestVitals.hr} bpm
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <span className="text-slate-500">BP:</span> {selectedBed.latestVitals.bp}
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <span className="text-slate-500">SpO2:</span> {selectedBed.latestVitals.spo2}%
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <span className="text-slate-500">Temp:</span> {selectedBed.latestVitals.temp}°F
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <span className="text-slate-500">RR:</span> {selectedBed.latestVitals.rr}/min
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsDetailsDialogOpen(false);
                    openPatientDetailsPopup(selectedBed);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Full Patient Details
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsDetailsDialogOpen(false);
                    openTransferDialog(selectedBed);
                  }}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Transfer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Patient Details Popup */}
      {showFullPatientDetails && selectedBed?.patient && selectedBed?.admission && (
        <BedPatientDetails
          open={showFullPatientDetails}
          bedId={selectedBed.id}
          patientId={selectedBed.patient.id}
          admissionId={selectedBed.admission.id}
          onClose={() => {
            setShowFullPatientDetails(false);
            setSelectedBed(null);
          }}
        />
      )}
    </div>
  );
}
