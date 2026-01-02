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
  Wrench, Search, Plus, AlertTriangle, Clock, CheckCircle,
  Calendar, User, FileText, RefreshCw, Settings, XCircle
} from 'lucide-react';

interface MaintenanceRequest {
  id: string;
  ticketNumber: string;
  equipmentId: string;
  equipmentName: string;
  equipmentCode: string;
  department: string;
  location: string;
  requestType: 'BREAKDOWN' | 'PREVENTIVE' | 'CALIBRATION' | 'INSTALLATION' | 'UPGRADE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_PARTS' | 'COMPLETED' | 'CLOSED';
  description: string;
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  assignedAt?: string;
  completedAt?: string;
  resolution?: string;
  partsUsed?: { name: string; quantity: number; cost: number }[];
  laborHours?: number;
  totalCost?: number;
  downtime?: number; // in hours
}

interface PreventiveMaintenance {
  id: string;
  equipmentId: string;
  equipmentName: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  lastPerformed: string;
  nextDue: string;
  checklist: { item: string; required: boolean }[];
  assignedTo?: string;
  status: 'SCHEDULED' | 'OVERDUE' | 'COMPLETED';
}

interface AMCContract {
  id: string;
  vendor: string;
  equipmentIds: string[];
  contractNumber: string;
  startDate: string;
  endDate: string;
  value: number;
  visitFrequency: string;
  contactPerson: string;
  contactPhone: string;
  status: 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON';
}

