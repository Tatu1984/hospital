import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
// Textarea import removed - not currently used
import { useToast } from '@/components/Toast';
import {
  Cross, Search, Plus, FileText, User,
  Phone, CheckCircle, RefreshCw, AlertTriangle
} from 'lucide-react';

interface DeceasedRecord {
  id: string;
  bodyId: string;
  patientId?: string;
  name: string;
  age: number;
  gender: string;
  dateOfDeath: string;
  timeOfDeath: string;
  causeOfDeath: string;
  attendingDoctor: string;
  ward?: string;
  admissionId?: string;
  caseType: 'NATURAL' | 'MLC' | 'POSTMORTEM' | 'UNKNOWN';
  status: 'RECEIVED' | 'IN_STORAGE' | 'POSTMORTEM_PENDING' | 'POSTMORTEM_DONE' | 'RELEASED' | 'CREMATED';
  storageUnit: string;
  receivedAt: string;
  nextOfKin?: {
    name: string;
    relationship: string;
    phone: string;
    address: string;
  };
  policeInformed?: boolean;
  policeStation?: string;
  mlcNumber?: string;
  postmortemRequired?: boolean;
  postmortemDate?: string;
  deathCertificateIssued?: boolean;
  releasedTo?: string;
  releasedAt?: string;
  notes?: string;
}

interface StorageUnit {
  id: string;
  name: string;
  type: 'REFRIGERATOR' | 'FREEZER';
  capacity: number;
  occupied: number;
  temperature: number;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'FAULT';
}

