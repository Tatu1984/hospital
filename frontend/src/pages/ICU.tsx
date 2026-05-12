import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Activity, Wind, Droplet, Thermometer, Users, Bed, TrendingUp, FileText } from 'lucide-react';
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

// Critical-care unit variants the ICU page covers. ICCU/ITU/HDU live here
// (not on the IPD page) because they share the same vitals + ventilator
// workflow. The label is what's shown to staff; the code is what's stored
// in ICUBed.icuUnit.
const CRITICAL_CARE_UNITS: Array<{ code: string; label: string }> = [
  { code: 'ICU',  label: 'ICU' },
  { code: 'ITU',  label: 'ITU' },
  { code: 'HDU',  label: 'HDU' },
  { code: 'ICCU', label: 'ICCU' },
];

// Wire shape of /api/icu/beds/:id/details — denormalized bundle that
// drives every tab of the patient-details dialog without further fetches.
interface DetailsVitals {
  id: string;
  recordedAt: string;
  heartRate: number | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  bp: string | null;
  temperature: number | null;
  spo2: number | null;
  respiratoryRate: number | null;
  gcs: number | null;
  ventilatorMode: string | null;
  fio2: number | null;
  peep: number | null;
}
interface DetailsOrder {
  id: string;
  orderType: string; // 'lab' | 'radiology'
  orderedAt: string;
  status: string;
  priority: string;
  details: any;
  results: Array<{ id: string; resultedAt: string; isCritical: boolean; resultData: any }>;
}
interface DetailsPrescription {
  id: string;
  createdAt: string;
  drugs: any;
  doctor: string;
  fromOpdNote: string;
}
interface ICUDetails {
  bed: { id: string; bedNumber: string; icuUnit: string; status: string; ventilatorId: string | null };
  patient: { id: string; name: string; mrn: string; age: number | null; gender: string | null; phone: string | null; address: string | null } | null;
  admission: { id: string; admissionDate: string; diagnosis: string | null; admittingDoctor: string | null; isVentilated: boolean } | null;
  vitals: DetailsVitals[];
  orders: DetailsOrder[];
  prescriptions: DetailsPrescription[];
}

// Shape of a general bed coming back from /api/beds (now includes both
// Bed and ICUBed rows). Only the fields the transfer picker cares about.
interface PickerBed {
  id: string;
  bedNumber: string;
  category?: string | null;
  status: string;
  ward?: { id: string | null; name: string; type: string } | null;
  floor?: string | null;
  __source?: 'icubed';
}

