import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Bed, LogOut, Search, ArrowLeftRight } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { toArray } from '../utils/list';
import { WARD_CATEGORIES, IPD_WARD_TYPES, CRITICAL_CARE_TYPES, labelFor } from '../lib/wardCategories';

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
  category?: string;
  status: string;
  wardId?: string | null;
  ward?: { id: string; name: string; type?: string } | null;
  branchId?: string;
  floor?: string | null;
}

// Joined view of a bed + the admission currently occupying it (if any).
// Drives the card grid below — one card per bed, no separate admission row.
interface BedCardData {
  bed: Bed;
  admission: Admission | null;
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
  const toast = useToast();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isAdmitDialogOpen, setIsAdmitDialogOpen] = useState(false);
  const [isDischargeDialogOpen, setIsDischargeDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isBedDetailsOpen, setIsBedDetailsOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<BedCardData | null>(null);
  const [transferTargetBedId, setTransferTargetBedId] = useState<string>('');
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
      setBeds(toArray<Bed>(response.data));
    } catch (error) {
      console.error('Error fetching beds:', error);
      setBeds([]);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/api/patients', { params: { limit: 500 } });
      setPatients(toArray<Patient>(response.data));
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
    }
  };

  const errMsg = (e: any, fallback: string) => {
    const data = e?.response?.data;
    if (data?.details?.[0]) {
      const d = data.details[0];
      return d.field ? `${d.field}: ${d.message}` : d.message;
    }
    return data?.error || data?.message || e?.message || fallback;
  };

  // Inline seed trigger so an admin who lands on this page with an empty
  // bed list can fix it in one click without navigating to Master Data.
  const handleSeedFromHere = async () => {
    if (!confirm('Create the standard ward types and their default beds? Existing wards are kept; missing beds are filled in.')) return;
    setLoading(true);
    try {
      const res = await api.post('/api/master/seed-standard-wards');
      await fetchBeds();
      await fetchAdmissions();
      const created = (res.data?.summary || []).reduce((a: number, b: any) => a + (b.bedsCreated || 0), 0);
      const migrated = (res.data?.summary || []).reduce((a: number, b: any) => a + (b.bedsMigrated || 0), 0);
      toast.success(
        `Seed complete`,
        `Created ${created} bed${created === 1 ? '' : 's'}${migrated ? `, migrated ${migrated} from the wrong table` : ''}.`,
      );
    } catch (error: any) {
      console.error('Seed standard wards error:', error);
      toast.error('Could not seed wards', errMsg(error, 'Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdmit = async () => {
    if (!admitFormData.patientId) { toast.warning('Patient required'); return; }

    setLoading(true);
    try {
      await api.post('/api/admissions', {
        patientId: admitFormData.patientId,
        bedId: admitFormData.bedId || null,
        diagnosis: admitFormData.diagnosis || undefined,
        admissionNotes: admitFormData.admissionNotes || undefined,
      });

      await fetchAdmissions();
      await fetchBeds();
      setIsAdmitDialogOpen(false);
      setAdmitFormData({ patientId: '', bedId: '', diagnosis: '', admissionNotes: '' });
      toast.success('Patient admitted');
    } catch (error: any) {
      console.error('Error admitting patient:', error);
      toast.error('Could not admit patient', errMsg(error, 'Try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Bed transfer (cross-ward re-allocation). Calls a backend endpoint to swap
  // the admission's bedId; the backend frees the old bed and occupies the new.
  const openTransferDialog = (admission: Admission) => {
    setSelectedAdmission(admission);
    setTransferTargetBedId('');
    setIsTransferDialogOpen(true);
  };

  const handleTransferBed = async () => {
    if (!selectedAdmission || !transferTargetBedId) {
      toast.warning('Pick a bed', 'Select the destination bed.');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/api/admissions/${selectedAdmission.id}/transfer-bed`, {
        bedId: transferTargetBedId,
      });
      await fetchAdmissions();
      await fetchBeds();
      setIsTransferDialogOpen(false);
      setSelectedAdmission(null);
      setTransferTargetBedId('');
      toast.success('Bed transferred');
    } catch (error: any) {
      console.error('Error transferring bed:', error);
      toast.error('Could not transfer bed', errMsg(error, 'Try again.'));
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
    } catch (error: any) {
      console.error('Error discharging patient:', error);
      toast.error('Could not discharge patient', errMsg(error, 'Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const openDischargeDialog = (admission: Admission) => {
    setSelectedAdmission(admission);
    setIsDischargeDialogOpen(true);
  };

  // Backend bed.status defaults to 'vacant'; legacy seeds may use 'available'.
  // Normalize so the filter catches both.
  const isVacant = (s: string) => ['vacant', 'available'].includes((s || '').toLowerCase());
  const isOccupied = (s: string) => (s || '').toLowerCase() === 'occupied';
  const availableBeds = beds.filter(bed => isVacant(bed.status));
  const occupiedBeds = beds.filter(bed => isOccupied(bed.status));
  const activeAdmissions = admissions.filter(adm => adm.status === 'active');

  const stats = {
    totalBeds: beds.length,
    occupied: occupiedBeds.length,
    available: availableBeds.length,
    activeAdmissions: activeAdmissions.length
  };

  // Build the bed-card view: for each bed, attach the active admission
  // currently occupying it (matched by bedId). Beds without an admission
  // show as vacant/cleaning/maintenance; beds with one show patient info.
  //
  // ITU / HDU / ICCU live on the ICU page so we filter them out here —
  // surfacing them in two places would let staff assign the same bed
  // from both screens and produce conflicting writes.
  const admissionByBedId = new Map<string, Admission>();
  for (const adm of activeAdmissions) {
    if (adm.bedId) admissionByBedId.set(adm.bedId, adm);
  }
  const ipdBeds: BedCardData[] = beds
    .filter((b) => {
      const cat = b.ward?.type || b.category;
      return !cat || !CRITICAL_CARE_TYPES.includes(cat);
    })
    .map((bed) => ({
      bed,
      admission: bed.id ? admissionByBedId.get(bed.id) || null : null,
    }));

  // Apply the search filter — match on patient name/MRN, bed number, or
  // ward name so an operator can find a card by any of those.
  const search = searchTerm.trim().toLowerCase();
  const filteredCards = !search
    ? ipdBeds
    : ipdBeds.filter(({ bed, admission }) => {
        return (
          bed.bedNumber.toLowerCase().includes(search) ||
          (bed.ward?.name || '').toLowerCase().includes(search) ||
          (admission?.patientName || '').toLowerCase().includes(search) ||
          (admission?.patientMRN || '').toLowerCase().includes(search)
        );
      });

  const cardsForCategory = (catType: string | null): BedCardData[] => {
    if (!catType) return filteredCards;
    return filteredCards.filter((c) => (c.bed.ward?.type || c.bed.category) === catType);
  };

  const bedStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'occupied') return <Badge>Occupied</Badge>;
    if (s === 'cleaning') return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Cleaning</Badge>;
    if (s === 'maintenance') return <Badge variant="secondary" className="bg-red-100 text-red-800">Maintenance</Badge>;
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Vacant</Badge>;
  };

  const openBedDetails = (data: BedCardData) => {
    setSelectedBed(data);
    setIsBedDetailsOpen(true);
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
                    <SelectValue placeholder={availableBeds.length ? 'Select bed (optional)' : 'No vacant beds — admit first, assign later'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBeds.map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>
                        {(bed.ward?.name || 'Ward')} — {bed.bedNumber}
                        {bed.category ? ` · ${bed.category}` : ''}
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
            <CardTitle>Ward Bed Status</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Patient, MRN, bed, ward…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ipdBeds.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-3">
              <div>
                {beds.length === 0
                  ? 'No beds are configured for this branch yet.'
                  : `${beds.length} bed${beds.length === 1 ? '' : 's'} returned, but none are non-critical (Pvt Cabin / share / Men's / Women's / Nursery). Critical-care beds live on the ICU page.`}
              </div>
              <div>
                Click below to create the 10 standard ward types and their default beds, or
                go to <span className="font-medium">Master Data → Beds</span> to add beds manually.
              </div>
              <Button onClick={handleSeedFromHere} disabled={loading} className="mt-2">
                {loading ? 'Seeding…' : 'Seed standard wards'}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="all">All ({filteredCards.length})</TabsTrigger>
                {WARD_CATEGORIES
                  .filter((c) => IPD_WARD_TYPES.includes(c.type))
                  .map((c) => {
                    const n = cardsForCategory(c.type).length;
                    return (
                      <TabsTrigger key={c.type} value={c.type}>
                        {c.label} ({n})
                      </TabsTrigger>
                    );
                  })}
              </TabsList>

              {[null, ...IPD_WARD_TYPES].map((cat) => {
                const tabValue = cat || 'all';
                const cards = cardsForCategory(cat);
                return (
                  <TabsContent key={tabValue} value={tabValue}>
                    {cards.length === 0 ? (
                      <div className="text-center py-10 text-slate-500">
                        No beds in this category. Add one from Master Data → Beds.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {cards.map(({ bed, admission }) => {
                          const status = (bed.status || '').toLowerCase();
                          const occupied = status === 'occupied';
                          return (
                            <Card
                              key={bed.id}
                              onClick={() => openBedDetails({ bed, admission })}
                              className={`cursor-pointer transition-shadow hover:shadow-md ${occupied ? 'border-blue-200 bg-blue-50' : ''}`}
                            >
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <CardTitle className="text-base flex items-center gap-1">
                                      <Bed className="w-4 h-4" />
                                      {bed.bedNumber}
                                    </CardTitle>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                      {bed.ward?.name || 'Unassigned ward'}
                                      {bed.floor ? ` · Floor ${bed.floor}` : ''}
                                    </div>
                                    <div className="text-[10px] uppercase tracking-wide text-slate-400 mt-0.5">
                                      {labelFor(bed.ward?.type || bed.category)}
                                    </div>
                                  </div>
                                  {bedStatusBadge(bed.status)}
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                {occupied && admission ? (
                                  <div className="space-y-1">
                                    <div className="font-medium text-sm">{admission.patientName}</div>
                                    <div className="text-xs text-slate-500">
                                      {admission.patientMRN}
                                    </div>
                                    {admission.diagnosis && (
                                      <div className="text-xs text-slate-600 line-clamp-2 mt-1">
                                        {admission.diagnosis}
                                      </div>
                                    )}
                                    <div className="text-[10px] text-slate-400 mt-1">
                                      Admitted: {admission.admissionDate}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-500 italic">
                                    {status === 'cleaning' ? 'Awaiting cleaning' :
                                     status === 'maintenance' ? 'Out of service' :
                                     'Ready for admission'}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Bed details popup — mirrors the ICU patient-details popup. Shows
          bed metadata, plus patient + admission info when occupied, and
          the Transfer / Discharge actions. */}
      <Dialog open={isBedDetailsOpen} onOpenChange={setIsBedDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bed Details</DialogTitle>
            <DialogDescription>
              {selectedBed?.bed.bedNumber} · {selectedBed?.bed.ward?.name || 'Unassigned ward'}
            </DialogDescription>
          </DialogHeader>
          {selectedBed && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-slate-500">Bed</Label>
                  <div className="font-medium">{selectedBed.bed.bedNumber}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Ward</Label>
                  <div className="font-medium">{selectedBed.bed.ward?.name || '—'}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Category</Label>
                  <div className="font-medium">{labelFor(selectedBed.bed.ward?.type || selectedBed.bed.category)}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Floor</Label>
                  <div className="font-medium">{selectedBed.bed.floor || '—'}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Status</Label>
                  <div>{bedStatusBadge(selectedBed.bed.status)}</div>
                </div>
              </div>

              {selectedBed.admission ? (
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <Label className="text-sm text-slate-500">Patient</Label>
                    <div className="font-medium">{selectedBed.admission.patientName}</div>
                    <div className="text-xs text-slate-500">MRN: {selectedBed.admission.patientMRN}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-slate-500">Admission Date</Label>
                      <div className="font-medium">{selectedBed.admission.admissionDate}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">Attending Doctor</Label>
                      <div className="font-medium">{selectedBed.admission.admittingDoctor}</div>
                    </div>
                  </div>
                  {selectedBed.admission.diagnosis && (
                    <div>
                      <Label className="text-sm text-slate-500">Diagnosis</Label>
                      <div className="font-medium">{selectedBed.admission.diagnosis}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t pt-4 text-sm text-slate-500 italic">
                  No patient assigned to this bed.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedBed?.admission && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBedDetailsOpen(false);
                    openTransferDialog(selectedBed.admission!);
                  }}
                >
                  <ArrowLeftRight className="w-4 h-4 mr-1" />
                  Transfer
                </Button>
                <Button
                  onClick={() => {
                    setIsBedDetailsOpen(false);
                    openDischargeDialog(selectedBed.admission!);
                  }}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Discharge
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsBedDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Transfer-bed dialog: re-allocate a patient between wards / beds.
          Lists every vacant bed across all wards (ICU, regular, etc.) so
          an ICU patient can be moved to general and vice-versa. */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transfer Patient to Another Bed</DialogTitle>
            <DialogDescription>
              {selectedAdmission ? (
                <>
                  {selectedAdmission.patientName} ({selectedAdmission.patientMRN}) — currently in
                  {' '}<span className="font-medium">{selectedAdmission.ward || 'unassigned ward'}</span>
                  {selectedAdmission.bedNumber && selectedAdmission.bedNumber !== 'Unassigned'
                    ? ` · bed ${selectedAdmission.bedNumber}` : ''}
                </>
              ) : 'Select a destination bed.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Destination bed</Label>
              <Select value={transferTargetBedId} onValueChange={setTransferTargetBedId}>
                <SelectTrigger>
                  <SelectValue placeholder={availableBeds.length ? 'Pick a vacant bed' : 'No vacant beds available'} />
                </SelectTrigger>
                <SelectContent>
                  {availableBeds
                    .filter((b) => b.id !== selectedAdmission?.bedId)
                    .map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>
                        {(bed.ward?.name || 'Ward')} — {bed.bedNumber}
                        {bed.category ? ` · ${bed.category}` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                The current bed will be marked vacant and the destination bed marked occupied.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleTransferBed} disabled={loading || !transferTargetBedId}>
              {loading ? 'Transferring…' : 'Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
