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
import { Heart, Activity, Wind, Droplet, Thermometer, Users, Bed, AlertTriangle, TrendingUp, FileText, Plus } from 'lucide-react';
import api from '../services/api';

interface ICUBed {
  id: string;
  bedNumber: string;
  icuUnit: string;
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
    isVentilated: boolean;
    ventilatorMode?: string;
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
  cvp: string;
  uop: string;
  notes: string;
}

interface VentilatorFormData {
  bedId: string;
  mode: string;
  fiO2: string;
  peep: string;
  tidalVolume: string;
  respiratoryRate: string;
  pressureSupport: string;
  notes: string;
}

export default function ICU() {
  const [icuBeds, setICUBeds] = useState<ICUBed[]>([]);
  const [selectedBed, setSelectedBed] = useState<ICUBed | null>(null);
  const [isVitalsDialogOpen, setIsVitalsDialogOpen] = useState(false);
  const [isVentilatorDialogOpen, setIsVentilatorDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [vitalsFormData, setVitalsFormData] = useState<VitalsFormData>({
    bedId: '',
    hr: '',
    bp: '',
    spo2: '',
    temp: '',
    rr: '',
    gcs: '',
    cvp: '',
    uop: '',
    notes: ''
  });

  const [ventilatorFormData, setVentilatorFormData] = useState<VentilatorFormData>({
    bedId: '',
    mode: '',
    fiO2: '',
    peep: '',
    tidalVolume: '',
    respiratoryRate: '',
    pressureSupport: '',
    notes: ''
  });

  useEffect(() => {
    fetchICUBeds();
    const interval = setInterval(fetchICUBeds, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchICUBeds = async () => {
    try {
      const response = await api.get('/api/icu/beds');
      setICUBeds(response.data);
    } catch (error) {
      console.error('Error fetching ICU beds:', error);
    }
  };

  const openVitalsDialog = (bed: ICUBed) => {
    setSelectedBed(bed);
    setVitalsFormData({
      bedId: bed.id,
      hr: bed.latestVitals?.hr || '',
      bp: bed.latestVitals?.bp || '',
      spo2: bed.latestVitals?.spo2 || '',
      temp: bed.latestVitals?.temp || '',
      rr: bed.latestVitals?.rr || '',
      gcs: '',
      cvp: '',
      uop: '',
      notes: ''
    });
    setIsVitalsDialogOpen(true);
  };

  const openVentilatorDialog = (bed: ICUBed) => {
    setSelectedBed(bed);
    setVentilatorFormData({
      bedId: bed.id,
      mode: bed.admission?.ventilatorMode || '',
      fiO2: '',
      peep: '',
      tidalVolume: '',
      respiratoryRate: '',
      pressureSupport: '',
      notes: ''
    });
    setIsVentilatorDialogOpen(true);
  };

  const openDetailsDialog = (bed: ICUBed) => {
    setSelectedBed(bed);
    setIsDetailsDialogOpen(true);
  };

  const handleRecordVitals = async () => {
    setLoading(true);
    try {
      await api.post('/api/icu/vitals', {
        bedId: vitalsFormData.bedId,
        hr: vitalsFormData.hr,
        bp: vitalsFormData.bp,
        spo2: vitalsFormData.spo2,
        temp: vitalsFormData.temp,
        rr: vitalsFormData.rr,
        gcs: vitalsFormData.gcs,
        cvp: vitalsFormData.cvp,
        uop: vitalsFormData.uop,
        notes: vitalsFormData.notes
      });

      await fetchICUBeds();
      setIsVitalsDialogOpen(false);
      setSelectedBed(null);
    } catch (error) {
      console.error('Error recording vitals:', error);
      alert('Failed to record vitals');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVentilator = async () => {
    setLoading(true);
    try {
      await api.post('/api/icu/ventilator', {
        bedId: ventilatorFormData.bedId,
        mode: ventilatorFormData.mode,
        fiO2: ventilatorFormData.fiO2,
        peep: ventilatorFormData.peep,
        tidalVolume: ventilatorFormData.tidalVolume,
        respiratoryRate: ventilatorFormData.respiratoryRate,
        pressureSupport: ventilatorFormData.pressureSupport,
        notes: ventilatorFormData.notes
      });

      await fetchICUBeds();
      setIsVentilatorDialogOpen(false);
      setSelectedBed(null);
    } catch (error) {
      console.error('Error updating ventilator settings:', error);
      alert('Failed to update ventilator settings');
    } finally {
      setLoading(false);
    }
  };

  const occupiedBeds = icuBeds.filter(b => b.status === 'OCCUPIED');
  const ventilatedPatients = occupiedBeds.filter(b => b.admission?.isVentilated);
  const availableBeds = icuBeds.filter(b => b.status === 'AVAILABLE');

  const stats = {
    totalBeds: icuBeds.length,
    occupied: occupiedBeds.length,
    available: availableBeds.length,
    ventilated: ventilatedPatients.length,
    occupancyRate: icuBeds.length > 0 ? Math.round((occupiedBeds.length / icuBeds.length) * 100) : 0
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
          <h1 className="text-3xl font-bold text-slate-900">ICU & Critical Care</h1>
          <p className="text-slate-600">Real-time monitoring and critical care management</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <Wind className="w-4 h-4" />
              Ventilated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.ventilated}</div>
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

      {/* ICU Beds Overview */}
      <Card>
        <CardHeader>
          <CardTitle>ICU Bed Status</CardTitle>
          <CardDescription>Real-time patient monitoring and bed occupancy</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Beds ({stats.totalBeds})</TabsTrigger>
              <TabsTrigger value="occupied">Occupied ({stats.occupied})</TabsTrigger>
              <TabsTrigger value="ventilated">Ventilated ({stats.ventilated})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {icuBeds.map((bed) => (
                  <Card key={bed.id} className={bed.status === 'OCCUPIED' ? 'border-blue-200 bg-blue-50' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{bed.bedNumber}</CardTitle>
                          <p className="text-sm text-slate-500">{bed.icuUnit}</p>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant={bed.status === 'OCCUPIED' ? 'default' : 'secondary'}>
                            {bed.status}
                          </Badge>
                          {bed.admission?.isVentilated && (
                            <Badge className="bg-orange-600">
                              <Wind className="w-3 h-3 mr-1" />
                              Vent
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {bed.status === 'OCCUPIED' && bed.patient ? (
                        <div className="space-y-3">
                          <div>
                            <div className="font-medium">{bed.patient.name}</div>
                            <div className="text-sm text-slate-500">
                              {bed.patient.mrn} • {bed.patient.age}/{bed.patient.gender}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {bed.admission?.diagnosis}
                            </div>
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
                            {bed.admission?.isVentilated && (
                              <Button size="sm" variant="outline" onClick={() => openVentilatorDialog(bed)} className="flex-1">
                                <Wind className="w-3 h-3 mr-1" />
                                Vent
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => openDetailsDialog(bed)}>
                              <FileText className="w-3 h-3" />
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
                    <TableHead>Status</TableHead>
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
                          {bed.admission?.isVentilated && (
                            <Badge className="bg-orange-600">Ventilated</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openVitalsDialog(bed)}>
                              Record Vitals
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="ventilated">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bed</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Ventilator Mode</TableHead>
                    <TableHead>Vitals</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventilatedPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No ventilated patients
                      </TableCell>
                    </TableRow>
                  ) : (
                    ventilatedPatients.map((bed) => (
                      <TableRow key={bed.id} className="bg-orange-50">
                        <TableCell className="font-medium">{bed.bedNumber}</TableCell>
                        <TableCell>
                          <div className="font-medium">{bed.patient?.name}</div>
                          <div className="text-xs text-slate-500">{bed.patient?.mrn}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{bed.admission?.ventilatorMode || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          {bed.latestVitals && (
                            <div className="text-sm">
                              SpO2: {bed.latestVitals.spo2}% | RR: {bed.latestVitals.rr}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openVentilatorDialog(bed)}>
                              <Wind className="w-4 h-4 mr-1" />
                              Update Vent
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

      {/* Vitals Recording Dialog */}
      <Dialog open={isVitalsDialogOpen} onOpenChange={setIsVitalsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Vital Signs</DialogTitle>
            <DialogDescription>
              {selectedBed?.bedNumber} - {selectedBed?.patient?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Heart Rate (bpm) *</Label>
                <Input
                  type="number"
                  placeholder="72"
                  value={vitalsFormData.hr}
                  onChange={(e) => setVitalsFormData({ ...vitalsFormData, hr: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Blood Pressure *</Label>
                <Input
                  placeholder="120/80"
                  value={vitalsFormData.bp}
                  onChange={(e) => setVitalsFormData({ ...vitalsFormData, bp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>SpO2 (%) *</Label>
                <Input
                  type="number"
                  placeholder="98"
                  value={vitalsFormData.spo2}
                  onChange={(e) => setVitalsFormData({ ...vitalsFormData, spo2: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Temperature (°F) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={vitalsFormData.temp}
                  onChange={(e) => setVitalsFormData({ ...vitalsFormData, temp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Respiratory Rate</Label>
                <Input
                  type="number"
                  placeholder="16"
                  value={vitalsFormData.rr}
                  onChange={(e) => setVitalsFormData({ ...vitalsFormData, rr: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>GCS Score</Label>
                <Input
                  placeholder="15"
                  value={vitalsFormData.gcs}
                  onChange={(e) => setVitalsFormData({ ...vitalsFormData, gcs: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CVP (cmH2O)</Label>
                <Input
                  placeholder="8"
                  value={vitalsFormData.cvp}
                  onChange={(e) => setVitalsFormData({ ...vitalsFormData, cvp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Urine Output (ml/hr)</Label>
                <Input
                  placeholder="50"
                  value={vitalsFormData.uop}
                  onChange={(e) => setVitalsFormData({ ...vitalsFormData, uop: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nursing Notes</Label>
              <textarea
                className="w-full min-h-[80px] p-3 border rounded-md"
                placeholder="Any observations or concerns..."
                value={vitalsFormData.notes}
                onChange={(e) => setVitalsFormData({ ...vitalsFormData, notes: e.target.value })}
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

      {/* Ventilator Settings Dialog */}
      <Dialog open={isVentilatorDialogOpen} onOpenChange={setIsVentilatorDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ventilator Settings</DialogTitle>
            <DialogDescription>
              {selectedBed?.bedNumber} - {selectedBed?.patient?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ventilator Mode *</Label>
              <Select
                value={ventilatorFormData.mode}
                onValueChange={(value) => setVentilatorFormData({ ...ventilatorFormData, mode: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIMV">SIMV</SelectItem>
                  <SelectItem value="AC">Assist Control (AC)</SelectItem>
                  <SelectItem value="PSV">Pressure Support (PSV)</SelectItem>
                  <SelectItem value="CPAP">CPAP</SelectItem>
                  <SelectItem value="BiPAP">BiPAP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>FiO2 (%)</Label>
                <Input
                  type="number"
                  placeholder="40"
                  value={ventilatorFormData.fiO2}
                  onChange={(e) => setVentilatorFormData({ ...ventilatorFormData, fiO2: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>PEEP (cmH2O)</Label>
                <Input
                  type="number"
                  placeholder="5"
                  value={ventilatorFormData.peep}
                  onChange={(e) => setVentilatorFormData({ ...ventilatorFormData, peep: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tidal Volume (ml)</Label>
                <Input
                  type="number"
                  placeholder="450"
                  value={ventilatorFormData.tidalVolume}
                  onChange={(e) => setVentilatorFormData({ ...ventilatorFormData, tidalVolume: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Respiratory Rate</Label>
                <Input
                  type="number"
                  placeholder="12"
                  value={ventilatorFormData.respiratoryRate}
                  onChange={(e) => setVentilatorFormData({ ...ventilatorFormData, respiratoryRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Pressure Support (cmH2O)</Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={ventilatorFormData.pressureSupport}
                  onChange={(e) => setVentilatorFormData({ ...ventilatorFormData, pressureSupport: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="w-full min-h-[60px] p-3 border rounded-md"
                placeholder="Changes made, patient response..."
                value={ventilatorFormData.notes}
                onChange={(e) => setVentilatorFormData({ ...ventilatorFormData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVentilatorDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleUpdateVentilator} disabled={loading}>
              {loading ? 'Updating...' : 'Update Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
          </DialogHeader>
          {selectedBed && selectedBed.patient && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-slate-500">Patient Name</Label>
                  <div className="font-medium">{selectedBed.patient.name}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">MRN</Label>
                  <div className="font-medium">{selectedBed.patient.mrn}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Age / Gender</Label>
                  <div className="font-medium">{selectedBed.patient.age} / {selectedBed.patient.gender}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Bed</Label>
                  <div className="font-medium">{selectedBed.bedNumber} - {selectedBed.icuUnit}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Admission Date</Label>
                  <div className="font-medium">
                    {selectedBed.admission?.admissionDate ?
                      new Date(selectedBed.admission.admissionDate).toLocaleDateString() :
                      'N/A'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Ventilation Status</Label>
                  <div className="font-medium">
                    {selectedBed.admission?.isVentilated ? (
                      <Badge className="bg-orange-600">Ventilated</Badge>
                    ) : (
                      <Badge variant="secondary">Spontaneous</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm text-slate-500">Diagnosis</Label>
                <div className="font-medium">{selectedBed.admission?.diagnosis || 'N/A'}</div>
              </div>

              {selectedBed.latestVitals && (
                <div>
                  <Label className="text-sm text-slate-500">Latest Vital Signs</Label>
                  <div className="grid grid-cols-4 gap-3 mt-2">
                    <div className="p-3 bg-slate-50 rounded-md">
                      <div className="text-xs text-slate-500">Heart Rate</div>
                      <div className={`font-semibold ${getVitalColor(getVitalStatus(selectedBed.latestVitals.hr, 'hr'))}`}>
                        {selectedBed.latestVitals.hr} bpm
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-md">
                      <div className="text-xs text-slate-500">BP</div>
                      <div className="font-semibold">{selectedBed.latestVitals.bp}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-md">
                      <div className="text-xs text-slate-500">SpO2</div>
                      <div className={`font-semibold ${getVitalColor(getVitalStatus(selectedBed.latestVitals.spo2, 'spo2'))}`}>
                        {selectedBed.latestVitals.spo2}%
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-md">
                      <div className="text-xs text-slate-500">Temperature</div>
                      <div className={`font-semibold ${getVitalColor(getVitalStatus(selectedBed.latestVitals.temp, 'temp'))}`}>
                        {selectedBed.latestVitals.temp}°F
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Last updated: {selectedBed.latestVitals.timestamp ?
                      new Date(selectedBed.latestVitals.timestamp).toLocaleString() :
                      'N/A'}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
