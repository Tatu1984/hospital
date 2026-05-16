// Ambulance & transport dispatch.
//
// Single-page console that pairs the hospital's fleet with current trips:
//   - Fleet grid: one card per ambulance, click to edit (driver, equipment,
//     maintenance). New 'Add Vehicle' dialog covers type-specific kits
//     (BLS / ALS / ICU / Cardiac / Neonatal / Bariatric / Obstetric /
//     Patient Transport / Mortuary) — types + default equipment come from
//     GET /api/ambulance/types so the catalogue stays server-authoritative.
//   - Trip board: tabs for Active / Pending / All. The create-trip dialog
//     accepts an OPTIONAL vehicle assignment so dispatch can either book
//     the unit immediately or leave it pending for later allocation.
//
// Status normalisation: backend stores lower_case while older clients
// sometimes send UPPER_CASE. The `eq()` helper compares case-insensitively
// so the UI is robust either way.

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ambulance as AmbulanceIcon, Plus, MapPin, Clock, CheckCircle, Wrench, Phone } from 'lucide-react';
import api from '../services/api';

interface AmbulanceVehicle {
  id: string;
  vehicleNumber: string;
  type: string;
  driverName?: string | null;
  driverPhone?: string | null;
  status: string;
  equipment?: string[] | null;
  notes?: string | null;
  currentLocation?: string | null;
  lastMaintenance?: string | null;
  // Server-side compat fields kept in case some callers still send them.
  driver?: string;
  lastService?: string;
}

interface TripRequest {
  id: string;
  patientName?: string;
  patientPhone?: string;
  pickupLocation: string;
  dropLocation: string;
  startTime: string;
  requestTime?: string;
  tripType: string;
  status: string;
  vehicleNumber?: string;
  assignedVehicle?: string;
  driverName?: string;
}

interface TripFormData {
  patientName: string;
  patientPhone: string;
  pickupLocation: string;
  dropLocation: string;
  tripType: string;
  urgency: string;
  vehicleId: string; // empty string → leave pending
  notes: string;
}

interface AmbulanceTypeDef {
  code: string;
  label: string;
  description: string;
  defaultEquipment: string[];
}

const eq = (a: string | undefined | null, ...accept: string[]) =>
  !!a && accept.some((x) => x.toLowerCase() === a.toLowerCase());

