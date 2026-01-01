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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Barcode, CheckCircle, FileText, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { generateLabReportPDF } from '../utils/pdfGenerator';

interface LabOrder {
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

interface CriticalAlert {
  id: string;
  testName: string;
  value: string;
  unit: string;
  normalRange: string;
  patientName: string;
  mrn: string;
  alertedAt: string;
  status: string;
}

interface TestResult {
  testName: string;
  value: string;
  unit: string;
  normalRange: string;
  isCritical: boolean;
}

interface LabTest {
  id: string;
  code: string;
  name: string;
  category: string;
  sampleType: string;
  price: number;
}

interface Patient {
  id: string;
  mrn: string;
  name: string;
  contact: string;
}

export default function Laboratory() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [isSubmitResultsDialogOpen, setIsSubmitResultsDialogOpen] = useState(false);
  const [isCriticalAlertDialogOpen, setIsCriticalAlertDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const [orderFormData, setOrderFormData] = useState({
    patientId: '',
    encounterId: '',
    selectedTests: [] as string[],
    priority: 'routine',
    clinicalNotes: ''
  });

  const [resultFormData, setResultFormData] = useState({
    orderId: '',
    resultData: {} as any,
    isCritical: false,
    remarks: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchLabTests();
    fetchPatients();
    fetchCriticalAlerts();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/lab-orders');

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
      console.error('Error fetching lab orders:', error);
    }
  };

  const fetchLabTests = async () => {
    try {
      const response = await api.get('/api/lab-tests');
      setLabTests(response.data);
    } catch (error) {
      console.error('Error fetching lab tests:', error);
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
      await api.post('/api/lab-orders', {
        patientId: orderFormData.patientId,
        encounterId: orderFormData.encounterId || null,
        tests: orderFormData.selectedTests,
        priority: orderFormData.priority,
        clinicalNotes: orderFormData.clinicalNotes
      });

      await fetchOrders();
      setIsOrderDialogOpen(false);
      setOrderFormData({
        patientId: '',
        encounterId: '',
        selectedTests: [],
        priority: 'routine',
        clinicalNotes: ''
      });
    } catch (error) {
      console.error('Error creating lab order:', error);
      alert('Failed to create lab order');
    } finally {
      setLoading(false);
    }
  };

  const handleResultSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/api/lab-results', {
        orderId: resultFormData.orderId,
        resultData: resultFormData.resultData,
        isCritical: resultFormData.isCritical,
        remarks: resultFormData.remarks
      });

      await fetchOrders();
      setIsResultDialogOpen(false);
      setResultFormData({
        orderId: '',
        resultData: {},
        isCritical: false,
        remarks: ''
      });
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error submitting lab results:', error);
      alert('Failed to submit lab results');
    } finally {
      setLoading(false);
    }
  };

  const handleCollectSample = async (orderId: string) => {
    try {
      await api.put(`/api/lab-orders/${orderId}`, {
        status: 'sample-collected'
      });
      await fetchOrders();
    } catch (error) {
      console.error('Error updating sample status:', error);
      alert('Failed to update sample status');
    }
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

  const fetchCriticalAlerts = async () => {
    try {
      const response = await api.get('/api/lab/critical-alerts');
      setCriticalAlerts(response.data);
    } catch (error) {
      console.error('Error fetching critical alerts:', error);
    }
  };

  const openSubmitResultsDialog = (order: LabOrder) => {
    setSelectedOrder(order);
    const testsFromOrder = order.details?.tests || [];
    const initialResults = testsFromOrder.map((testId: string) => {
      const test = labTests.find(t => t.id === testId);
      return {
        testName: test?.name || '',
        value: '',
        unit: '',
        normalRange: '',
        isCritical: false,
      };
    });
    setTestResults(initialResults);
    setIsSubmitResultsDialogOpen(true);
  };

  const handleSubmitResults = async () => {
    if (!selectedOrder) return;

    setLoading(true);
    try {
      const response = await api.post(`/api/lab/orders/${selectedOrder.id}/submit-results`, {
        results: testResults,
        remarks: resultFormData.remarks,
      });

      await fetchOrders();
      await fetchCriticalAlerts();
      setIsSubmitResultsDialogOpen(false);
      setSelectedOrder(null);
      setTestResults([]);

      if (response.data.criticalAlerts > 0) {
        alert(`Results submitted. ${response.data.criticalAlerts} critical value(s) detected and physician notified.`);
        setIsCriticalAlertDialogOpen(true);
      } else {
        alert('Results submitted successfully');
      }
    } catch (error) {
      console.error('Error submitting results:', error);
      alert('Failed to submit results');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.post(`/api/lab/critical-alerts/${alertId}/acknowledge`);
      await fetchCriticalAlerts();
      alert('Critical alert acknowledged');
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      alert('Failed to acknowledge alert');
    }
  };

  const updateTestResult = (index: number, field: keyof TestResult, value: any) => {
    const updated = [...testResults];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'value' || field === 'normalRange') {
      const isOutOfRange = validateAgainstRange(updated[index].value, updated[index].normalRange);
      updated[index].isCritical = isOutOfRange;
    }

    setTestResults(updated);
  };

  const validateAgainstRange = (value: string, normalRange: string): boolean => {
    if (!value || !normalRange) return false;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return false;

    const rangeMatch = normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      return numValue < min || numValue > max;
    }

    return false;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      'pending': 'secondary',
      'sample-collected': 'default',
      'in-process': 'default',
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
    inProcess: orders.filter(o => o.status === 'in-process' || o.status === 'sample-collected').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Laboratory Information System</h1>
          <p className="text-slate-600">Manage lab tests, samples, and reports</p>
        </div>
        <div className="flex gap-2">
          {criticalAlerts.filter(a => a.status === 'unacknowledged').length > 0 && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setIsCriticalAlertDialogOpen(true)}
            >
              <AlertTriangle className="w-4 h-4" />
              {criticalAlerts.filter(a => a.status === 'unacknowledged').length} Critical Alerts
            </Button>
          )}
          <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Order Lab Test
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Laboratory Tests</DialogTitle>
              <DialogDescription>Select patient and tests to order</DialogDescription>
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
                <Label>Select Tests *</Label>
                <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                  {labTests.map((test) => (
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
                            <span className="text-sm text-slate-500 ml-2">({test.category})</span>
                          </div>
                          <span className="text-sm text-slate-600">Rs. {test.price}</span>
                        </div>
                        <div className="text-xs text-slate-500">Sample: {test.sampleType}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicalNotes">Clinical Notes</Label>
                <Input
                  id="clinicalNotes"
                  value={orderFormData.clinicalNotes}
                  onChange={(e) => setOrderFormData(prev => ({ ...prev, clinicalNotes: e.target.value }))}
                  placeholder="Clinical history, suspected diagnosis..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleOrderSubmit} disabled={loading || orderFormData.selectedTests.length === 0}>
                {loading ? 'Creating...' : 'Create Lab Order'}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProcess}</div>
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
          <CardTitle>Lab Tests Management</CardTitle>
          <CardDescription>Track and manage laboratory tests</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Tests</TabsTrigger>
              <TabsTrigger value="pending">Pending Collection</TabsTrigger>
              <TabsTrigger value="inprocess">In Process</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Tests</TableHead>
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
                        No lab orders found
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
                            {order.details?.tests?.length || 0} test(s)
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
                                onClick={() => handleCollectSample(order.id)}
                              >
                                <Barcode className="w-4 h-4 mr-1" />
                                Collect
                              </Button>
                            )}
                            {(order.status === 'sample-collected' || order.status === 'in-process') && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => openSubmitResultsDialog(order)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Submit Results
                              </Button>
                            )}
                            {order.status === 'completed' && order.results && order.results.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateLabReportPDF({
                                  reportNumber: order.orderId,
                                  date: order.orderedAt,
                                  patientName: order.patientName,
                                  patientMRN: order.patientMRN,
                                  tests: order.results?.map((result: any) => ({
                                    testName: result.testName || result.name,
                                    result: result.value?.toString() || result.result || '-',
                                    unit: result.unit || '',
                                    normalRange: result.normalRange || '',
                                    flag: result.flag
                                  })) || []
                                })}
                              >
                                <FileText className="w-4 h-4 mr-1" />
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
                    <TableHead>MRN</TableHead>
                    <TableHead>Tests</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.filter(o => o.status === 'pending').map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderId}</TableCell>
                      <TableCell>{order.patientName}</TableCell>
                      <TableCell>{order.patientMRN}</TableCell>
                      <TableCell>{order.details?.tests?.length || 0} test(s)</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(order.priority)}>
                          {order.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCollectSample(order.id)}
                        >
                          <Barcode className="w-4 h-4 mr-1" />
                          Collect Sample
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="inprocess">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Tests</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.filter(o => o.status === 'sample-collected' || o.status === 'in-process').map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderId}</TableCell>
                      <TableCell>{order.patientName}</TableCell>
                      <TableCell>{order.details?.tests?.length || 0} test(s)</TableCell>
                      <TableCell>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openSubmitResultsDialog(order)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Submit Results
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
                    <TableHead>Tests</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.filter(o => o.status === 'completed').map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderId}</TableCell>
                      <TableCell>{order.patientName}</TableCell>
                      <TableCell>{order.details?.tests?.length || 0} test(s)</TableCell>
                      <TableCell>{order.orderedAt}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateLabReportPDF({
                            reportNumber: order.orderId,
                            date: order.orderedAt,
                            patientName: order.patientName,
                            patientMRN: order.patientMRN,
                            tests: order.results?.map((result: any) => ({
                              testName: result.testName || result.name,
                              result: result.value?.toString() || result.result || '-',
                              unit: result.unit || '',
                              normalRange: result.normalRange || '',
                              flag: result.flag
                            })) || []
                          })}
                        >
                          <FileText className="w-4 h-4 mr-1" />
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

      {/* Result Entry Dialog */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enter Lab Results</DialogTitle>
            <DialogDescription>
              Order: {selectedOrder?.orderId} - Patient: {selectedOrder?.patientName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resultData">Result Data (JSON format)</Label>
              <textarea
                id="resultData"
                className="w-full min-h-[200px] p-3 border rounded-md"
                value={JSON.stringify(resultFormData.resultData, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setResultFormData(prev => ({ ...prev, resultData: parsed }));
                  } catch (err) {
                    // Invalid JSON, update anyway for user to fix
                    setResultFormData(prev => ({ ...prev, resultData: e.target.value as any }));
                  }
                }}
                placeholder='{"hemoglobin": "14.5", "wbc": "7200", ...}'
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCritical"
                checked={resultFormData.isCritical}
                onChange={(e) => setResultFormData(prev => ({ ...prev, isCritical: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="isCritical" className="cursor-pointer">
                Mark as Critical/Abnormal
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                value={resultFormData.remarks}
                onChange={(e) => setResultFormData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Additional notes or observations..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResultDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleResultSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Results'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Results Dialog with Validation */}
      <Dialog open={isSubmitResultsDialogOpen} onOpenChange={setIsSubmitResultsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Lab Results</DialogTitle>
            <DialogDescription>
              Order: {selectedOrder?.orderId} - Patient: {selectedOrder?.patientName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {testResults.map((result, index) => (
              <div key={index} className={`p-4 border rounded-lg ${result.isCritical ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="font-semibold">{result.testName}</Label>
                    {result.isCritical && (
                      <Badge variant="destructive" className="ml-2">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Critical Value
                      </Badge>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`value-${index}`}>Value *</Label>
                    <Input
                      id={`value-${index}`}
                      value={result.value}
                      onChange={(e) => updateTestResult(index, 'value', e.target.value)}
                      placeholder="Enter result value"
                      className={result.isCritical ? 'border-red-500' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`unit-${index}`}>Unit</Label>
                    <Input
                      id={`unit-${index}`}
                      value={result.unit}
                      onChange={(e) => updateTestResult(index, 'unit', e.target.value)}
                      placeholder="mg/dL, g/dL, etc."
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`range-${index}`}>Normal Range</Label>
                    <Input
                      id={`range-${index}`}
                      value={result.normalRange}
                      onChange={(e) => updateTestResult(index, 'normalRange', e.target.value)}
                      placeholder="e.g., 10-20, <10, >100"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`critical-${index}`}
                        checked={result.isCritical}
                        onChange={(e) => updateTestResult(index, 'isCritical', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={`critical-${index}`} className="cursor-pointer">
                        Flag as Critical Value
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="remarks-submit">Remarks</Label>
              <Input
                id="remarks-submit"
                value={resultFormData.remarks}
                onChange={(e) => setResultFormData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Additional observations..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitResultsDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmitResults} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit & Finalize Results'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Critical Alerts Dialog */}
      <Dialog open={isCriticalAlertDialogOpen} onOpenChange={setIsCriticalAlertDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Critical Value Alerts
            </DialogTitle>
            <DialogDescription>
              Critical values requiring immediate attention
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {criticalAlerts.filter(a => a.status === 'unacknowledged').length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No unacknowledged critical alerts
              </div>
            ) : (
              criticalAlerts
                .filter(a => a.status === 'unacknowledged')
                .map((alert) => (
                  <Alert key={alert.id} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="flex items-center justify-between">
                      <span>{alert.testName}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    </AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-1">
                        <div><strong>Patient:</strong> {alert.patientName} (MRN: {alert.mrn})</div>
                        <div className="text-lg font-bold text-red-700">
                          <strong>Value:</strong> {alert.value} {alert.unit}
                        </div>
                        <div><strong>Normal Range:</strong> {alert.normalRange}</div>
                        <div className="text-xs text-slate-600">
                          Alerted: {new Date(alert.alertedAt).toLocaleString()}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCriticalAlertDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
