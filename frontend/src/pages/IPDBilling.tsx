import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, DollarSign, Printer, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';

interface IPDAdmission {
  id: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  wardName: string;
  bedNumber: string;
  admissionDate: string;
  dischargeDate?: string;
  status: string;
  doctorName: string;
  diagnosis: string;
  hasInvoice?: boolean;
  invoiceId?: string;
  invoiceStatus?: string;
}

interface BillCharge {
  id: string;
  admissionId: string;
  category: 'bed' | 'consultation' | 'procedure' | 'lab' | 'radiology' | 'pharmacy' | 'ot' | 'other';
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  orderId?: string;
}

interface IPDBill {
  id: string;
  admissionId: string;
  encounterId?: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  doctorName: string;
  diagnosis: string;
  wardName: string;
  bedNumber: string;
  admissionDate: string;
  dischargeDate: string;
  totalDays: number;
  charges: BillCharge[];
  subtotal: number;
  discount: number;
  discountPercent: number;
  tax: number;
  taxPercent: number;
  total: number;
  paid: number;
  balance: number;
  status: 'Pending' | 'Partial' | 'Paid';
  payments: Payment[];
  invoiceId?: string;
  isSaved: boolean;
}

interface Payment {
  id: string;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  reference?: string;
}

export default function IPDBilling() {
  const [admissions, setAdmissions] = useState<IPDAdmission[]>([]);
  const [selectedAdmission, setSelectedAdmission] = useState<IPDAdmission | null>(null);
  const [charges, setCharges] = useState<BillCharge[]>([]);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingBill, setFetchingBill] = useState(false);

  const [billData, setBillData] = useState<IPDBill | null>(null);

  const [chargeFormData, setChargeFormData] = useState({
    category: 'other' as const,
    description: '',
    quantity: 1,
    unitPrice: 0
  });

  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    paymentMode: 'cash',
    reference: ''
  });

  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(5);

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const fetchAdmissions = async () => {
    try {
      const response = await api.get('/api/admissions');
      setAdmissions(response.data);
    } catch (error) {
      console.error('Error fetching admissions:', error);
    }
  };

  const recalculateBill = (updatedCharges: BillCharge[], discPct: number, txPct: number) => {
    const subtotal = updatedCharges.reduce((sum, charge) => sum + charge.total, 0);
    const discount = (subtotal * discPct) / 100;
    const afterDiscount = subtotal - discount;
    const tax = (afterDiscount * txPct) / 100;
    const total = afterDiscount + tax;
    return { subtotal, discount, tax, total };
  };

  const handleGenerateBill = async (admission: IPDAdmission) => {
    setFetchingBill(true);
    setSelectedAdmission(admission);

    try {
      const response = await api.get(`/api/ipd-billing/${admission.id}`);
      const data = response.data;

      const allCharges: BillCharge[] = data.charges || [];
      setCharges(allCharges);

      // Check if there's an existing invoice
      const existingInvoice = data.existingInvoice;
      const hasExistingInvoice = !!existingInvoice;

      // Use existing invoice data if available
      const currentDiscountPercent = hasExistingInvoice ?
        (existingInvoice.discount / existingInvoice.subtotal * 100) || 0 : discountPercent;
      const currentTaxPercent = hasExistingInvoice ?
        (existingInvoice.tax / (existingInvoice.subtotal - existingInvoice.discount) * 100) || taxPercent : taxPercent;

      setDiscountPercent(currentDiscountPercent);
      setTaxPercent(currentTaxPercent);

      const { subtotal, discount, tax, total } = recalculateBill(allCharges, currentDiscountPercent, currentTaxPercent);

      const bill: IPDBill = {
        id: existingInvoice?.id || Date.now().toString(),
        admissionId: admission.id,
        encounterId: data.encounterId,
        patientId: data.patientId,
        patientName: data.patientName,
        patientMRN: data.patientMRN,
        doctorName: data.doctorName || admission.doctorName,
        diagnosis: data.diagnosis || admission.diagnosis,
        wardName: data.wardName || admission.wardName,
        bedNumber: data.bedNumber || admission.bedNumber,
        admissionDate: data.admissionDate,
        dischargeDate: data.dischargeDate || new Date().toISOString(),
        totalDays: data.totalDays,
        charges: allCharges,
        subtotal: hasExistingInvoice ? existingInvoice.subtotal : subtotal,
        discount: hasExistingInvoice ? existingInvoice.discount : discount,
        discountPercent: currentDiscountPercent,
        tax: hasExistingInvoice ? existingInvoice.tax : tax,
        taxPercent: currentTaxPercent,
        total: hasExistingInvoice ? existingInvoice.total : total,
        paid: hasExistingInvoice ? existingInvoice.paid : 0,
        balance: hasExistingInvoice ? existingInvoice.balance : total,
        status: hasExistingInvoice ?
          (existingInvoice.status === 'paid' ? 'Paid' : existingInvoice.status === 'partial' ? 'Partial' : 'Pending')
          : 'Pending',
        payments: existingInvoice?.payments || [],
        invoiceId: existingInvoice?.id,
        isSaved: hasExistingInvoice,
      };

      setBillData(bill);
      setIsBillDialogOpen(true);
    } catch (error) {
      console.error('Error generating bill:', error);
      alert('Failed to generate bill');
    } finally {
      setFetchingBill(false);
    }
  };

  const handleAddCharge = () => {
    if (!selectedAdmission || !chargeFormData.description) {
      alert('Please fill in charge details');
      return;
    }

    const newCharge: BillCharge = {
      id: Date.now().toString(),
      admissionId: selectedAdmission.id,
      category: chargeFormData.category,
      description: chargeFormData.description,
      quantity: chargeFormData.quantity,
      unitPrice: chargeFormData.unitPrice,
      total: chargeFormData.quantity * chargeFormData.unitPrice,
      date: new Date().toISOString()
    };

    const updatedCharges = [...charges, newCharge];
    setCharges(updatedCharges);

    if (billData) {
      const { subtotal, discount, tax, total } = recalculateBill(updatedCharges, discountPercent, taxPercent);

      setBillData({
        ...billData,
        charges: updatedCharges,
        subtotal,
        discount,
        tax,
        total,
        balance: total - billData.paid,
        isSaved: false, // Mark as unsaved after changes
      });
    }

    setChargeFormData({
      category: 'other',
      description: '',
      quantity: 1,
      unitPrice: 0
    });
  };

  const handleRemoveCharge = (chargeId: string) => {
    const updatedCharges = charges.filter(c => c.id !== chargeId);
    setCharges(updatedCharges);

    if (billData) {
      const { subtotal, discount, tax, total } = recalculateBill(updatedCharges, discountPercent, taxPercent);

      setBillData({
        ...billData,
        charges: updatedCharges,
        subtotal,
        discount,
        tax,
        total,
        balance: total - billData.paid,
        isSaved: false,
      });
    }
  };

  const handleDiscountChange = (value: number) => {
    setDiscountPercent(value);
    if (billData) {
      const { subtotal, discount, tax, total } = recalculateBill(charges, value, taxPercent);
      setBillData({
        ...billData,
        discountPercent: value,
        subtotal,
        discount,
        tax,
        total,
        balance: total - billData.paid,
        isSaved: false,
      });
    }
  };

  const handleTaxChange = (value: number) => {
    setTaxPercent(value);
    if (billData) {
      const { subtotal, discount, tax, total } = recalculateBill(charges, discountPercent, value);
      setBillData({
        ...billData,
        taxPercent: value,
        subtotal,
        discount,
        tax,
        total,
        balance: total - billData.paid,
        isSaved: false,
      });
    }
  };

  const handleSaveBill = async (dischargePatient = false) => {
    if (!billData) return;

    setLoading(true);
    try {
      const response = await api.post('/api/ipd-billing', {
        admissionId: billData.admissionId,
        patientId: billData.patientId,
        charges: billData.charges,
        subtotal: billData.subtotal,
        discount: billData.discount,
        discountPercent: billData.discountPercent,
        tax: billData.tax,
        taxPercent: billData.taxPercent,
        total: billData.total,
        dischargePatient,
      });

      setBillData({
        ...billData,
        invoiceId: response.data.id,
        isSaved: true,
      });

      if (dischargePatient) {
        alert('Bill saved and patient discharged successfully!');
        setIsBillDialogOpen(false);
        setBillData(null);
        setCharges([]);
        await fetchAdmissions();
      } else {
        alert('Bill saved successfully!');
      }
    } catch (error) {
      console.error('Error saving bill:', error);
      alert('Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!billData || paymentFormData.amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (paymentFormData.amount > billData.balance) {
      alert('Payment amount cannot exceed balance');
      return;
    }

    // If bill is not saved, save it first
    if (!billData.isSaved) {
      setLoading(true);
      try {
        const saveResponse = await api.post('/api/ipd-billing', {
          admissionId: billData.admissionId,
          patientId: billData.patientId,
          charges: billData.charges,
          subtotal: billData.subtotal,
          discount: billData.discount,
          discountPercent: billData.discountPercent,
          tax: billData.tax,
          taxPercent: billData.taxPercent,
          total: billData.total,
        });

        billData.invoiceId = saveResponse.data.id;
        billData.isSaved = true;
      } catch (error) {
        console.error('Error saving bill before payment:', error);
        alert('Failed to save bill. Please save the bill first.');
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const payment: Payment = {
        id: Date.now().toString(),
        amount: paymentFormData.amount,
        paymentMode: paymentFormData.paymentMode,
        paymentDate: new Date().toISOString(),
        reference: paymentFormData.reference
      };

      await api.post(`/api/ipd-billing/${billData.admissionId}/pay`, {
        invoiceId: billData.invoiceId,
        amount: paymentFormData.amount,
        paymentMode: paymentFormData.paymentMode,
        reference: paymentFormData.reference,
      });

      const newPaid = billData.paid + paymentFormData.amount;
      const newBalance = billData.total - newPaid;

      const newStatus: 'Pending' | 'Partial' | 'Paid' =
        newBalance <= 0 ? 'Paid' : newBalance < billData.total ? 'Partial' : 'Pending';

      setBillData({
        ...billData,
        paid: newPaid,
        balance: newBalance,
        status: newStatus,
        payments: [...billData.payments, payment]
      });

      setIsPaymentDialogOpen(false);
      setPaymentFormData({
        amount: 0,
        paymentMode: 'cash',
        reference: ''
      });

      alert(`Payment of Rs. ${paymentFormData.amount.toFixed(2)} recorded successfully!`);
    } catch (error: any) {
      console.error('Error recording payment:', error);
      alert(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintBill = () => {
    window.print();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      bed: 'bg-blue-100 text-blue-800',
      consultation: 'bg-green-100 text-green-800',
      procedure: 'bg-purple-100 text-purple-800',
      lab: 'bg-yellow-100 text-yellow-800',
      radiology: 'bg-pink-100 text-pink-800',
      pharmacy: 'bg-orange-100 text-orange-800',
      ot: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.other;
  };

  const stats = {
    activeAdmissions: admissions.filter(a => a.status === 'active').length,
    dischargedToday: admissions.filter(a =>
      a.dischargeDate && new Date(a.dischargeDate).toDateString() === new Date().toDateString()
    ).length,
    pendingBills: admissions.filter(a => a.hasInvoice && a.invoiceStatus !== 'paid').length,
    paidBills: admissions.filter(a => a.invoiceStatus === 'paid').length,
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">IPD Billing</h1>
          <p className="text-slate-600">Manage inpatient billing and discharge summaries</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Admissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAdmissions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Discharged Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.dischargedToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingBills}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Paid Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paidBills}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Admissions</CardTitle>
          <CardDescription>Generate and manage bills for inpatients</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Ward/Bed</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Admitted On</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bill Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                    No admissions found
                  </TableCell>
                </TableRow>
              ) : (
                admissions.map(admission => {
                  const days = Math.ceil(
                    (new Date().getTime() - new Date(admission.admissionDate).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <TableRow key={admission.id}>
                      <TableCell className="font-medium">{admission.admissionId}</TableCell>
                      <TableCell>
                        {admission.patientName}
                        <div className="text-xs text-slate-500">{admission.patientMRN}</div>
                      </TableCell>
                      <TableCell>
                        {admission.wardName} - {admission.bedNumber}
                      </TableCell>
                      <TableCell>{admission.doctorName}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={admission.diagnosis}>
                        {admission.diagnosis || '-'}
                      </TableCell>
                      <TableCell>{new Date(admission.admissionDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{days} day(s)</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={admission.status === 'active' ? 'default' : 'secondary'}>
                          {admission.status === 'active' ? 'Active' : 'Discharged'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {admission.hasInvoice ? (
                          <Badge
                            variant="outline"
                            className={
                              admission.invoiceStatus === 'paid'
                                ? 'border-green-500 text-green-600'
                                : admission.invoiceStatus === 'partial'
                                ? 'border-yellow-500 text-yellow-600'
                                : 'border-orange-500 text-orange-600'
                            }
                          >
                            {admission.invoiceStatus === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {admission.invoiceStatus === 'partial' && <Clock className="w-3 h-3 mr-1" />}
                            {admission.invoiceStatus === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {admission.invoiceStatus?.charAt(0).toUpperCase() + admission.invoiceStatus?.slice(1)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-300 text-slate-500">
                            No Bill
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleGenerateBill(admission)}
                          disabled={fetchingBill}
                        >
                          <Receipt className="w-4 h-4 mr-1" />
                          {admission.hasInvoice ? 'View Bill' : 'Generate Bill'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bill Generation Dialog */}
      <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              IPD Bill - {billData?.patientName}
              {billData?.isSaved && (
                <Badge variant="outline" className="border-green-500 text-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" /> Saved
                </Badge>
              )}
              {!billData?.isSaved && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  <AlertCircle className="w-3 h-3 mr-1" /> Unsaved
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>MRN: <strong>{billData?.patientMRN}</strong></span>
                <span>Doctor: <strong>{billData?.doctorName}</strong></span>
                <span>Ward: <strong>{billData?.wardName} - Bed {billData?.bedNumber}</strong></span>
                <span>Diagnosis: <strong>{billData?.diagnosis || 'Not specified'}</strong></span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="charges" className="w-full">
            <TabsList>
              <TabsTrigger value="charges">Charges</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="payments">Payments ({billData?.payments.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="charges" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Manual Charge</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={chargeFormData.category} onValueChange={(value: any) => setChargeFormData(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bed">Bed Charges</SelectItem>
                          <SelectItem value="consultation">Consultation</SelectItem>
                          <SelectItem value="procedure">Procedure</SelectItem>
                          <SelectItem value="lab">Lab Tests</SelectItem>
                          <SelectItem value="radiology">Radiology</SelectItem>
                          <SelectItem value="pharmacy">Pharmacy</SelectItem>
                          <SelectItem value="ot">OT Charges</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={chargeFormData.description}
                        onChange={(e) => setChargeFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={chargeFormData.quantity}
                        onChange={(e) => setChargeFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={chargeFormData.unitPrice}
                        onChange={(e) => setChargeFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>&nbsp;</Label>
                      <Button onClick={handleAddCharge} className="w-full">
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bill Charges ({charges.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {charges.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-slate-500">
                            No charges added yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        charges.map(charge => (
                          <TableRow key={charge.id}>
                            <TableCell>
                              <Badge className={getCategoryColor(charge.category)}>
                                {charge.category}
                              </Badge>
                            </TableCell>
                            <TableCell>{charge.description}</TableCell>
                            <TableCell className="text-right">{charge.quantity}</TableCell>
                            <TableCell className="text-right">Rs. {charge.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">Rs. {charge.total.toFixed(2)}</TableCell>
                            <TableCell>
                              {!charge.orderId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveCharge(charge.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle>Bill Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                    <div>
                      <div className="text-sm text-slate-600">Admission Date</div>
                      <div className="font-semibold">{billData && new Date(billData.admissionDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Discharge Date</div>
                      <div className="font-semibold">{billData?.dischargeDate ? new Date(billData.dischargeDate).toLocaleDateString() : 'Not discharged'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Total Days</div>
                      <div className="font-semibold">{billData?.totalDays} day(s)</div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex justify-between text-lg">
                      <span>Subtotal:</span>
                      <span className="font-semibold">Rs. {billData?.subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex gap-4 items-center">
                      <Label className="w-32">Discount (%):</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="w-24"
                        value={discountPercent}
                        onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                      />
                      <span className="font-semibold text-red-600 flex-1 text-right">- Rs. {billData?.discount.toFixed(2)}</span>
                    </div>

                    <div className="flex gap-4 items-center">
                      <Label className="w-32">Tax (%):</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="w-24"
                        value={taxPercent}
                        onChange={(e) => handleTaxChange(parseFloat(e.target.value) || 0)}
                      />
                      <span className="font-semibold text-green-600 flex-1 text-right">+ Rs. {billData?.tax.toFixed(2)}</span>
                    </div>

                    <div className="border-t pt-3 flex justify-between text-xl font-bold">
                      <span>Grand Total:</span>
                      <span className="text-blue-600">Rs. {billData?.total.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-green-600 text-lg">
                      <span>Amount Paid:</span>
                      <span className="font-semibold">Rs. {billData?.paid.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-orange-600 text-xl font-bold pt-2 border-t">
                      <span>Balance Due:</span>
                      <span>Rs. {billData?.balance.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => handleSaveBill(false)}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Bill'}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setIsPaymentDialogOpen(true)}
                      disabled={!billData || billData.balance <= 0}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Record Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!billData?.payments || billData.payments.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                            No payments recorded yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        billData.payments.map(payment => (
                          <TableRow key={payment.id}>
                            <TableCell>{new Date(payment.paymentDate).toLocaleString()}</TableCell>
                            <TableCell className="font-semibold text-green-600">Rs. {payment.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{payment.paymentMode.toUpperCase()}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{payment.reference || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  {billData && billData.payments.length > 0 && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                      <div className="flex justify-between font-semibold">
                        <span>Total Paid:</span>
                        <span className="text-green-600">Rs. {billData.paid.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold mt-2">
                        <span>Remaining Balance:</span>
                        <span className="text-orange-600">Rs. {billData.balance.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBillDialogOpen(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={handlePrintBill}>
              <Printer className="w-4 h-4 mr-2" />
              Print Bill
            </Button>
            {selectedAdmission?.status === 'active' && (
              <Button
                onClick={() => handleSaveBill(true)}
                disabled={loading}
                variant="default"
              >
                <Receipt className="w-4 h-4 mr-2" />
                {loading ? 'Processing...' : 'Save & Discharge'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record payment for IPD bill</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between">
                <span>Bill Total:</span>
                <span className="font-semibold">Rs. {billData?.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Already Paid:</span>
                <span className="font-semibold text-green-600">Rs. {billData?.paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
                <span>Balance Due:</span>
                <span className="text-orange-600">Rs. {billData?.balance.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Amount *</Label>
              <Input
                type="number"
                min="0"
                max={billData?.balance || 0}
                step="0.01"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
              <div className="flex gap-2 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPaymentFormData(prev => ({ ...prev, amount: billData?.balance || 0 }))}
                >
                  Full Amount
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Mode *</Label>
              <Select value={paymentFormData.paymentMode} onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, paymentMode: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="netbanking">Net Banking</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reference/Transaction ID</Label>
              <Input
                value={paymentFormData.reference}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={loading || paymentFormData.amount <= 0}>
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
