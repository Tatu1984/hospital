import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/Toast';
import {
  Syringe, Search, CheckCircle, XCircle, Clock,
  User, MapPin, Phone, Barcode, Printer, RefreshCw,
  AlertTriangle, Home, Building
} from 'lucide-react';

interface SampleCollection {
  id: string;
  orderId: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  patientPhone: string;
  tests: { id: string; name: string; tubeType: string; tubeColor: string }[];
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  status: 'PENDING' | 'COLLECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
  collectionType: 'WALKIN' | 'IPD' | 'HOME';
  scheduledTime?: string;
  collectedAt?: string;
  collectedBy?: string;
  location?: string;
  ward?: string;
  bedNumber?: string;
  address?: string;
  barcodes: string[];
  rejectionReason?: string;
  notes?: string;
}

interface Phlebotomist {
  id: string;
  name: string;
  status: 'AVAILABLE' | 'BUSY' | 'OFF_DUTY';
  currentLocation?: string;
  collectionsToday: number;
}

const TUBE_TYPES = [
  { type: 'EDTA', color: 'Purple', tests: ['CBC', 'HbA1c', 'Blood Group'] },
  { type: 'SST', color: 'Yellow', tests: ['LFT', 'KFT', 'Lipid Profile', 'Thyroid'] },
  { type: 'Citrate', color: 'Blue', tests: ['PT/INR', 'APTT', 'D-Dimer'] },
  { type: 'Fluoride', color: 'Gray', tests: ['Blood Sugar', 'GTT'] },
  { type: 'Heparin', color: 'Green', tests: ['Electrolytes', 'Blood Gas'] },
  { type: 'Plain', color: 'Red', tests: ['Serology', 'Hormones'] },
];

