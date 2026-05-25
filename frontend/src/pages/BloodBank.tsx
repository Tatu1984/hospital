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
import { Droplet, UserPlus, Package, AlertTriangle, CheckCircle, Clock, Users, Plus } from 'lucide-react';
import api from '../services/api';
import MrnLink from '../components/MrnLink';

interface BloodInventory {
  id: string;
  bloodType: string;
  component: string;
  quantity: number;
  expiringIn7Days: number;
  expiringIn3Days: number;
  expired: number;
}

interface BloodRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  bloodType: string;
  component: string;
  unitsRequested: number;
  urgency: string;
  requestedDate: string;
  status: string;
  requestedBy: string;
  crossMatched: boolean;
}

interface Donor {
  id: string;
  name: string;
  bloodType: string;
  phone: string;
  lastDonationDate: string;
  totalDonations: number;
  eligibleForDonation: boolean;
}

interface DonorFormData {
  name: string;
  age: string;
  gender: string;
  bloodType: string;
  phone: string;
  email: string;
  address: string;
}

interface RequestFormData {
  patientId: string;
  bloodType: string;
  component: string;
  unitsRequested: string;
  urgency: string;
  indication: string;
}

export default function BloodBank() {
  const [inventory, setInventory] = useState<BloodInventory[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [isDonorDialogOpen, setIsDonorDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  // Add-Unit dialog: receives a fresh blood bag into inventory.
  // Distinct from "Register Donor" (which adds a person) and from
  // "New Request" (which is a clinician asking for blood).
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [unitFormData, setUnitFormData] = useState({
    bloodType: '',
    component: 'PACKED_RBC',
    bagNumber: '',
    volume: '350',
    collectionDate: new Date().toISOString().slice(0, 10),
    expiryDays: '42', // PRBC default 42 days
    location: '',
  });
  const [loading, setLoading] = useState(false);

  const [donorFormData, setDonorFormData] = useState<DonorFormData>({
    name: '',
    age: '',
    gender: '',
    bloodType: '',
    phone: '',
    email: '',
    address: ''
  });

  const [requestFormData, setRequestFormData] = useState<RequestFormData>({
    patientId: '',
    bloodType: '',
    component: '',
    unitsRequested: '',
    urgency: 'ROUTINE',
    indication: ''
  });

  useEffect(() => {
    fetchInventory();
    fetchRequests();
    fetchDonors();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await api.get('/api/blood-bank/inventory');
      setInventory(response.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await api.get('/api/blood-bank/requests');
      const transformedRequests = response.data.map((r: any) => ({
        id: r.id,
        patientId: r.patientId,
        patientName: r.patient?.name || 'Unknown',
        patientMRN: r.patient?.mrn || 'N/A',
        bloodType: r.bloodType,
        component: r.component,
        unitsRequested: r.unitsRequested,
        urgency: r.urgency,
        requestedDate: new Date(r.createdAt).toLocaleDateString(),
        status: r.status,
        requestedBy: r.requestedBy?.name || 'Staff',
        crossMatched: r.crossMatched || false
      }));
      setRequests(transformedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchDonors = async () => {
    try {
      const response = await api.get('/api/blood-bank/donors');
      setDonors(response.data);
    } catch (error) {
      console.error('Error fetching donors:', error);
    }
  };

  const handleRegisterDonor = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/blood-bank/donors', {
        name: donorFormData.name,
        age: parseInt(donorFormData.age),
        gender: donorFormData.gender,
        bloodType: donorFormData.bloodType,
        phone: donorFormData.phone,
        email: donorFormData.email,
        address: donorFormData.address
      });

      // Immediately add to local state so user sees it
      const newDonor: Donor = {
        id: response.data.id || Date.now().toString(),
        name: donorFormData.name,
        bloodType: donorFormData.bloodType,
        phone: donorFormData.phone,
        lastDonationDate: new Date().toISOString().split('T')[0],
        totalDonations: 0,
        eligibleForDonation: true
      };
      setDonors([...donors, newDonor]);

      await fetchDonors();
      setIsDonorDialogOpen(false);
      resetDonorForm();
      alert('Donor registered successfully');
    } catch (error) {
      console.error('Error registering donor:', error);
      alert('Failed to register donor');
    } finally {
      setLoading(false);
    }
  };

  // Receive a fresh blood unit into inventory. Expiry is derived from
  // collectionDate + expiryDays so the user picks a sensible component-
  // based default (PRBC=42, platelets=5, FFP=365) but can override.
  const handleAddUnit = async () => {
    if (!unitFormData.bloodType || !unitFormData.component) {
      alert('Blood type and component are required');
      return;
    }
    setLoading(true);
    try {
      const collection = new Date(unitFormData.collectionDate);
      const expiry = new Date(collection.getTime() + Number(unitFormData.expiryDays) * 24 * 3600 * 1000);
      await api.post('/api/blood-bank/inventory', {
        bloodType: unitFormData.bloodType,
        component: unitFormData.component,
        bagNumber: unitFormData.bagNumber || undefined,
        volume: Number(unitFormData.volume) || 350,
        collectionDate: collection.toISOString(),
        expiryDate: expiry.toISOString(),
        location: unitFormData.location || undefined,
      });
      await fetchInventory();
      setIsUnitDialogOpen(false);
      setUnitFormData({
        bloodType: '', component: 'PACKED_RBC', bagNumber: '', volume: '350',
        collectionDate: new Date().toISOString().slice(0, 10),
        expiryDays: '42', location: '',
      });
      alert('Unit added to inventory');
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to add unit');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/blood-bank/requests', {
        patientId: requestFormData.patientId,
        bloodType: requestFormData.bloodType,
        component: requestFormData.component,
        unitsRequested: parseInt(requestFormData.unitsRequested),
        urgency: requestFormData.urgency,
        indication: requestFormData.indication
      });

      // Immediately add to local state so user sees it
      const newRequest: BloodRequest = {
        id: response.data.id || Date.now().toString(),
        patientId: requestFormData.patientId,
        patientName: 'New Patient', // Would come from patient lookup
        patientMRN: 'MRN-TBD',
        bloodType: requestFormData.bloodType,
        component: requestFormData.component,
        unitsRequested: parseInt(requestFormData.unitsRequested),
        urgency: requestFormData.urgency,
        requestedDate: new Date().toISOString(),
        status: 'PENDING',
        requestedBy: 'Current User',
        crossMatched: false
      };
      setRequests([newRequest, ...requests]);

      await fetchRequests();
      setIsRequestDialogOpen(false);
      resetRequestForm();
      alert('Blood request created successfully');
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to create blood request');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueBlood = async (requestId: string) => {
    setLoading(true);
    try {
      await api.post(`/api/blood-bank/requests/${requestId}/issue`);
      await fetchRequests();
      await fetchInventory();
      setIsIssueDialogOpen(false);
      setSelectedRequest(null);
      alert('Blood issued successfully');
    } catch (error) {
      console.error('Error issuing blood:', error);
      alert('Failed to issue blood');
    } finally {
      setLoading(false);
    }
  };

  const handleCrossMatch = async (requestId: string) => {
    setLoading(true);
    try {
      await api.post(`/api/blood-bank/requests/${requestId}/cross-match`);
      await fetchRequests();
      alert('Cross-matching completed successfully');
    } catch (error) {
      console.error('Error performing cross-match:', error);
      alert('Failed to perform cross-match');
    } finally {
      setLoading(false);
    }
  };

  const resetDonorForm = () => {
    setDonorFormData({
      name: '',
      age: '',
      gender: '',
      bloodType: '',
      phone: '',
      email: '',
      address: ''
    });
  };

  const resetRequestForm = () => {
    setRequestFormData({
      patientId: '',
      bloodType: '',
      component: '',
      unitsRequested: '',
      urgency: 'ROUTINE',
      indication: ''
    });
  };

  const openIssueDialog = (request: BloodRequest) => {
    setSelectedRequest(request);
    setIsIssueDialogOpen(true);
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'EMERGENCY':
        return <Badge className="bg-red-600">EMERGENCY</Badge>;
      case 'URGENT':
        return <Badge className="bg-orange-600">URGENT</Badge>;
      case 'ROUTINE':
        return <Badge variant="outline">ROUTINE</Badge>;
      default:
        return <Badge variant="outline">{urgency}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">PENDING</Badge>;
      case 'CROSS_MATCHED':
        return <Badge className="bg-blue-600">CROSS MATCHED</Badge>;
      case 'ISSUED':
        return <Badge className="bg-green-600">ISSUED</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStockStatus = (quantity: number): 'critical' | 'low' | 'normal' => {
    if (quantity === 0) return 'critical';
    if (quantity <= 5) return 'low';
    return 'normal';
  };

  const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const criticalStock = inventory.filter(i => i.quantity === 0).length;
  const lowStock = inventory.filter(i => i.quantity > 0 && i.quantity <= 5).length;
  const pendingRequests = requests.filter(r => r.status === 'PENDING').length;
  const emergencyRequests = requests.filter(r => r.urgency === 'EMERGENCY' && r.status !== 'ISSUED').length;

  const stats = {
    totalUnits,
    criticalStock,
    lowStock,
    pendingRequests,
    emergencyRequests,
    activeDonors: donors.filter(d => d.eligibleForDonation).length
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full max-w-[1500px] mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 ring-1 ring-red-100 flex items-center justify-center">
            <Droplet className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Blood Bank Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Donor management, inventory tracking, and blood request processing</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsDonorDialogOpen(true)} variant="outline" className="gap-1.5 h-10 rounded-xl">
            <UserPlus className="w-4 h-4" />
            Register Donor
          </Button>
          <Button onClick={() => setIsUnitDialogOpen(true)} variant="outline" className="gap-1.5 h-10 rounded-xl">
            <Plus className="w-4 h-4" />
            Add Unit
          </Button>
          <Button onClick={() => setIsRequestDialogOpen(true)} className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Package className="w-4 h-4" />
            New Request
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Total Units</div>
              <div className="w-8 h-8 rounded-lg bg-red-50 ring-1 ring-red-100 flex items-center justify-center">
                <Droplet className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight tabular-nums">{stats.totalUnits}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Critical Stock</div>
              <div className="w-8 h-8 rounded-lg bg-red-50 ring-1 ring-red-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-red-700 mt-2 tracking-tight tabular-nums">{stats.criticalStock}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Low Stock</div>
              <div className="w-8 h-8 rounded-lg bg-orange-50 ring-1 ring-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-orange-700 mt-2 tracking-tight tabular-nums">{stats.lowStock}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Pending</div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-blue-700 mt-2 tracking-tight tabular-nums">{stats.pendingRequests}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Emergency</div>
              <div className="w-8 h-8 rounded-lg bg-red-50 ring-1 ring-red-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-red-700 mt-2 tracking-tight tabular-nums">{stats.emergencyRequests}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Active Donors</div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-emerald-700 mt-2 tracking-tight tabular-nums">{stats.activeDonors}</div>
          </CardContent>
        </Card>
      </div>

      {/* Blood Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>Blood Inventory</CardTitle>
          <CardDescription>Current stock levels by blood type and component</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Blood Type</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Available Units</TableHead>
                <TableHead>Expiring in 7 Days</TableHead>
                <TableHead>Expiring in 3 Days</TableHead>
                <TableHead>Expired</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No inventory data available
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => {
                  const status = getStockStatus(item.quantity);
                  return (
                    <TableRow key={item.id} className={status === 'critical' ? 'bg-red-50' : status === 'low' ? 'bg-orange-50' : ''}>
                      <TableCell className="font-medium">{item.bloodType}</TableCell>
                      <TableCell>{item.component}</TableCell>
                      <TableCell>
                        <span className={status === 'critical' ? 'text-red-600 font-semibold' : status === 'low' ? 'text-orange-600 font-semibold' : ''}>
                          {item.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.expiringIn7Days > 0 ? (
                          <span className="text-orange-600">{item.expiringIn7Days}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.expiringIn3Days > 0 ? (
                          <span className="text-red-600 font-semibold">{item.expiringIn3Days}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.expired > 0 ? (
                          <span className="text-red-600 font-semibold">{item.expired}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {status === 'critical' && <Badge variant="destructive">Out of Stock</Badge>}
                        {status === 'low' && <Badge className="bg-orange-600">Low Stock</Badge>}
                        {status === 'normal' && <Badge variant="default">In Stock</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Donor registry — list of all registered donors with quick
          eligibility view. Use "Register Donor" in the header to add. */}
      <Card>
        <CardHeader>
          <CardTitle>Donor Registry ({donors.length})</CardTitle>
          <CardDescription>Registered donors and their eligibility status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Blood Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Last Donation</TableHead>
                <TableHead>Total Donations</TableHead>
                <TableHead>Eligibility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No donors registered yet. Click "Register Donor" above to add one.
                  </TableCell>
                </TableRow>
              ) : (
                donors.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.bloodType}</Badge>
                    </TableCell>
                    <TableCell>{d.phone || '—'}</TableCell>
                    <TableCell>
                      {d.lastDonationDate
                        ? new Date(d.lastDonationDate).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>{d.totalDonations}</TableCell>
                    <TableCell>
                      {d.eligibleForDonation ? (
                        <Badge className="bg-emerald-600">Eligible</Badge>
                      ) : (
                        <Badge variant="outline">Deferred</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Blood Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Blood Requests</CardTitle>
          <CardDescription>Manage and track blood transfusion requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending ({stats.pendingRequests})</TabsTrigger>
              <TabsTrigger value="emergency">Emergency ({stats.emergencyRequests})</TabsTrigger>
              <TabsTrigger value="all">All Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Blood Type</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Cross Match</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.filter(r => r.status === 'PENDING').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No pending requests
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.filter(r => r.status === 'PENDING').map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.requestedDate}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.patientName}</div>
                            <div className="text-xs mt-0.5">
                              <MrnLink mrn={request.patientMRN} patientId={request.patientId} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{request.bloodType}</Badge></TableCell>
                        <TableCell>{request.component}</TableCell>
                        <TableCell className="font-medium">{request.unitsRequested}</TableCell>
                        <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                        <TableCell>
                          {request.crossMatched ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleCrossMatch(request.id)}>
                              Cross Match
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => openIssueDialog(request)}
                            disabled={!request.crossMatched}
                          >
                            Issue Blood
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="emergency">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Blood Type</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.filter(r => r.urgency === 'EMERGENCY' && r.status !== 'ISSUED').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No emergency requests
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.filter(r => r.urgency === 'EMERGENCY' && r.status !== 'ISSUED').map((request) => (
                      <TableRow key={request.id} className="bg-red-50">
                        <TableCell>{request.requestedDate}</TableCell>
                        <TableCell>{request.patientName}</TableCell>
                        <TableCell><MrnLink mrn={request.patientMRN} patientId={request.patientId} /></TableCell>
                        <TableCell><Badge className="bg-red-600">{request.bloodType}</Badge></TableCell>
                        <TableCell className="font-semibold">{request.unitsRequested}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => openIssueDialog(request)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Issue Immediately
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
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Blood Type</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No blood requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.slice(0, 50).map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.requestedDate}</TableCell>
                        <TableCell>{request.patientName}</TableCell>
                        <TableCell><MrnLink mrn={request.patientMRN} patientId={request.patientId} /></TableCell>
                        <TableCell><Badge variant="outline">{request.bloodType}</Badge></TableCell>
                        <TableCell>{request.component}</TableCell>
                        <TableCell>{request.unitsRequested}</TableCell>
                        <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Donor Registry */}
      <Card>
        <CardHeader>
          <CardTitle>Donor Registry</CardTitle>
          <CardDescription>Registered blood donors database</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Blood Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Last Donation</TableHead>
                <TableHead>Total Donations</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No donors registered
                  </TableCell>
                </TableRow>
              ) : (
                donors.slice(0, 20).map((donor) => (
                  <TableRow key={donor.id}>
                    <TableCell className="font-medium">{donor.name}</TableCell>
                    <TableCell><Badge variant="outline">{donor.bloodType}</Badge></TableCell>
                    <TableCell>{donor.phone}</TableCell>
                    <TableCell>{donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString() : 'Never'}</TableCell>
                    <TableCell>{donor.totalDonations}</TableCell>
                    <TableCell>
                      {donor.eligibleForDonation ? (
                        <Badge className="bg-green-600">Eligible</Badge>
                      ) : (
                        <Badge variant="secondary">Not Eligible</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Register Donor Dialog */}
      <Dialog open={isDonorDialogOpen} onOpenChange={setIsDonorDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Register New Donor</DialogTitle>
            <DialogDescription>Add a new blood donor to the registry</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  placeholder="Donor name"
                  value={donorFormData.name}
                  onChange={(e) => setDonorFormData({ ...donorFormData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Age *</Label>
                <Input
                  type="number"
                  placeholder="Age"
                  value={donorFormData.age}
                  onChange={(e) => setDonorFormData({ ...donorFormData, age: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select
                  value={donorFormData.gender}
                  onValueChange={(value) => setDonorFormData({ ...donorFormData, gender: value })}
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
              <div className="space-y-2">
                <Label>Blood Type *</Label>
                <Select
                  value={donorFormData.bloodType}
                  onValueChange={(value) => setDonorFormData({ ...donorFormData, bloodType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  placeholder="Contact number"
                  value={donorFormData.phone}
                  onChange={(e) => setDonorFormData({ ...donorFormData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={donorFormData.email}
                  onChange={(e) => setDonorFormData({ ...donorFormData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <textarea
                className="w-full min-h-[60px] p-3 border rounded-md"
                placeholder="Full address"
                value={donorFormData.address}
                onChange={(e) => setDonorFormData({ ...donorFormData, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDonorDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleRegisterDonor} disabled={loading}>
              {loading ? 'Registering...' : 'Register Donor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Unit to Inventory Dialog — receive a fresh blood bag.
          Distinct from the donor form (which records the person) and
          from the request form (which is a clinician asking). */}
      <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Unit to Inventory</DialogTitle>
            <DialogDescription>
              Receive a fresh blood bag. Bag number auto-generates if blank;
              expiry derives from collection date + component-typical days
              (PRBC 42, platelets 5, FFP 365 frozen).
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Blood Type *</Label>
              <Select
                value={unitFormData.bloodType}
                onValueChange={(v) => setUnitFormData({ ...unitFormData, bloodType: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Component *</Label>
              <Select
                value={unitFormData.component}
                onValueChange={(v) => {
                  // Adjust default expiry days based on component
                  const defaults: Record<string, string> = {
                    WHOLE_BLOOD: '35',
                    PACKED_RBC: '42',
                    PLATELETS: '5',
                    FFP: '365',
                    CRYOPRECIPITATE: '365',
                  };
                  setUnitFormData({ ...unitFormData, component: v, expiryDays: defaults[v] || '42' });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHOLE_BLOOD">Whole Blood</SelectItem>
                  <SelectItem value="PACKED_RBC">Packed RBC</SelectItem>
                  <SelectItem value="PLATELETS">Platelets</SelectItem>
                  <SelectItem value="FFP">Fresh Frozen Plasma</SelectItem>
                  <SelectItem value="CRYOPRECIPITATE">Cryoprecipitate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bag Number</Label>
              <Input
                placeholder="Auto-generated if blank"
                value={unitFormData.bagNumber}
                onChange={(e) => setUnitFormData({ ...unitFormData, bagNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Volume (mL)</Label>
              <Input
                type="number"
                value={unitFormData.volume}
                onChange={(e) => setUnitFormData({ ...unitFormData, volume: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Collection Date</Label>
              <Input
                type="date"
                value={unitFormData.collectionDate}
                onChange={(e) => setUnitFormData({ ...unitFormData, collectionDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Days until expiry</Label>
              <Input
                type="number"
                value={unitFormData.expiryDays}
                onChange={(e) => setUnitFormData({ ...unitFormData, expiryDays: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Storage location</Label>
              <Input
                placeholder="Fridge / shelf identifier"
                value={unitFormData.location}
                onChange={(e) => setUnitFormData({ ...unitFormData, location: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnitDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAddUnit} disabled={loading}>
              {loading ? 'Saving…' : 'Add to Inventory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Request Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Blood Request</DialogTitle>
            <DialogDescription>Create a blood transfusion request for a patient</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Patient ID *</Label>
              <Input
                placeholder="Enter patient MRN or ID"
                value={requestFormData.patientId}
                onChange={(e) => setRequestFormData({ ...requestFormData, patientId: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Blood Type *</Label>
                <Select
                  value={requestFormData.bloodType}
                  onValueChange={(value) => setRequestFormData({ ...requestFormData, bloodType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Component *</Label>
                <Select
                  value={requestFormData.component}
                  onValueChange={(value) => setRequestFormData({ ...requestFormData, component: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select component" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Whole Blood">Whole Blood</SelectItem>
                    <SelectItem value="Packed RBC">Packed RBC</SelectItem>
                    <SelectItem value="Platelets">Platelets</SelectItem>
                    <SelectItem value="FFP">Fresh Frozen Plasma (FFP)</SelectItem>
                    <SelectItem value="Cryoprecipitate">Cryoprecipitate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Units Requested *</Label>
                <Input
                  type="number"
                  placeholder="Number of units"
                  value={requestFormData.unitsRequested}
                  onChange={(e) => setRequestFormData({ ...requestFormData, unitsRequested: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Urgency *</Label>
                <Select
                  value={requestFormData.urgency}
                  onValueChange={(value) => setRequestFormData({ ...requestFormData, urgency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="ROUTINE">Routine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Clinical Indication *</Label>
              <textarea
                className="w-full min-h-[80px] p-3 border rounded-md"
                placeholder="Reason for transfusion..."
                value={requestFormData.indication}
                onChange={(e) => setRequestFormData({ ...requestFormData, indication: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequest} disabled={loading}>
              {loading ? 'Creating...' : 'Create Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Blood Dialog */}
      <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Blood</DialogTitle>
            <DialogDescription>
              Confirm blood issuance for {selectedRequest?.patientName}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-slate-500">Patient</Label>
                  <div className="font-medium">{selectedRequest.patientName}</div>
                  <div className="text-sm mt-0.5">
                    <MrnLink mrn={selectedRequest.patientMRN} patientId={selectedRequest.patientId} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Blood Type</Label>
                  <div className="font-medium">{selectedRequest.bloodType}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Component</Label>
                  <div className="font-medium">{selectedRequest.component}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Units</Label>
                  <div className="font-medium">{selectedRequest.unitsRequested}</div>
                </div>
              </div>

              {selectedRequest.crossMatched ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700">Cross-matching completed successfully</span>
                </div>
              ) : (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <span className="text-sm text-orange-700">Cross-matching required before issuance</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIssueDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedRequest && handleIssueBlood(selectedRequest.id)}
              disabled={loading || !selectedRequest?.crossMatched}
            >
              {loading ? 'Issuing...' : 'Issue Blood'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
