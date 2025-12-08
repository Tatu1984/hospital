import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Scan, FileImage, CheckCircle, Calendar } from 'lucide-react';
import api from '../services/api';

interface RadiologyOrder {
  id: string;
  orderId: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  orderType: string;
  status: string;
  priority: string;
  orderedAt: string;
  details: any;
  results?: any[];
}

interface RadiologyTest {
  id: string;
  code: string;
  name: string;
  modality: string;
  bodyPart: string;
  price: number;
}

interface Patient {
  id: string;
  mrn: string;
  name: string;
  contact: string;
}

export default function Radiology() {
  const [orders, setOrders] = useState<RadiologyOrder[]>([]);
  const [radiologyTests, setRadiologyTests] = useState<RadiologyTest[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RadiologyOrder | null>(null);
  const [loading, setLoading] = useState(false);

  const [orderFormData, setOrderFormData] = useState({
    patientId: '',
    encounterId: '',
    selectedTests: [] as string[],
    priority: 'routine',
    clinicalIndication: '',
    specialInstructions: ''
  });

  const [reportFormData, setReportFormData] = useState({
    orderId: '',
    findings: '',
    impression: '',
    recommendation: '',
    isCritical: false
  });

  useEffect(() => {
    fetchOrders();
    fetchRadiologyTests();
    fetchPatients();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/radiology-orders');

      const transformedOrders = response.data.map((order: any) => ({
        id: order.id,
        orderId: order.id.substring(0, 8).toUpperCase(),
        patientId: order.patientId,
        patientName: order.patient?.name || '',
        patientMRN: order.patient?.mrn || '',
        orderType: order.orderType,
        status: order.status,
        priority: order.priority,
        orderedAt: new Date(order.orderedAt).toLocaleDateString(),
        details: order.details,
        results: order.results || []
      }));

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching radiology orders:', error);
    }
  };

  const fetchRadiologyTests = async () => {
    try {
      const response = await api.get('/api/radiology-tests');
      setRadiologyTests(response.data);
    } catch (error) {
      console.error('Error fetching radiology tests:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/api/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleOrderSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/api/radiology-orders', {
        patientId: orderFormData.patientId,
        encounterId: orderFormData.encounterId || null,
        tests: orderFormData.selectedTests,
        priority: orderFormData.priority,
        clinicalIndication: orderFormData.clinicalIndication,
        specialInstructions: orderFormData.specialInstructions
      });

      await fetchOrders();
      setIsOrderDialogOpen(false);
      setOrderFormData({
        patientId: '',
        encounterId: '',
        selectedTests: [],
        priority: 'routine',
        clinicalIndication: '',
        specialInstructions: ''
      });
    } catch (error) {
      console.error('Error creating radiology order:', error);
      alert('Failed to create radiology order');
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async () => {
    setLoading(true);
    try {
      const reportData = {
        findings: reportFormData.findings,
        impression: reportFormData.impression,
        recommendation: reportFormData.recommendation
      };

      await api.post('/api/lab-results', {
        orderId: reportFormData.orderId,
        resultData: reportData,
        isCritical: reportFormData.isCritical,
        remarks: reportFormData.impression
      });

      await fetchOrders();
      setIsReportDialogOpen(false);
      setReportFormData({
        orderId: '',
        findings: '',
        impression: '',
        recommendation: '',
        isCritical: false
      });
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error submitting radiology report:', error);
      alert('Failed to submit radiology report');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleStudy = async (orderId: string) => {
    try {
      await api.put(`/api/radiology-orders/${orderId}`, {
        status: 'scheduled'
      });
      await fetchOrders();
    } catch (error) {
      console.error('Error scheduling study:', error);
      alert('Failed to schedule study');
    }
  };

  const handleCompleteStudy = async (orderId: string) => {
    try {
      await api.put(`/api/radiology-orders/${orderId}`, {
        status: 'imaging-complete'
      });
      await fetchOrders();
    } catch (error) {
      console.error('Error completing study:', error);
      alert('Failed to complete study');
    }
  };

  const openReportDialog = (order: RadiologyOrder) => {
    setSelectedOrder(order);
    setReportFormData({
      orderId: order.id,
      findings: '',
      impression: '',
      recommendation: '',
      isCritical: false
    });
    setIsReportDialogOpen(true);
  };

  const handleTestSelection = (testId: string) => {
    const isSelected = orderFormData.selectedTests.includes(testId);
    if (isSelected) {
      setOrderFormData(prev => ({
        ...prev,
        selectedTests: prev.selectedTests.filter(id => id !== testId)
      }));
    } else {
      setOrderFormData(prev => ({
        ...prev,
        selectedTests: [...prev.selectedTests, testId]
      }));
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      'pending': 'secondary',
      'scheduled': 'default',
      'imaging-complete': 'default',
      'completed': 'default'
    };
    return colors[status] || 'secondary';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, any> = {
      'routine': 'secondary',
      'urgent': 'default',
      'stat': 'destructive'
    };
    return colors[priority] || 'secondary';
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    scheduled: orders.filter(o => o.status === 'scheduled').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

  const groupedByModality = radiologyTests.reduce((acc, test) => {
    if (!acc[test.modality]) {
      acc[test.modality] = [];
    }
    acc[test.modality].push(test);
    return acc;
  }, {} as Record<string, RadiologyTest[]>);

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Radiology Information System</h1>
          <p className="text-slate-600">Medical imaging, PACS integration, and radiology workflow</p>
        </div>
        <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Order Imaging Study
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Imaging Study</DialogTitle>
              <DialogDescription>Select patient and imaging studies to order</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="patient">Patient *</Label>
                <Select value={orderFormData.patientId} onValueChange={(value) => setOrderFormData(prev => ({ ...prev, patientId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} - {patient.mrn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={orderFormData.priority} onValueChange={(value) => setOrderFormData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Imaging Studies *</Label>
                <div className="border rounded-md p-4 max-h-96 overflow-y-auto space-y-4">
                  {Object.entries(groupedByModality).map(([modality, tests]) => (
                    <div key={modality} className="space-y-2">
                      <h4 className="font-semibold text-sm text-slate-700 uppercase">{modality}</h4>
                      <div className="space-y-2 ml-2">
                        {tests.map((test) => (
                          <div key={test.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`test-${test.id}`}
                              checked={orderFormData.selectedTests.includes(test.id)}
                              onChange={() => handleTestSelection(test.id)}
                              className="w-4 h-4"
                            />
                            <label htmlFor={`test-${test.id}`} className="flex-1 cursor-pointer">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-medium">{test.name}</span>
                                  <span className="text-sm text-slate-500 ml-2">({test.bodyPart})</span>
                                </div>
                                <span className="text-sm text-slate-600">Rs. {test.price}</span>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicalIndication">Clinical Indication *</Label>
                <Input
                  id="clinicalIndication"
                  value={orderFormData.clinicalIndication}
                  onChange={(e) => setOrderFormData(prev => ({ ...prev, clinicalIndication: e.target.value }))}
                  placeholder="Reason for imaging, suspected diagnosis..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Input
                  id="specialInstructions"
                  value={orderFormData.specialInstructions}
                  onChange={(e) => setOrderFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                  placeholder="Contrast requirements, positioning notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleOrderSubmit} disabled={loading || orderFormData.selectedTests.length === 0}>
                {loading ? 'Creating...' : 'Create Imaging Order'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Studies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Imaging Studies Management</CardTitle>
          <CardDescription>Track and manage radiology orders and reports</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Studies</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Studies</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ordered Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No radiology orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderId}</TableCell>
                        <TableCell>{order.patientName}</TableCell>
                        <TableCell>{order.patientMRN}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {order.details?.tests?.length || 0} study(ies)
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(order.priority)}>
                            {order.priority.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.orderedAt}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {order.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleScheduleStudy(order.id)}
                              >
                                <Calendar className="w-4 h-4 mr-1" />
                                Schedule
                              </Button>
                            )}
                            {order.status === 'scheduled' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCompleteStudy(order.id)}
                              >
                                <FileImage className="w-4 h-4 mr-1" />
                                Complete Imaging
                              </Button>
                            )}
                            {order.status === 'imaging-complete' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openReportDialog(order)}
                              >
                                <Scan className="w-4 h-4 mr-1" />
                                Enter Report
                              </Button>
                            )}
                            {order.status === 'completed' && order.results && order.results.length > 0 && (
                              <Button variant="outline" size="sm">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                View Report
                              </Button>
                            )}
                          </div>
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
                    <TableHead>Order ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Studies</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.filter(o => o.status === 'pending').map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderId}</TableCell>
                      <TableCell>{order.patientName}</TableCell>
                      <TableCell>{order.details?.tests?.length || 0} study(ies)</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(order.priority)}>
                          {order.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleScheduleStudy(order.id)}
                        >
                          <Calendar className="w-4 h-4 mr-1" />
                          Schedule Study
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="scheduled">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Studies</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.filter(o => o.status === 'scheduled').map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderId}</TableCell>
                      <TableCell>{order.patientName}</TableCell>
                      <TableCell>{order.details?.tests?.length || 0} study(ies)</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCompleteStudy(order.id)}
                        >
                          <FileImage className="w-4 h-4 mr-1" />
                          Complete Imaging
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="completed">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Studies</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.filter(o => o.status === 'completed').map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderId}</TableCell>
                      <TableCell>{order.patientName}</TableCell>
                      <TableCell>{order.details?.tests?.length || 0} study(ies)</TableCell>
                      <TableCell>{order.orderedAt}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          View Report
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Report Entry Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Radiology Report</DialogTitle>
            <DialogDescription>
              Order: {selectedOrder?.orderId} - Patient: {selectedOrder?.patientName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="findings">Findings *</Label>
              <textarea
                id="findings"
                className="w-full min-h-[150px] p-3 border rounded-md"
                value={reportFormData.findings}
                onChange={(e) => setReportFormData(prev => ({ ...prev, findings: e.target.value }))}
                placeholder="Describe imaging findings in detail..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="impression">Impression *</Label>
              <textarea
                id="impression"
                className="w-full min-h-[100px] p-3 border rounded-md"
                value={reportFormData.impression}
                onChange={(e) => setReportFormData(prev => ({ ...prev, impression: e.target.value }))}
                placeholder="Summary and diagnostic impression..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recommendation">Recommendations</Label>
              <textarea
                id="recommendation"
                className="w-full min-h-[80px] p-3 border rounded-md"
                value={reportFormData.recommendation}
                onChange={(e) => setReportFormData(prev => ({ ...prev, recommendation: e.target.value }))}
                placeholder="Follow-up recommendations, additional studies needed..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCritical"
                checked={reportFormData.isCritical}
                onChange={(e) => setReportFormData(prev => ({ ...prev, isCritical: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="isCritical" className="cursor-pointer">
                Mark as Critical Finding (Requires immediate attention)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleReportSubmit} disabled={loading || !reportFormData.findings || !reportFormData.impression}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