export default function Ambulance() {
  const [vehicles, setVehicles] = useState<AmbulanceVehicle[]>([]);
  const [trips, setTrips] = useState<TripRequest[]>([]);
  const [types, setTypes] = useState<AmbulanceTypeDef[]>([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Dialogs
  const [isTripDialogOpen, setIsTripDialogOpen] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<AmbulanceVehicle | null>(null);

  const [tripFormData, setTripFormData] = useState<TripFormData>({
    patientName: '',
    patientPhone: '',
    pickupLocation: '',
    dropLocation: '',
    tripType: 'EMERGENCY',
    urgency: 'HIGH',
    vehicleId: '',
    notes: '',
  });

  useEffect(() => {
    fetchTypes();
    fetchVehicles();
    fetchTrips();
    const interval = setInterval(fetchTrips, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchTypes() {
    try {
      const r = await api.get('/api/ambulance/types');
      setTypes(r.data?.types || []);
      setEquipmentCatalog(r.data?.equipment || {});
    } catch (e) {
      console.error('Failed to load ambulance types', e);
    }
  }
  async function fetchVehicles() {
    try {
      const r = await api.get('/api/ambulance/vehicles');
      setVehicles(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error('Failed to load vehicles', e);
    }
  }
  async function fetchTrips() {
    try {
      const r = await api.get('/api/ambulance/trips');
      setTrips(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error('Failed to load trips', e);
    }
  }

  async function handleCreateTrip() {
    setLoading(true);
    try {
      // If the dispatcher picked a vehicle at creation time, send vehicleId
      // in the payload and immediately assign after the trip exists. The
      // backend POST endpoint accepts vehicleNumber via 'vehicleId' isn't
      // wired today, so we do create-then-assign as two calls under one
      // user action — simpler than refactoring the server contract.
      const { vehicleId, ...rest } = tripFormData;
      const created = await api.post('/api/ambulance/trips', rest);
      const newId = created.data?.id;
      if (vehicleId && newId) {
        await api.post(`/api/ambulance/trips/${newId}/assign`, { vehicleId });
      }
      await Promise.all([fetchTrips(), fetchVehicles()]);
      setIsTripDialogOpen(false);
      resetTripForm();
    } catch (e: any) {
      console.error('Create trip error', e);
      alert(e?.response?.data?.error || e?.message || 'Failed to create trip request');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignVehicle(tripId: string, vehicleId: string) {
    setLoading(true);
    try {
      await api.post(`/api/ambulance/trips/${tripId}/assign`, { vehicleId });
      await Promise.all([fetchTrips(), fetchVehicles()]);
    } catch (e: any) {
      console.error('Assign error', e);
      alert(e?.response?.data?.error || 'Failed to assign vehicle');
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteTrip(tripId: string) {
    setLoading(true);
    try {
      await api.post(`/api/ambulance/trips/${tripId}/complete`);
      await Promise.all([fetchTrips(), fetchVehicles()]);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to complete trip');
    } finally {
      setLoading(false);
    }
  }

  function resetTripForm() {
    setTripFormData({
      patientName: '',
      patientPhone: '',
      pickupLocation: '',
      dropLocation: '',
      tripType: 'EMERGENCY',
      urgency: 'HIGH',
      vehicleId: '',
      notes: '',
    });
  }

  const availableVehicles = useMemo(() => vehicles.filter(v => eq(v.status, 'AVAILABLE')), [vehicles]);
  const activeTrips = useMemo(() => trips.filter(t => eq(t.status, 'IN_PROGRESS', 'ASSIGNED')), [trips]);
  const pendingTrips = useMemo(() => trips.filter(t => eq(t.status, 'PENDING')), [trips]);

  const stats = {
    totalVehicles: vehicles.length,
    available: availableVehicles.length,
    activeTrips: activeTrips.length,
    pending: pendingTrips.length,
  };

  function typeLabel(code: string): string {
    return types.find((t) => t.code === code)?.label || code;
  }
  function equipmentLabel(code: string): string {
    return equipmentCatalog[code] || code;
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Ambulance & Transport</h1>
          <p className="text-slate-600">Fleet management, trip dispatch, and emergency transport</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAddVehicleOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Vehicle
          </Button>
          <Button onClick={() => setIsTripDialogOpen(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            New Trip Request
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AmbulanceIcon className="w-4 h-4" />
              Total Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVehicles}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
              <MapPin className="w-4 h-4" />
              Active Trips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeTrips}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <Clock className="w-4 h-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Status */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Fleet</CardTitle>
          <CardDescription>Click any vehicle to view full equipment list or edit details</CardDescription>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              No vehicles in the fleet yet. Click "Add Vehicle" to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => setEditVehicle(vehicle)}
                  className={
                    'text-left rounded-lg border transition hover:shadow-md hover:border-slate-400 ' +
                    (eq(vehicle.status, 'AVAILABLE') ? 'border-green-200' : 'border-blue-200')
                  }
                >
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-lg font-semibold text-slate-900">{vehicle.vehicleNumber}</div>
                        <div className="text-xs text-slate-500">{typeLabel(vehicle.type)}</div>
                      </div>
                      <Badge variant={eq(vehicle.status, 'AVAILABLE') ? 'default' : 'secondary'}>
                        {vehicle.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      {(vehicle.driverName || vehicle.driver) && (
                        <div className="text-slate-700">Driver: {vehicle.driverName || vehicle.driver}</div>
                      )}
                      {vehicle.driverPhone && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Phone className="w-3 h-3" />
                          {vehicle.driverPhone}
                        </div>
                      )}
                    </div>
                    {(vehicle.equipment?.length ?? 0) > 0 && (
                      <div className="pt-2 border-t flex flex-wrap gap-1">
                        {(vehicle.equipment || []).slice(0, 4).map((code) => (
                          <span key={code} className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {equipmentLabel(code)}
                          </span>
                        ))}
                        {(vehicle.equipment?.length ?? 0) > 4 && (
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">
                            +{(vehicle.equipment?.length || 0) - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trip Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Management</CardTitle>
          <CardDescription>Manage transport requests and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="active">Active ({stats.activeTrips})</TabsTrigger>
              <TabsTrigger value="all">All Trips</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTrips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        No pending trips
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingTrips.map((trip) => (
                      <TableRow key={trip.id} className="bg-orange-50">
                        <TableCell>{new Date(trip.startTime || trip.requestTime || '').toLocaleTimeString()}</TableCell>
                        <TableCell>{trip.patientName || 'Walk-in'}</TableCell>
                        <TableCell className="max-w-xs truncate" title={trip.pickupLocation}>{trip.pickupLocation}</TableCell>
                        <TableCell className="max-w-xs truncate" title={trip.dropLocation}>{trip.dropLocation}</TableCell>
                        <TableCell><Badge variant="outline">{trip.tripType}</Badge></TableCell>
                        <TableCell>
                          <Select onValueChange={(value) => handleAssignVehicle(trip.id, value)}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder={availableVehicles.length ? 'Assign Vehicle' : 'No vehicles available'} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableVehicles.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.vehicleNumber} — {typeLabel(v.type)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="active">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTrips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No active trips
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeTrips.map((trip) => (
                      <TableRow key={trip.id} className="bg-blue-50">
                        <TableCell>{trip.patientName || 'Walk-in'}</TableCell>
                        <TableCell className="max-w-xs truncate">{trip.pickupLocation}</TableCell>
                        <TableCell className="max-w-xs truncate">{trip.dropLocation}</TableCell>
                        <TableCell><Badge variant="outline">{trip.tripType}</Badge></TableCell>
                        <TableCell>{trip.vehicleNumber || trip.assignedVehicle || 'N/A'}</TableCell>
                        <TableCell><Badge className="bg-blue-600">{trip.status}</Badge></TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => handleCompleteTrip(trip.id)} disabled={loading}>
                            Complete
                          </Button>
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
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.slice(0, 50).map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell>{new Date(trip.startTime || trip.requestTime || '').toLocaleString()}</TableCell>
                      <TableCell>{trip.patientName || 'Walk-in'}</TableCell>
                      <TableCell className="text-sm">
                        {trip.pickupLocation} → {trip.dropLocation}
                      </TableCell>
                      <TableCell><Badge variant="outline">{trip.tripType}</Badge></TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            eq(trip.status, 'COMPLETED') ? 'default' :
                            eq(trip.status, 'PENDING') ? 'secondary' :
                            'outline'
                          }
                        >
                          {trip.status}
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

      {/* New Trip Dialog */}
      <Dialog open={isTripDialogOpen} onOpenChange={setIsTripDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Trip Request</DialogTitle>
            <DialogDescription>Create a transport request. Assign a vehicle now or leave for dispatch.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient Name *</Label>
                <Input
                  placeholder="Patient name"
                  value={tripFormData.patientName}
                  onChange={(e) => setTripFormData({ ...tripFormData, patientName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="Contact number"
                  value={tripFormData.patientPhone}
                  onChange={(e) => setTripFormData({ ...tripFormData, patientPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pickup Location *</Label>
              <Input
                placeholder="Complete pickup address"
                value={tripFormData.pickupLocation}
                onChange={(e) => setTripFormData({ ...tripFormData, pickupLocation: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Drop Location *</Label>
              <Input
                placeholder="Destination address"
                value={tripFormData.dropLocation}
                onChange={(e) => setTripFormData({ ...tripFormData, dropLocation: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trip Type *</Label>
                <Select
                  value={tripFormData.tripType}
                  onValueChange={(value) => setTripFormData({ ...tripFormData, tripType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="TRANSFER">Inter-Hospital Transfer</SelectItem>
                    <SelectItem value="DISCHARGE">Discharge Transport</SelectItem>
                    <SelectItem value="ROUTINE">Routine Transport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Urgency *</Label>
                <Select
                  value={tripFormData.urgency}
                  onValueChange={(value) => setTripFormData({ ...tripFormData, urgency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">High Priority</SelectItem>
                    <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                    <SelectItem value="LOW">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assign Vehicle (optional)</Label>
              <Select
                value={tripFormData.vehicleId || 'NONE'}
                onValueChange={(value) => setTripFormData({ ...tripFormData, vehicleId: value === 'NONE' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={availableVehicles.length ? 'Pick a vehicle now…' : 'No vehicles available'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Leave pending (assign later)</SelectItem>
                  {availableVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.vehicleNumber} — {typeLabel(v.type)}
                      {v.driverName ? ` (${v.driverName})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="w-full min-h-[60px] p-3 border rounded-md"
                placeholder="Additional instructions..."
                value={tripFormData.notes}
                onChange={(e) => setTripFormData({ ...tripFormData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTripDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreateTrip} disabled={loading || !tripFormData.patientName.trim() || !tripFormData.pickupLocation.trim() || !tripFormData.dropLocation.trim()}>
              {loading ? 'Creating...' : 'Create Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Vehicle Dialog */}
      <VehicleFormDialog
        open={isAddVehicleOpen}
        mode="create"
        types={types}
        equipmentCatalog={equipmentCatalog}
        onClose={() => setIsAddVehicleOpen(false)}
        onSaved={async () => { await fetchVehicles(); setIsAddVehicleOpen(false); }}
      />

      {/* Edit Vehicle Dialog */}
      <VehicleFormDialog
        open={editVehicle !== null}
        mode="edit"
        vehicle={editVehicle || undefined}
        types={types}
        equipmentCatalog={equipmentCatalog}
        onClose={() => setEditVehicle(null)}
        onSaved={async () => { await fetchVehicles(); setEditVehicle(null); }}
      />
    </div>
  );
}

function VehicleFormDialog({
  open,
  mode,
  vehicle,
  types,
  equipmentCatalog,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  vehicle?: AmbulanceVehicle;
  types: AmbulanceTypeDef[];
  equipmentCatalog: Record<string, string>;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [type, setType] = useState<string>('BLS');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate / reset on every open transition. Tracking by `open` and
  // `vehicle?.id` ensures switching from one vehicle to another (or
  // between create / edit) refreshes the form rather than retaining
  // stale state.
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && vehicle) {
      setVehicleNumber(vehicle.vehicleNumber || '');
      setType(vehicle.type || 'BLS');
      setDriverName(vehicle.driverName || vehicle.driver || '');
      setDriverPhone(vehicle.driverPhone || '');
      setEquipment(Array.isArray(vehicle.equipment) ? vehicle.equipment : []);
      setNotes(vehicle.notes || '');
    } else {
      setVehicleNumber('');
      setType('BLS');
      setDriverName('');
      setDriverPhone('');
      // Pre-fill equipment with the chosen type's default kit so the
      // operator only has to tick off / add overrides.
      const def = types.find((t) => t.code === 'BLS');
      setEquipment(def?.defaultEquipment || []);
      setNotes('');
    }
    setError(null);
  }, [open, mode, vehicle?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // When operator changes the type (create flow), swap the default kit.
  // Edit flow leaves the existing kit alone so we don't clobber a
  // manually-curated equipment list.
  useEffect(() => {
    if (mode !== 'create') return;
    const def = types.find((t) => t.code === type);
    if (def) setEquipment(def.defaultEquipment);
  }, [type, mode, types]);

  function toggleEquipment(code: string) {
    setEquipment((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function submit() {
    setError(null);
    if (!vehicleNumber.trim()) {
      setError('Vehicle number is required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        vehicleNumber: vehicleNumber.trim(),
        type,
        driverName: driverName.trim() || null,
        driverPhone: driverPhone.trim() || null,
        equipment,
        notes: notes.trim() || null,
      };
      if (mode === 'create') {
        await api.post('/api/ambulance/vehicles', payload);
      } else if (vehicle) {
        await api.patch(`/api/ambulance/vehicles/${vehicle.id}`, {
          type, driverName: payload.driverName, driverPhone: payload.driverPhone, equipment, notes: payload.notes,
        });
      }
      await onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to save vehicle');
    } finally {
      setSubmitting(false);
    }
  }

  const typeDef = types.find((t) => t.code === type);
  const allEquipmentCodes = Object.keys(equipmentCatalog);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Vehicle' : `Edit ${vehicle?.vehicleNumber}`}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Pick the ambulance class and verify the kit. Defaults match the type — uncheck items the vehicle doesn\'t actually carry.'
              : 'Update driver, equipment, or service notes. To change status, use the trip-assign / complete flow.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vehicle Number *</Label>
              <Input
                placeholder="e.g. KA-01-AB-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                disabled={mode === 'edit'}
              />
              {mode === 'edit' && (
                <p className="text-xs text-slate-500">Vehicle number is the unique key — to change it, retire this row and add a new one.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeDef && (
                <p className="text-xs text-slate-500">{typeDef.description}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Driver Name</Label>
              <Input
                placeholder="Driver full name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Driver Phone</Label>
              <Input
                placeholder="+91 …"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Equipment ({equipment.length} of {allEquipmentCodes.length})
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 p-3 border border-slate-200 rounded max-h-[260px] overflow-y-auto">
              {allEquipmentCodes.map((code) => (
                <label key={code} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-slate-50 rounded p-1">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={equipment.includes(code)}
                    onChange={() => toggleEquipment(code)}
                  />
                  <span className="text-slate-700">{equipmentCatalog[code]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <textarea
              className="w-full min-h-[60px] p-3 border rounded-md"
              placeholder="Service notes, custom fit-out, special instructions…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !vehicleNumber.trim()}>
            {submitting ? 'Saving…' : (mode === 'create' ? 'Add Vehicle' : 'Save Changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