export default function ICU() {
  const [icuBeds, setICUBeds] = useState<ICUBed[]>([]);
  const [selectedBed, setSelectedBed] = useState<ICUBed | null>(null);
  const [isVitalsDialogOpen, setIsVitalsDialogOpen] = useState(false);
  const [isVentilatorDialogOpen, setIsVentilatorDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Full denormalized payload for the currently-open details dialog.
  const [bedDetails, setBedDetails] = useState<ICUDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  // Transfer / step-down flow state — picker for moving the ICU patient
  // to a general bed or another ICU bed.
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferBeds, setTransferBeds] = useState<PickerBed[]>([]);
  const [transferTargetBedId, setTransferTargetBedId] = useState('');
  const [transferBedSearch, setTransferBedSearch] = useState('');
  const [transferWardFilter, setTransferWardFilter] = useState('all');
  // Assign-patient-to-bed flow — used when an empty ICU bed is clicked.
  // Operator picks one of the currently-active admissions and the
  // transfer-bed endpoint moves them onto this bed.
  const [isAssignPatientOpen, setIsAssignPatientOpen] = useState(false);
  const [activeAdmissionsForAssign, setActiveAdmissionsForAssign] = useState<any[]>([]);
  const [assignTargetAdmissionId, setAssignTargetAdmissionId] = useState('');
  const [assignSearch, setAssignSearch] = useState('');

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
    // Kick off the denormalized fetch in the background. The dialog
    // shows a loading state for the parts that depend on it.
    setBedDetails(null);
    setDetailsLoading(true);
    api.get(`/api/icu/beds/${bed.id}/details`)
      .then((res) => setBedDetails(res.data))
      .catch((err) => {
        console.error('Load ICU bed details error:', err);
      })
      .finally(() => setDetailsLoading(false));
  };

  // Open the bed-picker for stepping the patient down (or sideways)
  // to another bed. Loads the full bed inventory once and lets the
  // operator filter by ward and status.
  const openTransferPicker = () => {
    setTransferTargetBedId('');
    setTransferBedSearch('');
    setTransferWardFilter('all');
    setIsTransferOpen(true);
    api.get('/api/beds')
      .then((res) => setTransferBeds(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error('Load beds for transfer error:', err);
        setTransferBeds([]);
      });
  };

  const openAssignPatientPicker = () => {
    setAssignTargetAdmissionId('');
    setAssignSearch('');
    setIsAssignPatientOpen(true);
    // Fetch the active admissions list so the operator can pick one to
    // move onto this bed. We deliberately don't filter to unassigned
    // only — moving a patient currently in a general bed into ICU is
    // the most common reason this picker exists.
    api.get('/api/admissions', { params: { status: 'active' } })
      .then((res) => setActiveAdmissionsForAssign(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error('Load admissions for assign error:', err);
        setActiveAdmissionsForAssign([]);
      });
  };

  const handleAssignPatient = async () => {
    if (!selectedBed?.id || !assignTargetAdmissionId) return;
    setLoading(true);
    try {
      const transferRes = await api.post(`/api/admissions/${assignTargetAdmissionId}/transfer-bed`, {
        bedId: selectedBed.id,
      });
      // Log the server's view of the world so an operator (or me, via
      // their console output) can confirm the move actually landed.
      // eslint-disable-next-line no-console
      console.log('[icu] transfer-bed response:', transferRes.data);
      setIsAssignPatientOpen(false);
      // Reset bedDetails so the dialog shows the loading state during
      // refetch — avoids any stale-state flash where the empty panel
      // briefly renders before the new data arrives.
      setBedDetails(null);
      setDetailsLoading(true);
      // Hammer it: refresh the ICU bed grid AND the details panel.
      const [, detailsRes] = await Promise.all([
        fetchICUBeds(),
        api.get(`/api/icu/beds/${selectedBed.id}/details`).then((res) => res.data),
      ]);
      // eslint-disable-next-line no-console
      console.log('[icu] bed details after assign:', detailsRes);
      if (!detailsRes?.patient) {
        // Surface the bad state to the operator instead of silently
        // showing "no patient" again. They can then share the response
        // with support.
        alert(
          'Transfer call succeeded but the bed still shows no patient. ' +
          'Please share the console output ([icu] bed details) — there is ' +
          'a data inconsistency we need to investigate.'
        );
      }
      setBedDetails(detailsRes);
    } catch (err: any) {
      console.error('Assign patient error:', err);
      alert(err?.response?.data?.error || 'Could not assign patient.');
    } finally {
      setLoading(false);
      setDetailsLoading(false);
    }
  };

  const handleICUTransfer = async () => {
    if (!bedDetails?.admission?.id || !transferTargetBedId) return;
    setLoading(true);
    try {
      await api.post(`/api/admissions/${bedDetails.admission.id}/transfer-bed`, {
        bedId: transferTargetBedId,
      });
      // Refresh the ICU bed grid + close both dialogs. The detail panel
      // will be reopened by the operator if they want.
      await fetchICUBeds();
      setIsTransferOpen(false);
      setIsDetailsDialogOpen(false);
    } catch (err: any) {
      console.error('ICU transfer error:', err);
      alert(err?.response?.data?.error || 'Could not transfer patient.');
    } finally {
      setLoading(false);
    }
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

  // Stats counts use the full bed list (across every critical-care unit) so
  // the totals at the top of the page don't shift when the operator switches
  // unit tabs — same pattern as the IPD page.
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

  // Per-unit counts power the tab labels (e.g. "ITU (6 · 2 vent)") and
  // let an empty unit show a friendly "no beds" panel instead of a blank
  // one. We track total + ventilated separately so the tab can flag
  // critical-care units with patients currently on a ventilator.
  const unitCounts: Record<string, { total: number; vent: number }> = {};
  for (const b of icuBeds) {
    const u = (b.icuUnit || 'ICU').toUpperCase();
    if (!unitCounts[u]) unitCounts[u] = { total: 0, vent: 0 };
    unitCounts[u].total += 1;
    if (b.admission?.isVentilated) unitCounts[u].vent += 1;
  }

  // Beds for a given unit code (or all critical-care beds if `null`).
  const bedsForUnit = (unitCode: string | null) => unitCode === null
    ? icuBeds
    : icuBeds.filter(b => (b.icuUnit || '').toUpperCase() === unitCode);

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

      {/* ICU Beds Overview — same layout as IPD: tabs by unit, each tab
          shows the bed-card grid for that unit. Stats above are global so
          they don't move around as the operator switches tabs. */}
      <Card>
        <CardHeader>
          <CardTitle>ICU Bed Status</CardTitle>
          <CardDescription>Real-time patient monitoring across ICU / ITU / HDU / ICCU</CardDescription>
        </CardHeader>
        <CardContent>
          {icuBeds.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No ICU beds configured. Go to <span className="font-medium">Master Data → Wards/Rooms</span>{' '}
              and click <span className="font-medium">Seed standard wards</span> to create ICU / ITU / HDU /
              ICCU beds.
            </div>
          ) : (
          <Tabs defaultValue="all">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">
                All ({stats.totalBeds}{stats.ventilated > 0 ? ` · ${stats.ventilated} vent` : ''})
              </TabsTrigger>
              {CRITICAL_CARE_UNITS.map((u) => {
                const c = unitCounts[u.code] || { total: 0, vent: 0 };
                return (
                  <TabsTrigger key={u.code} value={u.code}>
                    {u.label} ({c.total}{c.vent > 0 ? ` · ${c.vent} vent` : ''})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {[null, ...CRITICAL_CARE_UNITS.map(u => u.code)].map((unit) => {
              const tabValue = unit ?? 'all';
              const beds = bedsForUnit(unit);
              return (
                <TabsContent key={tabValue} value={tabValue}>
                  {beds.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      No beds in this unit. Add one from Master Data → Beds, or run "Seed standard wards".
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {beds.map((bed) => (
                  // Whole card is clickable — opens the Details dialog. The
                  // inner Vitals / Vent / Details buttons stop event
                  // propagation so they still trigger their own dialogs.
                  <Card
                    key={bed.id}
                    onClick={() => openDetailsDialog(bed)}
                    className={`cursor-pointer transition-shadow hover:shadow-lg ${bed.status === 'OCCUPIED' ? 'border-blue-200 bg-blue-50' : 'hover:border-slate-300'}`}
                  >
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

                          {/* Each button stops propagation individually,
                              so the wrapper div doesn't need its own
                              onClick — having one would force a keyboard
                              handler purely for a a11y rule. */}
                          <div className="flex gap-2 pt-2 border-t">
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openVitalsDialog(bed); }} className="flex-1">
                              <Activity className="w-3 h-3 mr-1" />
                              Vitals
                            </Button>
                            {bed.admission?.isVentilated && (
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openVentilatorDialog(bed); }} className="flex-1">
                                <Wind className="w-3 h-3 mr-1" />
                                Vent
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openDetailsDialog(bed); }}>
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
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
          )}
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

      {/* Patient Details Dialog — bigger, tabbed view that puts everything
          the ICU team needs in one place. Tabs:
            • Overview: patient banner, latest vitals with delta vs the
              previous record, running medications, key reports.
            • Vitals Trend: chart-friendly list of the last 30 vital
              records so the team can spot a drift.
            • Reports: lab + radiology results with the most recent on
              top; each result shows what's changed vs the prior. */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              <span>Patient Details</span>
              {bedDetails?.bed && (
                <span className="text-sm font-normal text-slate-500">
                  {bedDetails.bed.bedNumber} · {bedDetails.bed.icuUnit}
                </span>
              )}
              {bedDetails?.admission?.isVentilated && (
                <Badge className="bg-orange-600">
                  <Wind className="w-3 h-3 mr-1" />
                  Ventilated
                </Badge>
              )}
            </DialogTitle>
            {bedDetails?.patient && (
              <DialogDescription>
                <span className="font-medium text-slate-700">{bedDetails.patient.name}</span>
                {' · '}MRN {bedDetails.patient.mrn}
                {bedDetails.patient.age != null && ` · ${bedDetails.patient.age}y`}
                {bedDetails.patient.gender && ` · ${bedDetails.patient.gender}`}
                {bedDetails.admission?.admittingDoctor && ` · Under ${bedDetails.admission.admittingDoctor}`}
              </DialogDescription>
            )}
          </DialogHeader>

          {detailsLoading && !bedDetails ? (
            <div className="py-12 text-center text-slate-500">Loading patient details…</div>
          ) : !bedDetails?.patient ? (
            <div className="py-10 text-center space-y-3">
              <div className="text-slate-600">This bed is currently vacant.</div>
              <div className="text-xs text-slate-500">
                Move an existing admitted patient onto this bed — typically when a
                general-ward patient needs to step up to {selectedBed?.icuUnit || 'critical care'}.
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button onClick={openAssignPatientPicker}>
                  <Bed className="w-4 h-4 mr-1" />
                  Assign a patient to this bed
                </Button>
                {/* If the underlying status got stuck at "occupied" via
                    Master Data edits, give the operator a one-click way
                    to reset it. The backend rejects the call if a real
                    patient is linked, so this is safe to expose. */}
                {bedDetails?.bed?.status && bedDetails.bed.status.toLowerCase() === 'occupied' && (
                  <Button variant="outline" onClick={async () => {
                    if (!selectedBed?.id) return;
                    if (!confirm('Reset this bed to vacant? This clears any stuck "occupied" flag from manual edits. Patient assignments are unaffected (none is linked).')) return;
                    try {
                      await api.post(`/api/icu/beds/${selectedBed.id}/reset`);
                      await fetchICUBeds();
                      const res = await api.get(`/api/icu/beds/${selectedBed.id}/details`);
                      setBedDetails(res.data);
                    } catch (err: any) {
                      alert(err?.response?.data?.error || 'Could not reset bed.');
                    }
                  }}>
                    Reset bed status to vacant
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="trend">Vitals Trend ({bedDetails.vitals.length})</TabsTrigger>
                <TabsTrigger value="reports">Reports ({bedDetails.orders.length})</TabsTrigger>
                <TabsTrigger value="meds">Medications ({bedDetails.prescriptions.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <ICUOverviewPane details={bedDetails} getVitalStatus={getVitalStatus} getVitalColor={getVitalColor} />
              </TabsContent>

              <TabsContent value="trend">
                <ICUTrendPane vitals={bedDetails.vitals} />
              </TabsContent>

              <TabsContent value="reports">
                <ICUReportsPane orders={bedDetails.orders} />
              </TabsContent>

              <TabsContent value="meds">
                <ICUMedsPane prescriptions={bedDetails.prescriptions} />
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            {bedDetails?.admission?.id ? (
              <Button variant="outline" onClick={openTransferPicker}>
                <Bed className="w-4 h-4 mr-1" />
                Transfer / step-down to another bed
              </Button>
            ) : (
              !detailsLoading && !bedDetails?.patient && (
                <Button onClick={openAssignPatientPicker}>
                  <Bed className="w-4 h-4 mr-1" />
                  Assign a patient
                </Button>
              )
            )}
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer dialog — pick any bed in the hospital (general or ICU).
          The backend transfer-bed endpoint handles the cross-table swap. */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer / step-down patient</DialogTitle>
            <DialogDescription>
              {bedDetails?.patient
                ? <>
                    <span className="font-medium">{bedDetails.patient.name}</span> ·{' '}
                    Currently in <span className="font-medium">{bedDetails.bed?.icuUnit}</span> ·
                    bed <span className="font-medium">{bedDetails.bed?.bedNumber}</span>.
                    Pick a destination — vacant beds only.
                  </>
                : 'Pick a destination bed.'}
            </DialogDescription>
          </DialogHeader>
          <ICUTransferPicker
            beds={transferBeds.filter((b) => b.id !== bedDetails?.bed?.id)}
            search={transferBedSearch}
            setSearch={setTransferBedSearch}
            wardFilter={transferWardFilter}
            setWardFilter={setTransferWardFilter}
            selected={transferTargetBedId}
            setSelected={setTransferTargetBedId}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleICUTransfer} disabled={loading || !transferTargetBedId}>
              {loading ? 'Transferring…' : 'Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign-patient picker — opened from an empty ICU bed. Lists every
          active admission so the operator can step a general-ward patient
          up to critical care. Same /api/admissions/:id/transfer-bed
          endpoint handles the move atomically. */}
      <Dialog open={isAssignPatientOpen} onOpenChange={setIsAssignPatientOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign a patient</DialogTitle>
            <DialogDescription>
              Pick the admitted patient who should occupy{' '}
              <span className="font-medium">{selectedBed?.bedNumber}</span>
              {' '}({selectedBed?.icuUnit}). They will be moved off their current
              bed (if any) in one transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Search by patient name, MRN, diagnosis…"
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
            />
            {(() => {
              const q = assignSearch.trim().toLowerCase();
              const visible = activeAdmissionsForAssign.filter((adm: any) => {
                if (!q) return true;
                const hay = [
                  adm.patientName, adm.patient?.name,
                  adm.patientMRN, adm.patient?.mrn,
                  adm.diagnosis,
                  adm.bedNumber, adm.bed?.bedNumber,
                ].filter(Boolean).join(' ').toLowerCase();
                return hay.includes(q);
              });
              if (visible.length === 0) {
                return (
                  <div className="text-center py-8 text-slate-500 border rounded-lg">
                    {activeAdmissionsForAssign.length === 0
                      ? 'No active admissions found.'
                      : 'No admissions match your search.'}
                  </div>
                );
              }
              return (
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  {visible.map((adm: any) => {
                    const sel = assignTargetAdmissionId === adm.id;
                    const currentBed = adm.bedNumber || adm.bed?.bedNumber || 'Unassigned';
                    const currentWard = adm.bed?.category || adm.wardName || (currentBed === 'Unassigned' ? '—' : 'Unknown');
                    const name = adm.patientName || adm.patient?.name || 'Unknown';
                    const mrn = adm.patientMRN || adm.patient?.mrn || '';
                    return (
                      <button
                        key={adm.id}
                        type="button"
                        onClick={() => setAssignTargetAdmissionId(adm.id)}
                        className={[
                          'w-full text-left rounded-md border-2 p-3 transition',
                          sel ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-400',
                        ].join(' ')}
                      >
                        <div className="flex justify-between items-baseline gap-2 flex-wrap">
                          <div>
                            <div className="font-medium">{name}</div>
                            <div className="text-xs text-slate-500">MRN: {mrn}</div>
                          </div>
                          <div className="text-xs text-slate-500 text-right">
                            Currently:<br />
                            <span className="font-medium">{currentWard}</span> · bed {currentBed}
                          </div>
                        </div>
                        {adm.diagnosis && (
                          <div className="text-xs text-slate-600 mt-2 line-clamp-2">
                            <span className="font-medium text-slate-500">Dx:</span> {adm.diagnosis}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignPatientOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAssignPatient} disabled={loading || !assignTargetAdmissionId}>
              {loading ? 'Assigning…' : 'Assign to this bed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components for the details dialog. Kept in the same file so the dialog
// stays self-contained; they only consume the denormalized response payload.
// ---------------------------------------------------------------------------

function delta(curr: number | null | undefined, prev: number | null | undefined): { text: string; cls: string } | null {
  if (curr == null || prev == null) return null;
  const d = +(curr - prev).toFixed(2);
  if (Math.abs(d) < 0.05) return null;
  const sign = d > 0 ? '+' : '';
  return {
    text: `${sign}${d}`,
    cls: d > 0 ? 'text-rose-600' : 'text-emerald-600',
  };
}

function ICUOverviewPane({
  details,
  getVitalStatus,
  getVitalColor,
}: {
  details: ICUDetails;
  getVitalStatus: (v: string, t: string) => 'normal' | 'warning' | 'critical';
  getVitalColor: (s: 'normal' | 'warning' | 'critical') => string;
}) {
  const latest = details.vitals[0];
  const prev = details.vitals[1];
  const recentLab = details.orders.find((o) => o.orderType === 'lab' && o.results.length > 0);
  const recentRad = details.orders.find((o) => o.orderType === 'radiology' && o.results.length > 0);
  const runningMeds = details.prescriptions[0]; // newest

  return (
    <div className="space-y-5 py-3">
      {/* Diagnosis + admission */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Label className="text-xs text-slate-500">Working diagnosis</Label>
          <div className="font-medium whitespace-pre-wrap">{details.admission?.diagnosis || '—'}</div>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Admitted</Label>
          <div className="font-medium">
            {details.admission?.admissionDate ? new Date(details.admission.admissionDate).toLocaleString() : '—'}
          </div>
        </div>
      </div>

      {/* Latest vitals with delta vs previous record */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <Label className="text-xs uppercase tracking-wide text-slate-500">Latest vitals</Label>
          {latest && (
            <span className="text-xs text-slate-500">
              {new Date(latest.recordedAt).toLocaleString()}
              {prev && ` · vs ${new Date(prev.recordedAt).toLocaleString()}`}
            </span>
          )}
        </div>
        {!latest ? (
          <div className="text-sm text-slate-500 italic">No vitals recorded yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <VitalTile label="Heart rate" unit="bpm"
              value={latest.heartRate}
              delta={delta(latest.heartRate, prev?.heartRate)}
              colorCls={getVitalColor(getVitalStatus(String(latest.heartRate ?? ''), 'hr'))} />
            <VitalTile label="Blood pressure" unit="mmHg"
              value={latest.bp}
              delta={delta(latest.systolicBP, prev?.systolicBP)}
              deltaSuffix=" sys"
              colorCls="" />
            <VitalTile label="SpO₂" unit="%"
              value={latest.spo2}
              delta={delta(latest.spo2, prev?.spo2)}
              colorCls={getVitalColor(getVitalStatus(String(latest.spo2 ?? ''), 'spo2'))} />
            <VitalTile label="Temperature" unit="°F"
              value={latest.temperature}
              delta={delta(latest.temperature, prev?.temperature)}
              colorCls={getVitalColor(getVitalStatus(String(latest.temperature ?? ''), 'temp'))} />
            <VitalTile label="Resp rate" unit="/min"
              value={latest.respiratoryRate}
              delta={delta(latest.respiratoryRate, prev?.respiratoryRate)}
              colorCls="" />
            <VitalTile label="GCS" unit=""
              value={latest.gcs}
              delta={delta(latest.gcs, prev?.gcs)}
              colorCls="" />
            {latest.ventilatorMode && (
              <VitalTile label="Vent mode" unit="" value={latest.ventilatorMode} delta={null} colorCls="" />
            )}
            {latest.fio2 != null && (
              <VitalTile label="FiO₂" unit="%" value={latest.fio2} delta={delta(latest.fio2, prev?.fio2)} colorCls="" />
            )}
          </div>
        )}
      </div>

      {/* Running medications */}
      <div>
        <Label className="text-xs uppercase tracking-wide text-slate-500">Running medications</Label>
        {!runningMeds ? (
          <div className="text-sm text-slate-500 italic mt-2">No prescriptions recorded.</div>
        ) : (
          <div className="mt-2 border rounded-md p-3 bg-slate-50">
            <div className="text-xs text-slate-500 mb-2">
              By {runningMeds.doctor} · {new Date(runningMeds.createdAt).toLocaleString()}
            </div>
            {renderDrugList(runningMeds.drugs)}
          </div>
        )}
      </div>

      {/* At-a-glance recent reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ReportSnippet label="Most recent lab" order={recentLab} />
        <ReportSnippet label="Most recent radiology" order={recentRad} />
      </div>
    </div>
  );
}

function VitalTile({
  label, unit, value, delta, deltaSuffix, colorCls,
}: {
  label: string;
  unit: string;
  value: string | number | null | undefined;
  delta: { text: string; cls: string } | null;
  deltaSuffix?: string;
  colorCls: string;
}) {
  return (
    <div className="p-3 bg-slate-50 rounded-md border">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="flex items-baseline gap-2 mt-0.5">
        <div className={`font-semibold text-lg ${colorCls}`}>
          {value ?? '—'}{value != null && unit ? ` ${unit}` : ''}
        </div>
        {delta && (
          <div className={`text-xs ${delta.cls}`}>{delta.text}{deltaSuffix || ''}</div>
        )}
      </div>
    </div>
  );
}

function renderDrugList(drugs: any): JSX.Element {
  if (!drugs) return <span className="text-sm text-slate-500 italic">—</span>;
  const list = Array.isArray(drugs) ? drugs : Array.isArray(drugs?.items) ? drugs.items : null;
  if (!list || list.length === 0) {
    // Fallback — render the JSON so something always shows up rather
    // than a confusing blank panel.
    return <pre className="text-xs text-slate-600 whitespace-pre-wrap">{JSON.stringify(drugs, null, 2)}</pre>;
  }
  return (
    <ul className="space-y-1 text-sm">
      {list.map((d: any, i: number) => (
        <li key={i} className="flex items-baseline gap-2">
          <span className="font-medium">{d.name || d.drug || d.medication || `Drug ${i + 1}`}</span>
          {(d.dose || d.dosage || d.strength) && (
            <span className="text-slate-500">· {d.dose || d.dosage || d.strength}</span>
          )}
          {(d.frequency || d.freq) && <span className="text-slate-500">· {d.frequency || d.freq}</span>}
          {d.route && <span className="text-slate-500">· {d.route}</span>}
        </li>
      ))}
    </ul>
  );
}

function ReportSnippet({ label, order }: { label: string; order: DetailsOrder | undefined }) {
  if (!order) {
    return (
      <div className="border rounded-md p-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-sm text-slate-500 italic mt-1">None yet.</div>
      </div>
    );
  }
  const latest = order.results[0];
  return (
    <div className="border rounded-md p-3">
      <div className="flex justify-between items-baseline gap-2">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-xs text-slate-500">{new Date(order.orderedAt).toLocaleDateString()}</div>
      </div>
      <div className="font-medium text-sm mt-1">
        {order.details?.testName || order.details?.modality || order.details?.test || 'Order'}
      </div>
      {latest && (
        <div className="text-xs text-slate-600 mt-1 line-clamp-2 whitespace-pre-wrap">
          {summarizeResult(latest.resultData)}
        </div>
      )}
    </div>
  );
}

function summarizeResult(rd: any): string {
  if (!rd) return '';
  if (typeof rd === 'string') return rd;
  if (Array.isArray(rd?.values)) {
    return rd.values.slice(0, 3).map((v: any) => `${v.name}: ${v.value}${v.unit || ''}`).join(' · ');
  }
  if (rd?.impression) return String(rd.impression);
  if (rd?.findings) return String(rd.findings).slice(0, 140);
  return JSON.stringify(rd).slice(0, 120);
}

function ICUTrendPane({ vitals }: { vitals: DetailsVitals[] }) {
  if (vitals.length === 0) {
    return <div className="py-8 text-center text-slate-500">No vitals recorded yet.</div>;
  }
  const reversed = [...vitals].reverse(); // chronological
  // Inline-SVG mini sparkline so we don't pull in a chart library just
  // for four lines. One line per series, normalized to its own range.
  const series: Array<{ label: string; values: Array<number | null> }> = [
    { label: 'HR', values: reversed.map((v) => v.heartRate) },
    { label: 'SpO₂', values: reversed.map((v) => v.spo2) },
    { label: 'Sys BP', values: reversed.map((v) => v.systolicBP) },
    { label: 'Temp', values: reversed.map((v) => v.temperature) },
  ];
  return (
    <div className="space-y-4 py-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {series.map((s) => (
          <Sparkline key={s.label} label={s.label} values={s.values} />
        ))}
      </div>
      <div>
        <Label className="text-xs uppercase tracking-wide text-slate-500">Last 30 readings</Label>
        <div className="mt-2 border rounded-md divide-y">
          {vitals.map((v) => (
            <div key={v.id} className="px-3 py-2 grid grid-cols-2 md:grid-cols-7 gap-2 text-sm">
              <div className="text-xs text-slate-500">{new Date(v.recordedAt).toLocaleString()}</div>
              <div>HR: {v.heartRate ?? '—'}</div>
              <div>BP: {v.bp ?? '—'}</div>
              <div>SpO₂: {v.spo2 ?? '—'}</div>
              <div>Temp: {v.temperature ?? '—'}</div>
              <div>RR: {v.respiratoryRate ?? '—'}</div>
              <div>GCS: {v.gcs ?? '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Sparkline({ label, values }: { label: string; values: Array<number | null> }) {
  const numbers = values.filter((n): n is number => n != null);
  const w = 240; const h = 50;
  if (numbers.length === 0) {
    return (
      <div className="border rounded-md p-3">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-xs text-slate-400 italic mt-2">No data</div>
      </div>
    );
  }
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = max - min || 1;
  const pts = values
    .map((n, i) => {
      if (n == null) return null;
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = h - ((n - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');
  const latest = numbers[numbers.length - 1];
  const first = numbers[0];
  const change = latest - first;
  return (
    <div className="border rounded-md p-3">
      <div className="flex justify-between items-baseline">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-xs text-slate-500">
          {latest} <span className={change > 0 ? 'text-rose-600' : change < 0 ? 'text-emerald-600' : ''}>
            ({change > 0 ? '+' : ''}{change.toFixed(1)} since start)
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12 mt-1">
        <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-500" />
      </svg>
    </div>
  );
}

function ICUReportsPane({ orders }: { orders: DetailsOrder[] }) {
  if (orders.length === 0) {
    return <div className="py-8 text-center text-slate-500">No lab or radiology orders yet.</div>;
  }
  // For each lab "test name" track the previous result so we can render
  // a diff inline. Naive name-based pairing — good enough until we model
  // result lineage properly.
  return (
    <div className="space-y-3 py-3">
      {orders.map((o, i) => {
        const prevSameType = orders.slice(i + 1).find((p) => p.orderType === o.orderType);
        return (
          <ReportRow key={o.id} order={o} prev={prevSameType} />
        );
      })}
    </div>
  );
}

function ReportRow({ order, prev }: { order: DetailsOrder; prev?: DetailsOrder }) {
  const result = order.results[0];
  const prevResult = prev?.results[0];
  return (
    <div className="border rounded-md p-3">
      <div className="flex justify-between items-baseline gap-2 flex-wrap">
        <div>
          <span className="text-[10px] uppercase tracking-wide font-medium text-slate-500">{order.orderType}</span>{' '}
          <span className="font-medium">{order.details?.testName || order.details?.modality || order.details?.test || 'Order'}</span>
          {order.priority && order.priority !== 'routine' && (
            <Badge className="ml-2 bg-orange-100 text-orange-800" variant="secondary">{order.priority}</Badge>
          )}
        </div>
        <div className="text-xs text-slate-500">{new Date(order.orderedAt).toLocaleString()}</div>
      </div>
      {!result ? (
        <div className="text-sm text-slate-500 italic mt-1">{order.status} — no result yet.</div>
      ) : (
        <div className="mt-2">
          {Array.isArray((result.resultData as any)?.values) ? (
            <table className="text-sm w-full">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="text-left font-normal py-1">Test</th>
                  <th className="text-left font-normal">Value</th>
                  <th className="text-left font-normal">Range</th>
                  <th className="text-left font-normal">Δ vs previous</th>
                </tr>
              </thead>
              <tbody>
                {(result.resultData as any).values.map((row: any, idx: number) => {
                  const prevRow = Array.isArray((prevResult?.resultData as any)?.values)
                    ? (prevResult?.resultData as any).values.find((r: any) => r.name === row.name)
                    : null;
                  const cur = parseFloat(row.value);
                  const prv = prevRow ? parseFloat(prevRow.value) : NaN;
                  const d = !Number.isNaN(cur) && !Number.isNaN(prv) ? +(cur - prv).toFixed(2) : null;
                  return (
                    <tr key={idx} className={row.abnormal ? 'bg-rose-50' : ''}>
                      <td className="py-1">{row.name}</td>
                      <td className="font-medium">{row.value}{row.unit ? ` ${row.unit}` : ''}</td>
                      <td className="text-slate-500">{row.range || '—'}</td>
                      <td className={d == null ? 'text-slate-400' : d > 0 ? 'text-rose-600' : d < 0 ? 'text-emerald-600' : ''}>
                        {d == null ? '—' : `${d > 0 ? '+' : ''}${d}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-sm whitespace-pre-wrap">
              {(result.resultData as any)?.impression || (result.resultData as any)?.findings || JSON.stringify(result.resultData)}
            </div>
          )}
          {result.isCritical && <Badge className="bg-red-600 mt-2">Critical</Badge>}
        </div>
      )}
    </div>
  );
}

function ICUMedsPane({ prescriptions }: { prescriptions: DetailsPrescription[] }) {
  if (prescriptions.length === 0) {
    return <div className="py-8 text-center text-slate-500">No prescriptions recorded yet.</div>;
  }
  return (
    <div className="space-y-3 py-3">
      {prescriptions.map((rx) => (
        <div key={rx.id} className="border rounded-md p-3">
          <div className="flex justify-between items-baseline gap-2 flex-wrap">
            <div className="text-xs text-slate-500">By {rx.doctor}</div>
            <div className="text-xs text-slate-500">{new Date(rx.createdAt).toLocaleString()}</div>
          </div>
          <div className="mt-2">{renderDrugList(rx.drugs)}</div>
        </div>
      ))}
    </div>
  );
}

function ICUTransferPicker({
  beds, search, setSearch, wardFilter, setWardFilter, selected, setSelected,
}: {
  beds: PickerBed[];
  search: string;
  setSearch: (s: string) => void;
  wardFilter: string;
  setWardFilter: (s: string) => void;
  selected: string;
  setSelected: (s: string) => void;
}) {
  const vacant = (s: string) => ['vacant', 'available'].includes((s || '').toLowerCase());
  const categories = Array.from(new Set(beds.map((b) => b.ward?.type || b.category || 'OTHER')));
  const countsByCategory: Record<string, { total: number; vacant: number }> = {};
  for (const b of beds) {
    const cat = (b.ward?.type || b.category || 'OTHER');
    if (!countsByCategory[cat]) countsByCategory[cat] = { total: 0, vacant: 0 };
    countsByCategory[cat].total += 1;
    if (vacant(b.status)) countsByCategory[cat].vacant += 1;
  }
  const q = search.trim().toLowerCase();
  const matchesSearch = (b: PickerBed) =>
    !q ||
    b.bedNumber.toLowerCase().includes(q) ||
    (b.ward?.name || '').toLowerCase().includes(q) ||
    (b.category || '').toLowerCase().includes(q);
  const visible = beds
    .filter((b) => wardFilter === 'all' || (b.ward?.type || b.category) === wardFilter)
    .filter(matchesSearch);
  const groups: Record<string, { wardName: string; wardType: string; beds: PickerBed[] }> = {};
  for (const b of visible) {
    const key = b.ward?.id || b.category || 'OTHER';
    const wardName = b.ward?.name || b.category || 'Uncategorized';
    const wardType = b.ward?.type || b.category || 'OTHER';
    if (!groups[key]) groups[key] = { wardName, wardType, beds: [] };
    groups[key].beds.push(b);
  }
  const groupList = Object.values(groups).sort((a, b) => a.wardName.localeCompare(b.wardName));
  return (
    <div className="space-y-3 py-2">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search bed number, ward…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <Select value={wardFilter} onValueChange={setWardFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All wards ({beds.length})</SelectItem>
            {categories.sort((a, b) => a.localeCompare(b)).map((cat) => {
              const c = countsByCategory[cat];
              return (
                <SelectItem key={cat} value={cat}>
                  {cat} ({c.vacant} vacant / {c.total})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      {groupList.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border rounded-lg">
          No beds match. Clear the search or pick "All wards".
        </div>
      ) : (
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {groupList.map((g) => (
            <div key={g.wardName}>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                {g.wardName}{' '}
                <span className="text-slate-400 font-normal">
                  ({g.beds.filter((b) => vacant(b.status)).length} vacant / {g.beds.length})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {g.beds.map((bed) => {
                  const v = vacant(bed.status);
                  const sel = selected === bed.id;
                  return (
                    <button
                      key={bed.id}
                      type="button"
                      disabled={!v}
                      onClick={() => v && setSelected(bed.id)}
                      className={[
                        'text-left rounded-md border-2 p-2 transition',
                        sel
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : v
                            ? 'border-green-500 bg-green-50 hover:bg-green-100 cursor-pointer'
                            : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed',
                      ].join(' ')}
                    >
                      <div className="font-medium text-sm">{bed.bedNumber}</div>
                      <div className={`text-[10px] ${sel ? 'text-blue-50' : 'text-slate-500'}`}>
                        {v ? 'Vacant' : bed.status}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