export default function Mortuary() {
  const { success: showToast } = useToast();
  const [activeTab, setActiveTab] = useState('current');
  const [records, setRecords] = useState<DeceasedRecord[]>([]);
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DeceasedRecord | null>(null);

  const [releaseData, setReleaseData] = useState({
    releasedTo: '',
    relationship: '',
    idProof: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Mock records
      setRecords([
        {
          id: '1',
          bodyId: 'MOR-2024-001234',
          patientId: 'P001',
          name: 'Late Shri Ramesh Kumar',
          age: 72,
          gender: 'Male',
          dateOfDeath: '2024-12-28',
          timeOfDeath: '04:30',
          causeOfDeath: 'Acute Myocardial Infarction',
          attendingDoctor: 'Dr. Amit Sharma',
          ward: 'ICU',
          caseType: 'NATURAL',
          status: 'IN_STORAGE',
          storageUnit: 'REF-001',
          receivedAt: '2024-12-28T05:00:00',
          nextOfKin: {
            name: 'Suresh Kumar',
            relationship: 'Son',
            phone: '+91 9876543210',
            address: '123, Main Road, City',
          },
          deathCertificateIssued: true,
        },
        {
          id: '2',
          bodyId: 'MOR-2024-001235',
          name: 'Unknown Male',
          age: 45,
          gender: 'Male',
          dateOfDeath: '2024-12-27',
          timeOfDeath: '22:15',
          causeOfDeath: 'Road Traffic Accident',
          attendingDoctor: 'Dr. Emergency',
          ward: 'Emergency',
          caseType: 'MLC',
          status: 'POSTMORTEM_PENDING',
          storageUnit: 'REF-002',
          receivedAt: '2024-12-27T22:30:00',
          policeInformed: true,
          policeStation: 'City Police Station',
          mlcNumber: 'MLC-2024-456',
          postmortemRequired: true,
        },
        {
          id: '3',
          bodyId: 'MOR-2024-001233',
          patientId: 'P003',
          name: 'Late Smt. Kamala Devi',
          age: 65,
          gender: 'Female',
          dateOfDeath: '2024-12-26',
          timeOfDeath: '14:00',
          causeOfDeath: 'Chronic Kidney Disease',
          attendingDoctor: 'Dr. Nephrologist',
          ward: 'Nephrology Ward',
          caseType: 'NATURAL',
          status: 'RELEASED',
          storageUnit: 'REF-001',
          receivedAt: '2024-12-26T14:30:00',
          nextOfKin: {
            name: 'Rajesh Kumar',
            relationship: 'Son',
            phone: '+91 9876543211',
            address: '456, Second Street, City',
          },
          deathCertificateIssued: true,
          releasedTo: 'Rajesh Kumar (Son)',
          releasedAt: '2024-12-27T10:00:00',
        },
      ]);

      // Mock storage units
      setStorageUnits([
        { id: 'REF-001', name: 'Refrigerator Unit 1', type: 'REFRIGERATOR', capacity: 4, occupied: 1, temperature: 4, status: 'OPERATIONAL' },
        { id: 'REF-002', name: 'Refrigerator Unit 2', type: 'REFRIGERATOR', capacity: 4, occupied: 1, temperature: 4, status: 'OPERATIONAL' },
        { id: 'FRZ-001', name: 'Freezer Unit 1', type: 'FREEZER', capacity: 2, occupied: 0, temperature: -20, status: 'OPERATIONAL' },
      ]);
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!selectedRecord || !releaseData.releasedTo) return;

    setRecords(prev => prev.map(r =>
      r.id === selectedRecord.id
        ? {
            ...r,
            status: 'RELEASED',
            releasedTo: `${releaseData.releasedTo} (${releaseData.relationship})`,
            releasedAt: new Date().toISOString(),
          }
        : r
    ));

    showToast('Body released successfully', 'success');
    setShowReleaseDialog(false);
    setSelectedRecord(null);
  };

  const handleIssueCertificate = (record: DeceasedRecord) => {
    setRecords(prev => prev.map(r =>
      r.id === record.id ? { ...r, deathCertificateIssued: true } : r
    ));
    showToast('Death certificate issued', 'success');
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.bodyId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const currentBodies = records.filter(r => !['RELEASED', 'CREMATED'].includes(r.status));

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      RECEIVED: 'bg-blue-100 text-blue-800',
      IN_STORAGE: 'bg-purple-100 text-purple-800',
      POSTMORTEM_PENDING: 'bg-yellow-100 text-yellow-800',
      POSTMORTEM_DONE: 'bg-orange-100 text-orange-800',
      RELEASED: 'bg-green-100 text-green-800',
      CREMATED: 'bg-slate-100 text-slate-800',
    };
    return <Badge className={colors[status]}>{status.replace('_', ' ')}</Badge>;
  };

  const getCaseTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      NATURAL: 'bg-green-500 text-white',
      MLC: 'bg-red-500 text-white',
      POSTMORTEM: 'bg-orange-500 text-white',
      UNKNOWN: 'bg-slate-500 text-white',
    };
    return <Badge className={colors[type]}>{type}</Badge>;
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
          <h1 className="text-2xl font-bold text-slate-800">Mortuary Management</h1>
          <p className="text-slate-600">Deceased management and documentation</p>
        </div>
        <Button onClick={() => setShowRegisterDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Register Deceased
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Current Bodies</p>
                <p className="text-2xl font-bold text-blue-600">{currentBodies.length}</p>
              </div>
              <Cross className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Postmortem</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {records.filter(r => r.status === 'POSTMORTEM_PENDING').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Released Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {records.filter(r => r.status === 'RELEASED' && r.releasedAt?.startsWith(new Date().toISOString().split('T')[0])).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">MLC Cases</p>
                <p className="text-2xl font-bold text-red-600">
                  {currentBodies.filter(r => r.caseType === 'MLC').length}
                </p>
              </div>
              <FileText className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Status */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Units Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {storageUnits.map((unit) => (
              <div key={unit.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{unit.name}</h3>
                  <Badge className={
                    unit.status === 'OPERATIONAL' ? 'bg-green-500' :
                    unit.status === 'MAINTENANCE' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }>
                    {unit.status}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Capacity:</span>
                    <span>{unit.occupied}/{unit.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Temperature:</span>
                    <span>{unit.temperature}°C</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(unit.occupied / unit.capacity) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Records */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current">Current ({currentBodies.length})</TabsTrigger>
          <TabsTrigger value="released">Released</TabsTrigger>
          <TabsTrigger value="all">All Records</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search by name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="IN_STORAGE">In Storage</SelectItem>
                    <SelectItem value="POSTMORTEM_PENDING">Postmortem Pending</SelectItem>
                    <SelectItem value="RELEASED">Released</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {filteredRecords
              .filter(r => {
                if (activeTab === 'current') return !['RELEASED', 'CREMATED'].includes(r.status);
                if (activeTab === 'released') return r.status === 'RELEASED';
                return true;
              })
              .map((record) => (
                <Card key={record.id} className={record.caseType === 'MLC' ? 'border-red-300' : ''}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold">{record.bodyId}</span>
                          {getCaseTypeBadge(record.caseType)}
                          {getStatusBadge(record.status)}
                        </div>
                        <h3 className="font-semibold text-lg">{record.name}</h3>
                        <p className="text-sm text-slate-600">
                          {record.age}Y / {record.gender} | Death: {record.dateOfDeath} at {record.timeOfDeath}
                        </p>
                        <p className="text-sm"><strong>Cause:</strong> {record.causeOfDeath}</p>
                        <div className="flex gap-4 text-sm text-slate-500">
                          <span><strong>Attending:</strong> {record.attendingDoctor}</span>
                          {record.ward && <span><strong>Ward:</strong> {record.ward}</span>}
                          <span><strong>Storage:</strong> {record.storageUnit}</span>
                        </div>
                        {record.nextOfKin && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>{record.nextOfKin.name} ({record.nextOfKin.relationship})</span>
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span>{record.nextOfKin.phone}</span>
                          </div>
                        )}
                        {record.caseType === 'MLC' && record.mlcNumber && (
                          <p className="text-sm text-red-600">
                            <strong>MLC:</strong> {record.mlcNumber} | Police: {record.policeStation}
                          </p>
                        )}
                        {record.releasedTo && (
                          <p className="text-sm text-green-600">
                            <strong>Released to:</strong> {record.releasedTo} on {new Date(record.releasedAt!).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {record.status === 'IN_STORAGE' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowReleaseDialog(true);
                            }}
                          >
                            Release Body
                          </Button>
                        )}
                        {!record.deathCertificateIssued && record.caseType === 'NATURAL' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleIssueCertificate(record)}
                          >
                            Issue Certificate
                          </Button>
                        )}
                        {record.deathCertificateIssued && (
                          <Badge className="bg-green-100 text-green-800">Certificate Issued</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Register Deceased Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Deceased</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center text-slate-500">
            <Cross className="w-12 h-12 mx-auto mb-2 text-slate-400" />
            <p>Registration form coming soon.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegisterDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Dialog */}
      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release Body</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedRecord.name}</p>
                <p className="text-sm text-slate-600">{selectedRecord.bodyId}</p>
              </div>
              <div>
                <Label>Releasing To *</Label>
                <Input
                  value={releaseData.releasedTo}
                  onChange={(e) => setReleaseData({ ...releaseData, releasedTo: e.target.value })}
                  placeholder="Name of person collecting"
                />
              </div>
              <div>
                <Label>Relationship *</Label>
                <Input
                  value={releaseData.relationship}
                  onChange={(e) => setReleaseData({ ...releaseData, relationship: e.target.value })}
                  placeholder="e.g., Son, Daughter, Spouse"
                />
              </div>
              <div>
                <Label>ID Proof Number</Label>
                <Input
                  value={releaseData.idProof}
                  onChange={(e) => setReleaseData({ ...releaseData, idProof: e.target.value })}
                  placeholder="Aadhaar/Passport number"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>Cancel</Button>
            <Button onClick={handleRelease}>Confirm Release</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