export default function Phlebotomy() {
  const { success: showToast } = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [collections, setCollections] = useState<SampleCollection[]>([]);
  const [phlebotomists, setPhlebotomists] = useState<Phlebotomist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedCollection, setSelectedCollection] = useState<SampleCollection | null>(null);
  const [showCollectDialog, setShowCollectDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [_showAssignDialog, _setShowAssignDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [collectionNotes, setCollectionNotes] = useState('');

  useEffect(() => {
    fetchCollections();
    fetchPhlebotomists();
  }, []);

  const fetchCollections = async () => {
    try {
      // In production, fetch from API
      // const response = await fetch('/api/phlebotomy/collections');
      // const data = await response.json();

      // Mock data
      const mockCollections: SampleCollection[] = [
        {
          id: '1',
          orderId: 'LAB-001',
          patientId: 'P001',
          patientName: 'Rahul Sharma',
          patientMRN: 'MRN001234',
          patientPhone: '+91 9876543210',
          tests: [
            { id: 't1', name: 'Complete Blood Count', tubeType: 'EDTA', tubeColor: 'Purple' },
            { id: 't2', name: 'Liver Function Test', tubeType: 'SST', tubeColor: 'Yellow' },
          ],
          priority: 'ROUTINE',
          status: 'PENDING',
          collectionType: 'WALKIN',
          scheduledTime: new Date().toISOString(),
          barcodes: [],
        },
        {
          id: '2',
          orderId: 'LAB-002',
          patientId: 'P002',
          patientName: 'Priya Patel',
          patientMRN: 'MRN001235',
          patientPhone: '+91 9876543211',
          tests: [
            { id: 't3', name: 'Blood Sugar Fasting', tubeType: 'Fluoride', tubeColor: 'Gray' },
          ],
          priority: 'URGENT',
          status: 'PENDING',
          collectionType: 'IPD',
          ward: 'General Ward A',
          bedNumber: 'B-12',
          scheduledTime: new Date().toISOString(),
          barcodes: [],
        },
        {
          id: '3',
          orderId: 'LAB-003',
          patientId: 'P003',
          patientName: 'Amit Kumar',
          patientMRN: 'MRN001236',
          patientPhone: '+91 9876543212',
          tests: [
            { id: 't4', name: 'PT/INR', tubeType: 'Citrate', tubeColor: 'Blue' },
            { id: 't5', name: 'CBC', tubeType: 'EDTA', tubeColor: 'Purple' },
          ],
          priority: 'STAT',
          status: 'PENDING',
          collectionType: 'HOME',
          address: '123, MG Road, Bangalore - 560001',
          scheduledTime: new Date(Date.now() + 3600000).toISOString(),
          barcodes: [],
        },
        {
          id: '4',
          orderId: 'LAB-004',
          patientId: 'P004',
          patientName: 'Sneha Reddy',
          patientMRN: 'MRN001237',
          patientPhone: '+91 9876543213',
          tests: [
            { id: 't6', name: 'Thyroid Profile', tubeType: 'SST', tubeColor: 'Yellow' },
          ],
          priority: 'ROUTINE',
          status: 'COLLECTED',
          collectionType: 'WALKIN',
          collectedAt: new Date(Date.now() - 1800000).toISOString(),
          collectedBy: 'Nurse Anita',
          barcodes: ['BAR-2024-001234'],
        },
      ];
      setCollections(mockCollections);
    } catch (error) {
      showToast('Failed to fetch collections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhlebotomists = async () => {
    // Mock data
    setPhlebotomists([
      { id: 'ph1', name: 'Anita Singh', status: 'AVAILABLE', collectionsToday: 15 },
      { id: 'ph2', name: 'Ravi Kumar', status: 'BUSY', currentLocation: 'Ward B', collectionsToday: 12 },
      { id: 'ph3', name: 'Meera Joshi', status: 'AVAILABLE', collectionsToday: 18 },
      { id: 'ph4', name: 'Suresh Patel', status: 'OFF_DUTY', collectionsToday: 0 },
    ]);
  };

  const generateBarcode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BAR-${timestamp}-${random}`;
  };

  const handleCollectSample = async () => {
    if (!selectedCollection) return;

    try {
      const barcodes = selectedCollection.tests.map(() => generateBarcode());

      setCollections(prev => prev.map(c =>
        c.id === selectedCollection.id
          ? {
              ...c,
              status: 'COLLECTED',
              collectedAt: new Date().toISOString(),
              collectedBy: 'Current User', // Would come from auth context
              barcodes,
              notes: collectionNotes,
            }
          : c
      ));

      showToast('Sample collected successfully', 'success');
      setShowCollectDialog(false);
      setSelectedCollection(null);
      setCollectionNotes('');
    } catch (error) {
      showToast('Failed to collect sample', 'error');
    }
  };

  const handleRejectSample = async () => {
    if (!selectedCollection || !rejectionReason) return;

    try {
      setCollections(prev => prev.map(c =>
        c.id === selectedCollection.id
          ? { ...c, status: 'REJECTED', rejectionReason }
          : c
      ));

      showToast('Sample rejected', 'warning');
      setShowRejectDialog(false);
      setSelectedCollection(null);
      setRejectionReason('');
    } catch (error) {
      showToast('Failed to reject sample', 'error');
    }
  };

  const handlePrintBarcode = (collection: SampleCollection) => {
    // In production, this would trigger actual barcode printing
    showToast(`Printing ${collection.barcodes.length} barcode(s)`, 'success');
  };

  const filteredCollections = collections.filter(c => {
    const matchesSearch =
      c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.patientMRN.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'all' || c.priority === filterPriority;
    const matchesType = filterType === 'all' || c.collectionType === filterType;
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'pending' && c.status === 'PENDING') ||
      (activeTab === 'collected' && c.status === 'COLLECTED') ||
      (activeTab === 'rejected' && c.status === 'REJECTED');
    return matchesSearch && matchesPriority && matchesType && matchesTab;
  });

  const stats = {
    pending: collections.filter(c => c.status === 'PENDING').length,
    collected: collections.filter(c => c.status === 'COLLECTED').length,
    rejected: collections.filter(c => c.status === 'REJECTED').length,
    stat: collections.filter(c => c.priority === 'STAT' && c.status === 'PENDING').length,
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      ROUTINE: 'bg-green-100 text-green-800',
      URGENT: 'bg-orange-100 text-orange-800',
      STAT: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[priority]}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      COLLECTED: 'bg-green-100 text-green-800',
      IN_TRANSIT: 'bg-blue-100 text-blue-800',
      RECEIVED: 'bg-purple-100 text-purple-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[status]}>{status}</Badge>;
  };

  const getCollectionTypeIcon = (type: string) => {
    switch (type) {
      case 'WALKIN': return <Building className="w-4 h-4" />;
      case 'IPD': return <Building className="w-4 h-4" />;
      case 'HOME': return <Home className="w-4 h-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Phlebotomy</h1>
          <p className="text-slate-600">Blood sample collection and tracking</p>
        </div>
        <Button onClick={fetchCollections}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Collected</p>
                <p className="text-2xl font-bold text-green-600">{stats.collected}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">STAT Priority</p>
                <p className="text-2xl font-bold text-red-600">{stats.stat}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Rejected</p>
                <p className="text-2xl font-bold text-slate-600">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by patient, MRN, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="ROUTINE">Routine</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="STAT">STAT</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="WALKIN">Walk-in</SelectItem>
                <SelectItem value="IPD">IPD</SelectItem>
                <SelectItem value="HOME">Home Collection</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs and Collection List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="collected">Collected ({stats.collected})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="space-y-4">
            {filteredCollections.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Syringe className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No collections found</p>
                </CardContent>
              </Card>
            ) : (
              filteredCollections.map((collection) => (
                <Card key={collection.id} className={collection.priority === 'STAT' ? 'border-red-300 bg-red-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{collection.patientName}</h3>
                          {getPriorityBadge(collection.priority)}
                          {getStatusBadge(collection.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {collection.patientMRN}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {collection.patientPhone}
                          </span>
                          <span className="flex items-center gap-1">
                            {getCollectionTypeIcon(collection.collectionType)}
                            {collection.collectionType}
                            {collection.ward && ` - ${collection.ward} (${collection.bedNumber})`}
                          </span>
                        </div>
                        {collection.address && (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <MapPin className="w-4 h-4" />
                            {collection.address}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {collection.tests.map((test) => (
                            <Badge key={test.id} variant="outline" className="text-xs">
                              <span
                                className="w-3 h-3 rounded-full mr-1"
                                style={{
                                  backgroundColor:
                                    test.tubeColor === 'Purple' ? '#9333ea' :
                                    test.tubeColor === 'Yellow' ? '#eab308' :
                                    test.tubeColor === 'Blue' ? '#3b82f6' :
                                    test.tubeColor === 'Gray' ? '#6b7280' :
                                    test.tubeColor === 'Green' ? '#22c55e' :
                                    test.tubeColor === 'Red' ? '#ef4444' : '#000',
                                }}
                              />
                              {test.name} ({test.tubeType})
                            </Badge>
                          ))}
                        </div>
                        {collection.barcodes.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <Barcode className="w-4 h-4 text-slate-400" />
                            {collection.barcodes.map((bc, i) => (
                              <code key={i} className="text-xs bg-slate-100 px-2 py-1 rounded">{bc}</code>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {collection.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedCollection(collection);
                                setShowCollectDialog(true);
                              }}
                            >
                              <Syringe className="w-4 h-4 mr-1" />
                              Collect
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCollection(collection);
                                setShowRejectDialog(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {collection.status === 'COLLECTED' && collection.barcodes.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintBarcode(collection)}
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            Print Labels
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Phlebotomist Status */}
      <Card>
        <CardHeader>
          <CardTitle>Phlebotomist Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {phlebotomists.map((ph) => (
              <div key={ph.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{ph.name}</span>
                  <Badge className={
                    ph.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                    ph.status === 'BUSY' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-slate-100 text-slate-800'
                  }>
                    {ph.status}
                  </Badge>
                </div>
                <div className="text-sm text-slate-600">
                  <p>Collections today: {ph.collectionsToday}</p>
                  {ph.currentLocation && <p>Location: {ph.currentLocation}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tube Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Tube Type Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {TUBE_TYPES.map((tube) => (
              <div key={tube.type} className="p-3 border rounded-lg text-center">
                <div
                  className="w-8 h-8 rounded-full mx-auto mb-2"
                  style={{
                    backgroundColor:
                      tube.color === 'Purple' ? '#9333ea' :
                      tube.color === 'Yellow' ? '#eab308' :
                      tube.color === 'Blue' ? '#3b82f6' :
                      tube.color === 'Gray' ? '#6b7280' :
                      tube.color === 'Green' ? '#22c55e' :
                      tube.color === 'Red' ? '#ef4444' : '#000',
                  }}
                />
                <p className="font-medium">{tube.type}</p>
                <p className="text-xs text-slate-500">{tube.color}</p>
                <p className="text-xs text-slate-400 mt-1">{tube.tests.join(', ')}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Collect Sample Dialog */}
      <Dialog open={showCollectDialog} onOpenChange={setShowCollectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect Sample</DialogTitle>
          </DialogHeader>
          {selectedCollection && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedCollection.patientName}</p>
                <p className="text-sm text-slate-600">{selectedCollection.patientMRN}</p>
              </div>
              <div>
                <Label>Tests to Collect</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCollection.tests.map((test) => (
                    <Badge key={test.id} variant="outline">
                      {test.name} - {test.tubeColor} tube
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Collection Notes</Label>
                <Textarea
                  placeholder="Any observations during collection..."
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCollectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCollectSample}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Sample Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Sample Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason *</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient_not_available">Patient not available</SelectItem>
                  <SelectItem value="patient_refused">Patient refused</SelectItem>
                  <SelectItem value="difficult_vein">Difficult venipuncture</SelectItem>
                  <SelectItem value="fasting_not_maintained">Fasting not maintained</SelectItem>
                  <SelectItem value="wrong_patient_info">Wrong patient information</SelectItem>
                  <SelectItem value="order_cancelled">Order cancelled</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectSample} disabled={!rejectionReason}>
              <XCircle className="w-4 h-4 mr-2" />
              Reject Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
