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
import { Ambulance as AmbulanceIcon, Plus, MapPin, Clock, CheckCircle } from 'lucide-react';
import api from '../services/api';

interface AmbulanceVehicle {
  id: string;
  vehicleNumber: string;
  type: string;
  driver: string;
  driverPhone: string;
  status: string;
  lastService: string;
}

interface TripRequest {
  id: string;
  patientName: string;
  patientPhone: string;
  pickupLocation: string;
  dropLocation: string;
  requestTime: string;
  tripType: string;
  status: string;
  assignedVehicle?: string;
  estimatedTime?: string;
}

interface TripFormData {
  patientName: string;
  patientPhone: string;
  pickupLocation: string;
  dropLocation: string;
  tripType: string;
  urgency: string;
  notes: string;
}

export default function Ambulance() {
  const [vehicles, setVehicles] = useState<AmbulanceVehicle[]>([]);
  const [trips, setTrips] = useState<TripRequest[]>([]);
  const [isTripDialogOpen, setIsTripDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [tripFormData, setTripFormData] = useState<TripFormData>({
    patientName: '',
    patientPhone: '',
    pickupLocation: '',
    dropLocation: '',
    tripType: 'EMERGENCY',
    urgency: 'HIGH',
    notes: ''
  });

  useEffect(() => {
    fetchVehicles();
    fetchTrips();
    const interval = setInterval(fetchTrips, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/api/ambulance/vehicles');
      setVehicles(response.data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchTrips = async () => {
    try {
      const response = await api.get('/api/ambulance/trips');
      setTrips(response.data);
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  const handleCreateTrip = async () => {
    setLoading(true);
    try {
      await api.post('/api/ambulance/trips', tripFormData);
      await fetchTrips();
      setIsTripDialogOpen(false);
      resetTripForm();
      alert('Trip request created successfully');
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Failed to create trip request');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignVehicle = async (tripId: string, vehicleId: string) => {
    setLoading(true);
    try {
      await api.post(`/api/ambulance/trips/${tripId}/assign`, { vehicleId });
      await fetchTrips();
      await fetchVehicles();
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      alert('Failed to assign vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTrip = async (tripId: string) => {
    setLoading(true);
    try {
      await api.post(`/api/ambulance/trips/${tripId}/complete`);
      await fetchTrips();
      await fetchVehicles();
      alert('Trip marked as completed');
    } catch (error) {
      console.error('Error completing trip:', error);
      alert('Failed to complete trip');
    } finally {
      setLoading(false);
    }
  };

  const resetTripForm = () => {
    setTripFormData({
      patientName: '',
      patientPhone: '',
      pickupLocation: '',
      dropLocation: '',
      tripType: 'EMERGENCY',
      urgency: 'HIGH',
      notes: ''
    });
  };

  const availableVehicles = vehicles.filter(v => v.status === 'AVAILABLE');
  const activeTrips = trips.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED');
  const pendingTrips = trips.filter(t => t.status === 'PENDING');

  const stats = {
    totalVehicles: vehicles.length,
    available: availableVehicles.length,
    activeTrips: activeTrips.length,
    pending: pendingTrips.length
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Ambulance & Transport</h1>
          <p className="text-slate-600">Vehicle management, trip requests, and emergency transport</p>
        </div>
        <Button onClick={() => setIsTripDialogOpen(true)} size="lg">
          <Plus className="w-5 h-5 mr-2" />
          New Trip Request
        </Button>
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
          <CardDescription>Current status of all ambulances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className={vehicle.status === 'AVAILABLE' ? 'border-green-200' : 'border-blue-200'}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{vehicle.vehicleNumber}</CardTitle>
                    <Badge variant={vehicle.status === 'AVAILABLE' ? 'default' : 'secondary'}>
                      {vehicle.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Type:</span> {vehicle.type}</div>
                    <div><span className="font-medium">Driver:</span> {vehicle.driver}</div>
                    <div><span className="font-medium">Phone:</span> {vehicle.driverPhone}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trip Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Management</CardTitle>
          <CardDescription>Manage transport requests and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Active ({stats.activeTrips})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="all">All Trips</TabsTrigger>
            </TabsList>

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
                        <TableCell>
                          <div>
                            <div className="font-medium">{trip.patientName}</div>
                            <div className="text-xs text-slate-500">{trip.patientPhone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{trip.pickupLocation}</TableCell>
                        <TableCell className="max-w-xs truncate">{trip.dropLocation}</TableCell>
                        <TableCell><Badge variant="outline">{trip.tripType}</Badge></TableCell>
                        <TableCell>{trip.assignedVehicle || 'N/A'}</TableCell>
                        <TableCell><Badge className="bg-blue-600">{trip.status}</Badge></TableCell>
                        <TableCell>
                          {trip.status === 'ASSIGNED' && (
                            <Button size="sm" onClick={() => handleCompleteTrip(trip.id)}>
                              Complete
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

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
                        <TableCell>{new Date(trip.requestTime).toLocaleTimeString()}</TableCell>
                        <TableCell>{trip.patientName}</TableCell>
                        <TableCell>{trip.pickupLocation}</TableCell>
                        <TableCell>{trip.dropLocation}</TableCell>
                        <TableCell><Badge variant="outline">{trip.tripType}</Badge></TableCell>
                        <TableCell>
                          <Select onValueChange={(value) => handleAssignVehicle(trip.id, value)}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Assign Vehicle" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableVehicles.map((v) => (
                                <SelectItem key={v.id} value={v.id}>{v.vehicleNumber}</SelectItem>
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
                      <TableCell>{new Date(trip.requestTime).toLocaleString()}</TableCell>
                      <TableCell>{trip.patientName}</TableCell>
                      <TableCell className="text-sm">
                        {trip.pickupLocation} → {trip.dropLocation}
                      </TableCell>
                      <TableCell><Badge variant="outline">{trip.tripType}</Badge></TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            trip.status === 'COMPLETED' ? 'default' :
                            trip.status === 'PENDING' ? 'secondary' :
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
            <DialogDescription>Create a new ambulance/transport request</DialogDescription>
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
                <Label>Phone *</Label>
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
            <Button onClick={handleCreateTrip} disabled={loading}>
              {loading ? 'Creating...' : 'Create Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