export default function EquipmentMaintenance() {
  const { success: showToast } = useToast();
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [pmSchedules, setPmSchedules] = useState<PreventiveMaintenance[]>([]);
  const [amcContracts, setAmcContracts] = useState<AMCContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [showWorkOrderDialog, setShowWorkOrderDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    equipmentName: '',
    equipmentCode: '',
    department: '',
    location: '',
    requestType: 'BREAKDOWN' as MaintenanceRequest['requestType'],
    priority: 'MEDIUM' as MaintenanceRequest['priority'],
    description: '',
  });

  // Work order form
  const [workOrderData, setWorkOrderData] = useState({
    resolution: '',
    laborHours: 0,
    partsUsed: [] as { name: string; quantity: number; cost: number }[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Mock requests
      setRequests([
        {
          id: '1',
          ticketNumber: 'WO-2024-001234',
          equipmentId: 'eq1',
          equipmentName: 'Philips MX800 Patient Monitor',
          equipmentCode: 'AST-MED-001',
          department: 'ICU',
          location: 'ICU Room 5',
          requestType: 'BREAKDOWN',
          priority: 'CRITICAL',
          status: 'IN_PROGRESS',
          description: 'Display showing intermittent flickering. ECG waveform not stable.',
          reportedBy: 'Nurse Anita',
          reportedAt: new Date(Date.now() - 3600000).toISOString(),
          assignedTo: 'Biomedical Tech - Ravi',
          assignedAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: '2',
          ticketNumber: 'WO-2024-001235',
          equipmentId: 'eq2',
          equipmentName: 'GE Logiq E10 Ultrasound',
          equipmentCode: 'AST-MED-002',
          department: 'Radiology',
          location: 'Ultrasound Room 2',
          requestType: 'CALIBRATION',
          priority: 'MEDIUM',
          status: 'PENDING_PARTS',
          description: 'Annual calibration due. Probe showing slight degradation.',
          reportedBy: 'Dr. Sharma',
          reportedAt: new Date(Date.now() - 86400000).toISOString(),
          assignedTo: 'Vendor - GE Service',
        },
        {
          id: '3',
          ticketNumber: 'WO-2024-001233',
          equipmentId: 'eq3',
          equipmentName: 'Siemens CT Scanner',
          equipmentCode: 'AST-MED-010',
          department: 'Radiology',
          location: 'CT Room',
          requestType: 'PREVENTIVE',
          priority: 'LOW',
          status: 'COMPLETED',
          description: 'Monthly preventive maintenance completed.',
          reportedBy: 'System',
          reportedAt: new Date(Date.now() - 172800000).toISOString(),
          completedAt: new Date(Date.now() - 86400000).toISOString(),
          resolution: 'All checks passed. Filters cleaned. Calibration verified.',
          laborHours: 4,
          totalCost: 15000,
        },
      ]);

      // Mock PM schedules
      setPmSchedules([
        {
          id: 'pm1',
          equipmentId: 'eq1',
          equipmentName: 'Philips MX800 Patient Monitor',
          frequency: 'MONTHLY',
          lastPerformed: new Date(Date.now() - 2592000000).toISOString(),
          nextDue: new Date(Date.now() + 172800000).toISOString(),
          checklist: [
            { item: 'Check all cables and connections', required: true },
            { item: 'Clean screen and sensors', required: true },
            { item: 'Verify alarm settings', required: true },
            { item: 'Test battery backup', required: true },
            { item: 'Update software if available', required: false },
          ],
          status: 'SCHEDULED',
        },
        {
          id: 'pm2',
          equipmentId: 'eq4',
          equipmentName: 'Defibrillator AED Plus',
          frequency: 'WEEKLY',
          lastPerformed: new Date(Date.now() - 604800000).toISOString(),
          nextDue: new Date(Date.now() - 86400000).toISOString(),
          checklist: [
            { item: 'Check battery level', required: true },
            { item: 'Verify pads expiry', required: true },
            { item: 'Test self-check function', required: true },
          ],
          status: 'OVERDUE',
        },
      ]);

      // Mock AMC contracts
      setAmcContracts([
        {
          id: 'amc1',
          vendor: 'GE Healthcare India',
          equipmentIds: ['eq2', 'eq5'],
          contractNumber: 'AMC-GE-2024-001',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          value: 250000,
          visitFrequency: '4 visits/year',
          contactPerson: 'Ramesh Kumar',
          contactPhone: '+91 9876543210',
          status: 'ACTIVE',
        },
        {
          id: 'amc2',
          vendor: 'Siemens Healthineers',
          equipmentIds: ['eq3'],
          contractNumber: 'AMC-SI-2024-002',
          startDate: '2024-03-01',
          endDate: '2025-02-28',
          value: 500000,
          visitFrequency: '12 visits/year',
          contactPerson: 'Priya Singh',
          contactPhone: '+91 9876543211',
          status: 'ACTIVE',
        },
      ]);
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    const ticketNumber = `WO-${new Date().getFullYear()}-${String(requests.length + 1).padStart(6, '0')}`;
    const newRequest: MaintenanceRequest = {
      id: String(Date.now()),
      ticketNumber,
      equipmentId: String(Date.now()),
      equipmentName: formData.equipmentName,
      equipmentCode: formData.equipmentCode,
      department: formData.department,
      location: formData.location,
      requestType: formData.requestType,
      priority: formData.priority,
      status: 'OPEN',
      description: formData.description,
      reportedBy: 'Current User',
      reportedAt: new Date().toISOString(),
    };

    setRequests(prev => [newRequest, ...prev]);
    showToast('Work order created successfully', 'success');
    setShowNewRequestDialog(false);
  };

  const handleCompleteWorkOrder = async () => {
    if (!selectedRequest) return;

    setRequests(prev => prev.map(r =>
      r.id === selectedRequest.id
        ? {
            ...r,
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
            resolution: workOrderData.resolution,
            laborHours: workOrderData.laborHours,
            partsUsed: workOrderData.partsUsed,
            totalCost: workOrderData.partsUsed.reduce((sum, p) => sum + p.cost * p.quantity, 0) + workOrderData.laborHours * 500,
          }
        : r
    ));

    showToast('Work order completed', 'success');
    setShowWorkOrderDialog(false);
    setSelectedRequest(null);
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch =
      r.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || r.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    open: requests.filter(r => r.status === 'OPEN').length,
    inProgress: requests.filter(r => r.status === 'IN_PROGRESS').length,
    pendingParts: requests.filter(r => r.status === 'PENDING_PARTS').length,
    overduePM: pmSchedules.filter(pm => pm.status === 'OVERDUE').length,
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[priority]}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-800',
      ASSIGNED: 'bg-purple-100 text-purple-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      PENDING_PARTS: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-slate-100 text-slate-800',
    };
    return <Badge className={colors[status]}>{status.replace('_', ' ')}</Badge>;
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
          <h1 className="text-2xl font-bold text-slate-800">Equipment Maintenance</h1>
          <p className="text-slate-600">Biomedical equipment servicing and maintenance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowNewRequestDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Open Requests</p>
                <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              </div>
              <Wrench className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Parts</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingParts}</p>
              </div>
              <Settings className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card className={stats.overduePM > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Overdue PM</p>
                <p className="text-2xl font-bold text-red-600">{stats.overduePM}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">Work Orders ({requests.length})</TabsTrigger>
          <TabsTrigger value="preventive">Preventive Maintenance ({pmSchedules.length})</TabsTrigger>
          <TabsTrigger value="amc">AMC Contracts ({amcContracts.length})</TabsTrigger>
        </TabsList>

        {/* Work Orders Tab */}
        <TabsContent value="requests" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search work orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="PENDING_PARTS">Pending Parts</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card key={request.id} className={request.priority === 'CRITICAL' ? 'border-red-300' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold">{request.ticketNumber}</span>
                        {getPriorityBadge(request.priority)}
                        {getStatusBadge(request.status)}
                        <Badge variant="outline">{request.requestType}</Badge>
                      </div>
                      <h3 className="font-medium">{request.equipmentName}</h3>
                      <p className="text-sm text-slate-600">{request.description}</p>
                      <div className="flex gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(request.reportedAt).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {request.assignedTo || 'Unassigned'}
                        </span>
                      </div>
                      {request.resolution && (
                        <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                          <strong>Resolution:</strong> {request.resolution}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {request.status === 'IN_PROGRESS' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowWorkOrderDialog(true);
                          }}
                        >
                          Complete
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Preventive Maintenance Tab */}
        <TabsContent value="preventive" className="mt-4">
          <div className="space-y-4">
            {pmSchedules.map((pm) => (
              <Card key={pm.id} className={pm.status === 'OVERDUE' ? 'border-red-300 bg-red-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{pm.equipmentName}</h3>
                        <Badge className={
                          pm.status === 'OVERDUE' ? 'bg-red-500' :
                          pm.status === 'SCHEDULED' ? 'bg-blue-500' :
                          'bg-green-500'
                        }>
                          {pm.status}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-slate-500">
                        <span>Frequency: {pm.frequency}</span>
                        <span>Next Due: {new Date(pm.nextDue).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Checklist:</p>
                        <div className="flex flex-wrap gap-2">
                          {pm.checklist.map((item, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {item.item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button size="sm">
                      {pm.status === 'OVERDUE' ? 'Perform Now' : 'Schedule'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* AMC Contracts Tab */}
        <TabsContent value="amc" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4">Vendor</th>
                    <th className="text-left p-4">Contract</th>
                    <th className="text-left p-4">Period</th>
                    <th className="text-left p-4">Value</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {amcContracts.map((amc) => (
                    <tr key={amc.id} className="border-t">
                      <td className="p-4 font-medium">{amc.vendor}</td>
                      <td className="p-4">
                        <p>{amc.contractNumber}</p>
                        <p className="text-sm text-slate-500">{amc.visitFrequency}</p>
                      </td>
                      <td className="p-4 text-sm">
                        {amc.startDate} to {amc.endDate}
                      </td>
                      <td className="p-4 font-medium">₹{amc.value.toLocaleString()}</td>
                      <td className="p-4">
                        <Badge className={
                          amc.status === 'ACTIVE' ? 'bg-green-500' :
                          amc.status === 'EXPIRING_SOON' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }>
                          {amc.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm">
                        <p>{amc.contactPerson}</p>
                        <p className="text-slate-500">{amc.contactPhone}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Request Dialog */}
      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Maintenance Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Equipment Name *</Label>
              <Input
                value={formData.equipmentName}
                onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                placeholder="e.g., Patient Monitor"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Request Type</Label>
                <Select
                  value={formData.requestType}
                  onValueChange={(v: MaintenanceRequest['requestType']) => setFormData({ ...formData, requestType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BREAKDOWN">Breakdown</SelectItem>
                    <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                    <SelectItem value="CALIBRATION">Calibration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v: MaintenanceRequest['priority']) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the issue..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRequestDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateRequest}>Create Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Work Order Dialog */}
      <Dialog open={showWorkOrderDialog} onOpenChange={setShowWorkOrderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Resolution *</Label>
              <Textarea
                value={workOrderData.resolution}
                onChange={(e) => setWorkOrderData({ ...workOrderData, resolution: e.target.value })}
                placeholder="Describe the work done..."
              />
            </div>
            <div>
              <Label>Labor Hours</Label>
              <Input
                type="number"
                value={workOrderData.laborHours}
                onChange={(e) => setWorkOrderData({ ...workOrderData, laborHours: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorkOrderDialog(false)}>Cancel</Button>
            <Button onClick={handleCompleteWorkOrder}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
