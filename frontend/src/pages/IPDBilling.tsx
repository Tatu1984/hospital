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
import { Receipt, DollarSign, Printer, Calculator, FileText, Bed, Pill, TestTube, Activity } from 'lucide-react';
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
  status: 'Active' | 'Discharged';
  doctorName: string;
  diagnosis: string;
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
}

interface IPDBill {
  id: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
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

  const handleGenerateBill = async (admission: IPDAdmission) => {
    setLoading(true);
    setSelectedAdmission(admission);

    try {
      // Fetch all charges for this admission
      const response = await api.get(`/api/ipd-billing/${admission.id}`);

      // Calculate days of stay
      const admitDate = new Date(admission.admissionDate);
      const dischargeDate = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
      const totalDays = Math.ceil((dischargeDate.getTime() - admitDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

      // Auto-calculate bed charges
      const bedCharges: BillCharge[] = [{
        id: 'bed-1',
        admissionId: admission.id,
        category: 'bed',
        description: `${admission.wardName} - Bed ${admission.bedNumber}`,
        quantity: totalDays,
        unitPrice: 1500, // Rs. 1500 per day (should come from ward master)
        total: totalDays * 1500,
        date: new Date().toISOString()
      }];

      const allCharges = response.data.charges || bedCharges;
      setCharges(allCharges);

      const subtotal = allCharges.reduce((sum: number, charge: BillCharge) => sum + charge.total, 0);
      const discount = (subtotal * discountPercent) / 100;
      const afterDiscount = subtotal - discount;
      const tax = (afterDiscount * taxPercent) / 100;
      const total = afterDiscount + tax;

      const bill: IPDBill = {
        id: Date.now().toString(),
        admissionId: admission.id,
        patientId: admission.patientId,
        patientName: admission.patientName,
        patientMRN: admission.patientMRN,
        admissionDate: admission.admissionDate,
        dischargeDate: admission.dischargeDate || new Date().toISOString(),
        totalDays,
        charges: allCharges,
        subtotal,
        discount,
        discountPercent,
        tax,
        taxPercent,
        total,
        paid: 0,
        balance: total,
        status: 'Pending',
        payments: []
      };

      setBillData(bill);
      setIsBillDialogOpen(true);
    } catch (error) {
      console.error('Error generating bill:', error);
      alert('Failed to generate bill');
    } finally {
      setLoading(false);
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
      const subtotal = updatedCharges.reduce((sum, charge) => sum + charge.total, 0);
      const discount = (subtotal * discountPercent) / 100;
      const afterDiscount = subtotal - discount;
      const tax = (afterDiscount * taxPercent) / 100;
      const total = afterDiscount + tax;

      setBillData({
        ...billData,
        charges: updatedCharges,
        subtotal,
        discount,
        tax,
        total,
        balance: total - billData.paid
      });
    }

    setChargeFormData({
      category: 'other',
      description: '',
      quantity: 1,
      unitPrice: 0
    });
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

    setLoading(true);
    try {
      const payment: Payment = {
        id: Date.now().toString(),
        amount: paymentFormData.amount,
        paymentMode: paymentFormData.paymentMode,
        paymentDate: new Date().toISOString(),
        reference: paymentFormData.reference
      };

      await api.post(`/api/ipd-billing/${billData.admissionId}/pay`, payment);

      const newPaid = billData.paid + paymentFormData.amount;
      const newBalance = billData.total - newPaid;

      const newStatus: 'Pending' | 'Partial' | 'Paid' =
        newBalance === 0 ? 'Paid' : newBalance < billData.total ? 'Partial' : 'Pending';

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
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBill = async () => {
    if (!billData) return;

    setLoading(true);
    try {
      await api.post('/api/ipd-billing', billData);
      alert('IPD Bill saved successfully!');
      setIsBillDialogOpen(false);
      setBillData(null);
      setCharges([]);
      await fetchAdmissions();
    } catch (error) {
      console.error('Error saving bill:', error);
      alert('Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    activeAdmissions: admissions.filter(a => a.status === 'Active').length,
    dischargedToday: admissions.filter(a =>
      a.dischargeDate && new Date(a.dischargeDate).toDateString() === new Date().toDateString()
    ).length,
    pendingBills: 0, // Would come from backend
    totalRevenue: 0 // Would come from backend
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
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Rs. {stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Admissions</CardTitle>
          <CardDescription>Generate bills for inpatients</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Ward/Bed</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Admitted On</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No active admissions
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
                      <TableCell>{new Date(admission.admissionDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{days} day(s)</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={admission.status === 'Active' ? 'default' : 'secondary'}>
                          {admission.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleGenerateBill(admission)}
                          disabled={loading}
                        >
                          <Receipt className="w-4 h-4 mr-1" />
                          Generate Bill
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
            <DialogTitle>IPD Bill - {selectedAdmission?.patientName}</DialogTitle>
            <DialogDescription>
              Admission: {selectedAdmission?.admissionId} | MRN: {selectedAdmission?.patientMRN}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="charges" className="w-full">
            <TabsList>
              <TabsTrigger value="charges">Charges</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="charges" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Charges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
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
                  </div>
                  <Button onClick={handleAddCharge} className="w-full mt-3">
                    Add Charge
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bill Charges</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {charges.map(charge => (
                        <TableRow key={charge.id}>
                          <TableCell>
                            <Badge variant="outline">{charge.category}</Badge>
                          </TableCell>
                          <TableCell>{charge.description}</TableCell>
                          <TableCell>{charge.quantity}</TableCell>
                          <TableCell>Rs. {charge.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="font-semibold">Rs. {charge.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
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
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                    <div>
                      <div className="text-sm text-slate-600">Admission Date</div>
                      <div className="font-semibold">{billData && new Date(billData.admissionDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">Total Days</div>
                      <div className="font-semibold">{billData?.totalDays} day(s)</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">Rs. {billData?.subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex gap-4 items-center">
                      <Label className="flex-1">Discount (%):</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="w-24"
                        value={discountPercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setDiscountPercent(val);
                          if (billData) {
                            const discount = (billData.subtotal * val) / 100;
                            const afterDiscount = billData.subtotal - discount;
                            const tax = (afterDiscount * taxPercent) / 100;
                            setBillData({ ...billData, discount, tax, total: afterDiscount + tax, balance: afterDiscount + tax - billData.paid });
                          }
                        }}
                      />
                      <span className="font-semibold text-red-600 w-32 text-right">- Rs. {billData?.discount.toFixed(2)}</span>
                    </div>

                    <div className="flex gap-4 items-center">
                      <Label className="flex-1">Tax (%):</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="w-24"
                        value={taxPercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setTaxPercent(val);
                          if (billData) {
                            const afterDiscount = billData.subtotal - billData.discount;
                            const tax = (afterDiscount * val) / 100;
                            setBillData({ ...billData, tax, taxPercent: val, total: afterDiscount + tax, balance: afterDiscount + tax - billData.paid });
                          }
                        }}
                      />
                      <span className="font-semibold text-green-600 w-32 text-right">+ Rs. {billData?.tax.toFixed(2)}</span>
                    </div>

                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Grand Total:</span>
                      <span className="text-blue-600">Rs. {billData?.total.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-green-600">
                      <span>Paid:</span>
                      <span className="font-semibold">Rs. {billData?.paid.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-orange-600 text-xl font-bold">
                      <span>Balance Due:</span>
                      <span>Rs. {billData?.balance.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => setIsPaymentDialogOpen(true)}
                    disabled={!billData || billData.balance <= 0}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
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
                            No payments recorded
                          </TableCell>
                        </TableRow>
                      ) : (
                        billData.payments.map(payment => (
                          <TableRow key={payment.id}>
                            <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                            <TableCell className="font-semibold text-green-600">Rs. {payment.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{payment.paymentMode.toUpperCase()}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{payment.reference}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBillDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print Bill
            </Button>
            <Button onClick={handleSaveBill} disabled={loading}>
              <Receipt className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save & Discharge'}
            </Button>
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
              <div className="flex justify-between text-lg font-bold">
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
            <Button onClick={handleRecordPayment} disabled={loading}>
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
