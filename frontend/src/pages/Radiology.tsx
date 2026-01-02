import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Scan, FileImage, CheckCircle, Calendar, Search, CreditCard, Building2, Wallet, X, AlertCircle } from 'lucide-react';
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
  patientType?: string;
  paymentMode?: string;
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
  gender?: string;
  dateOfBirth?: string;
}

interface TPA {
  id: string;
  name: string;
  code: string;
  discountPercent?: number;
}

export default function Radiology() {
  const [orders, setOrders] = useState<RadiologyOrder[]>([]);
  const [radiologyTests, setRadiologyTests] = useState<RadiologyTest[]>([]);
  const [_patients, setPatients] = useState<Patient[]>([]);
  const [tpas, setTpas] = useState<TPA[]>([]);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RadiologyOrder | null>(null);
  const [loading, setLoading] = useState(false);

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [orderFormData, setOrderFormData] = useState({
    patientId: '',
    encounterId: '',
    selectedTests: [] as string[],
    priority: 'routine',
    clinicalIndication: '',
    specialInstructions: '',
    patientType: 'opd' as 'opd' | 'ipd' | 'icu' | 'emergency' | 'walk-in',
    paymentMode: 'cash' as 'cash' | 'card' | 'upi' | 'tpa' | 'credit',
    tpaId: '',
    preAuthRequired: false,
    preAuthNumber: '',
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
    fetchTPAs();
  }, []);

  // Debounced patient search
  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    try {
      const response = await api.get(`/api/patients?search=${encodeURIComponent(query)}&limit=10`);
      setSearchResults(response.data);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPatients(patientSearch);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [patientSearch, searchPatients]);

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
        results: order.results || [],
        patientType: order.details?.patientType,
        paymentMode: order.details?.paymentMode,
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

  const fetchTPAs = async () => {
    try {
      const response = await api.get('/api/tpas');
      setTpas(response.data);
    } catch (error) {
      console.error('Error fetching TPAs:', error);
    }
  };

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setOrderFormData(prev => ({ ...prev, patientId: patient.id }));
    setPatientSearch(`${patient.name} - ${patient.mrn}`);
    setShowSearchResults(false);
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setOrderFormData(prev => ({ ...prev, patientId: '' }));
    setPatientSearch('');
  };

  const handleOrderSubmit = async () => {
    if (!orderFormData.patientId) {
      alert('Please select a patient');
      return;
    }
    if (orderFormData.selectedTests.length === 0) {
      alert('Please select at least one imaging study');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/radiology-orders', {
        patientId: orderFormData.patientId,
        encounterId: orderFormData.encounterId || undefined,
        tests: orderFormData.selectedTests,
        priority: orderFormData.priority,
        clinicalIndication: orderFormData.clinicalIndication,
        specialInstructions: orderFormData.specialInstructions,
        patientType: orderFormData.patientType,
        paymentMode: orderFormData.paymentMode,
        tpaId: orderFormData.paymentMode === 'tpa' ? orderFormData.tpaId : undefined,
        preAuthRequired: orderFormData.preAuthRequired,
        preAuthNumber: orderFormData.preAuthNumber || undefined,
      });

      await fetchOrders();
      setIsOrderDialogOpen(false);
      resetOrderForm();
    } catch (error: any) {
      console.error('Error creating radiology order:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to create imaging order';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetOrderForm = () => {
    setOrderFormData({
      patientId: '',
      encounterId: '',
      selectedTests: [],
      priority: 'routine',
      clinicalIndication: '',
      specialInstructions: '',
      patientType: 'opd',
      paymentMode: 'cash',
      tpaId: '',
      preAuthRequired: false,
      preAuthNumber: '',
    });
    setSelectedPatient(null);
    setPatientSearch('');
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

  const getPaymentModeLabel = (mode?: string) => {
    const labels: Record<string, string> = {
      'cash': 'Cash',
      'card': 'Card',
      'upi': 'UPI',
      'tpa': 'TPA/Insurance',
      'credit': 'Credit'
    };
    return labels[mode || ''] || mode || '-';
  };

  const getPatientTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      'opd': 'OPD',
      'ipd': 'IPD',
      'icu': 'ICU',
      'emergency': 'Emergency',
      'walk-in': 'Walk-in'
    };
    return labels[type || ''] || type || '-';
  };

  // Calculate order total
  const calculateOrderTotal = () => {
    let total = 0;
    orderFormData.selectedTests.forEach(testId => {
      const test = radiologyTests.find(t => t.id === testId);
      if (test) {
        total += test.price;
      }
    });

    // Apply TPA discount if applicable
    if (orderFormData.paymentMode === 'tpa' && orderFormData.tpaId) {
      const tpa = tpas.find(t => t.id === orderFormData.tpaId);
      if (tpa?.discountPercent) {
        total = total * (1 - tpa.discountPercent / 100);
      }
    }

    return total;
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    scheduled: orders.filter(o => o.status === 'scheduled').length,
    imagingComplete: orders.filter(o => o.status === 'imaging-complete').length,
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
        <Dialog open={isOrderDialogOpen} onOpenChange={(open) => {
          setIsOrderDialogOpen(open);
          if (!open) resetOrderForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Order Imaging Study
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Imaging Study</DialogTitle>
              <DialogDescription>Select patient, imaging studies, and payment details</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Patient Search Section */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Patient Information</Label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by name, MRN, or phone..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="pl-10 pr-10"
                      disabled={!!selectedPatient}
                    />
                    {selectedPatient && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                        onClick={clearPatient}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                      {searchResults.map((patient) => (
                        <div
                          key={patient.id}
                          className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => selectPatient(patient)}
                        >
                          <div className="font-medium">{patient.name}</div>
                          <div className="text-sm text-slate-500">
                            MRN: {patient.mrn} | {patient.contact}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedPatient && (
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-blue-900">{selectedPatient.name}</p>
                        <p className="text-sm text-blue-700">MRN: {selectedPatient.mrn}</p>
                        {selectedPatient.contact && (
                          <p className="text-sm text-blue-700">Contact: {selectedPatient.contact}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-blue-100">Selected</Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Patient Type & Payment Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Patient Type *</Label>
                  <Select
                    value={orderFormData.patientType}
                    onValueChange={(value: any) => setOrderFormData(prev => ({ ...prev, patientType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">
                        <div className="flex items-center gap-2">
                          <span>Walk-in Patient</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="opd">
                        <div className="flex items-center gap-2">
                          <span>OPD Patient</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ipd">
                        <div className="flex items-center gap-2">
                          <span>IPD Patient (Admitted)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="icu">
                        <div className="flex items-center gap-2">
                          <span>ICU Patient</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="emergency">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span>Emergency</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Payment Mode *</Label>
                  <Select
                    value={orderFormData.paymentMode}
                    onValueChange={(value: any) => setOrderFormData(prev => ({
                      ...prev,
                      paymentMode: value,
                      tpaId: value !== 'tpa' ? '' : prev.tpaId
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          <span>Cash</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="card">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span>Card</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="upi">
                        <div className="flex items-center gap-2">
                          <span>UPI</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tpa">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>TPA / Insurance</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="credit">
                        <div className="flex items-center gap-2">
                          <span>Credit (Bill Later)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* TPA Selection - shown when TPA payment is selected */}
              {orderFormData.paymentMode === 'tpa' && (
                <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Building2 className="w-5 h-5" />
                    <Label className="text-base font-semibold">Insurance / TPA Details</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select TPA / Insurance *</Label>
                      <Select
                        value={orderFormData.tpaId}
                        onValueChange={(value) => setOrderFormData(prev => ({ ...prev, tpaId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select TPA/Insurance" />
                        </SelectTrigger>
                        <SelectContent>
                          {tpas.map((tpa) => (
                            <SelectItem key={tpa.id} value={tpa.id}>
                              {tpa.name} {tpa.discountPercent ? `(${tpa.discountPercent}% discount)` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pre-Auth Number</Label>
                      <Input
                        placeholder="Enter pre-authorization number"
                        value={orderFormData.preAuthNumber}
                        onChange={(e) => setOrderFormData(prev => ({ ...prev, preAuthNumber: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="preAuthRequired"
                      checked={orderFormData.preAuthRequired}
                      onChange={(e) => setOrderFormData(prev => ({ ...prev, preAuthRequired: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="preAuthRequired" className="cursor-pointer text-sm">
                      Pre-authorization required before proceeding
                    </Label>
                  </div>
                </div>
              )}

              {/* IPD Billing Notice */}
              {orderFormData.patientType === 'ipd' && (
                <div className="p-3 bg-blue-50 rounded-md border border-blue-200 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>IPD Patient:</strong> Charges will be added to the patient's admission bill and settled at discharge.
                  </div>
                </div>
              )}

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={orderFormData.priority} onValueChange={(value) => setOrderFormData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT (Emergency)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Test Selection */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Select Imaging Studies *</Label>
                <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-4">
                  {Object.entries(groupedByModality).map(([modality, tests]) => (
                    <div key={modality} className="space-y-2">
                      <h4 className="font-semibold text-sm text-slate-700 uppercase bg-slate-100 px-2 py-1 rounded">{modality}</h4>
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
                                <span className="text-sm font-medium text-slate-700">Rs. {test.price.toLocaleString()}</span>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.keys(groupedByModality).length === 0 && (
                    <p className="text-center text-slate-500 py-4">No imaging studies available</p>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              {orderFormData.selectedTests.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <h4 className="font-semibold mb-3">Order Summary</h4>
                  <div className="space-y-2">
                    {orderFormData.selectedTests.map(testId => {
                      const test = radiologyTests.find(t => t.id === testId);
                      return test ? (
                        <div key={testId} className="flex justify-between text-sm">
                          <span>{test.name}</span>
                          <span>Rs. {test.price.toLocaleString()}</span>
                        </div>
                      ) : null;
                    })}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total Amount</span>
                        <span className="text-lg">Rs. {calculateOrderTotal().toLocaleString()}</span>
                      </div>
                      {orderFormData.paymentMode === 'tpa' && orderFormData.tpaId && (
                        <p className="text-xs text-amber-600 mt-1">
                          * TPA discount applied based on contract rates
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Clinical Details */}
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
              <Button
                onClick={handleOrderSubmit}
                disabled={loading || !orderFormData.patientId || orderFormData.selectedTests.length === 0 || (orderFormData.paymentMode === 'tpa' && !orderFormData.tpaId)}
              >
                {loading ? 'Creating...' : `Create Order (Rs. ${calculateOrderTotal().toLocaleString()})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <CardTitle className="text-sm font-medium">Imaging Done</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.imagingComplete}</div>
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
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled ({stats.scheduled})</TabsTrigger>
              <TabsTrigger value="imaging-complete">Awaiting Report ({stats.imagingComplete})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Studies</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-slate-500">
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
                          <Badge variant="outline">{getPatientTypeLabel(order.patientType)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getPaymentModeLabel(order.paymentMode)}</Badge>
                        </TableCell>
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
                    <TableHead>Type</TableHead>
                    <TableHead>Payment</TableHead>
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
                      <TableCell>
                        <Badge variant="outline">{getPatientTypeLabel(order.patientType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getPaymentModeLabel(order.paymentMode)}</Badge>
                      </TableCell>
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
                    <TableHead>Type</TableHead>
                    <TableHead>Studies</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.filter(o => o.status === 'scheduled').map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderId}</TableCell>
                      <TableCell>{order.patientName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getPatientTypeLabel(order.patientType)}</Badge>
                      </TableCell>
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
            <TabsContent value="imaging-complete">
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
                  {orders.filter(o => o.status === 'imaging-complete').map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderId}</TableCell>
                      <TableCell>{order.patientName}</TableCell>
                      <TableCell>{order.details?.tests?.length || 0} study(ies)</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReportDialog(order)}
                        >
                          <Scan className="w-4 h-4 mr-1" />
                          Enter Report
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
