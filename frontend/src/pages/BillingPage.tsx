import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Receipt, Trash2, Printer, DollarSign, TrendingUp, Clock, Wallet, RefreshCcw } from 'lucide-react';
import api from '../services/api';
import { generateBillPDF } from '../utils/pdfGenerator';
import PdfPreviewDialog, { type PdfDoc } from '../components/PdfPreviewDialog';
import MrnLink from '../components/MrnLink';

interface BillItem {
  id: string;
  category: 'consultation' | 'lab' | 'radiology' | 'procedure' | 'bed' | 'ot' | 'pharmacy' | 'other';
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Bill {
  id: string;
  billNo: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  billType: 'OPD' | 'IPD' | 'Emergency';
  items: BillItem[];
  subtotal: number;
  discount: number;
  discountPercent: number;
  tax: number;
  taxPercent: number;
  total: number;
  paid: number;
  balance: number;
  status: 'Paid' | 'Pending' | 'Partial';
  paymentMode?: string;
  date: string;
  // India GST / IRP (e-invoice) — populated once the operator fills the
  // GST details for the invoice via the inline GST modal. The IRN is
  // assigned by the IRP after we call /generate-irn.
  gstinPatient?: string | null;
  hsnSac?: string | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  placeOfSupply?: string | null;
  irn?: string | null;
  irnGeneratedAt?: string | null;
}

interface Patient {
  id: string;
  name: string;
  mrn: string;
  contact: string;
}

export default function BillingPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const [bills, setBills] = useState<Bill[]>([]);
  // PDF preview state — null means dialog is closed.
  const [pdfPreview, setPdfPreview] = useState<PdfDoc | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);

  const [isNewBillDialogOpen, setIsNewBillDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // India GST / e-invoice (IRN) — surgical extension. The modal is
  // opened from the actions column on each row; saving POSTs to
  // /api/invoices/:id/gst, and IRN generation POSTs to /generate-irn.
  const [gstBill, setGstBill] = useState<Bill | null>(null);
  const [gstForm, setGstForm] = useState({
    gstinPatient: '',
    hsnSac: '',
    cgst: '' as string | number,
    sgst: '' as string | number,
    igst: '' as string | number,
    placeOfSupply: '',
  });
  const [gstSaving, setGstSaving] = useState(false);
  const [irnGenerating, setIrnGenerating] = useState<string | null>(null);

  const [billFormData, setBillFormData] = useState({
    patientId: queryParams.get('patientId') || '',
    patientName: queryParams.get('patientName') || '',
    patientMRN: queryParams.get('patientMRN') || '',
    billType: 'OPD' as const,
    paymentMode: 'cash',
    discountPercent: 0,
    taxPercent: 5
  });

  const [itemFormData, setItemFormData] = useState({
    category: 'consultation' as const,
    description: '',
    quantity: 1,
    unitPrice: 0
  });

  useEffect(() => {
    fetchBills();
    fetchPatients();
  }, []);

  useEffect(() => {
    if (queryParams.get('patientId')) {
      setIsNewBillDialogOpen(true);
    }
  }, [location]);

  const fetchBills = async () => {
    try {
      const response = await api.get('/api/billing');
      setBills(response.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
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

  const handleAddItem = () => {
    if (!itemFormData.description || itemFormData.unitPrice <= 0) {
      alert('Please fill in item details');
      return;
    }

    const newItem: BillItem = {
      id: Date.now().toString(),
      category: itemFormData.category,
      description: itemFormData.description,
      quantity: itemFormData.quantity,
      unitPrice: itemFormData.unitPrice,
      total: itemFormData.quantity * itemFormData.unitPrice
    };

    setBillItems([...billItems, newItem]);
    setItemFormData({
      category: 'consultation',
      description: '',
      quantity: 1,
      unitPrice: 0
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setBillItems(billItems.filter(item => item.id !== itemId));
  };

  const handleCreateBill = async () => {
    if (billItems.length === 0) {
      alert('Please add at least one item to the bill');
      return;
    }

    if (!billFormData.patientId && !billFormData.patientName) {
      alert('Please select a patient or enter patient details');
      return;
    }

    setLoading(true);
    try {
      const subtotal = billItems.reduce((sum, item) => sum + item.total, 0);
      const discount = (subtotal * billFormData.discountPercent) / 100;
      const afterDiscount = subtotal - discount;
      const tax = (afterDiscount * billFormData.taxPercent) / 100;
      const total = afterDiscount + tax;

      const billData = {
        patientId: billFormData.patientId,
        patientName: billFormData.patientName,
        patientMRN: billFormData.patientMRN,
        billType: billFormData.billType,
        items: billItems,
        subtotal,
        discount,
        discountPercent: billFormData.discountPercent,
        tax,
        taxPercent: billFormData.taxPercent,
        total,
        paymentMode: billFormData.paymentMode
      };

      const response = await api.post('/api/billing', billData);

      const newBill: Bill = {
        id: response.data.id || Date.now().toString(),
        billNo: 'BILL-' + Date.now().toString().slice(-6),
        patientId: billFormData.patientId,
        patientName: billFormData.patientName,
        patientMRN: billFormData.patientMRN,
        billType: billFormData.billType,
        items: billItems,
        subtotal,
        discount,
        discountPercent: billFormData.discountPercent,
        tax,
        taxPercent: billFormData.taxPercent,
        total,
        paid: total,
        balance: 0,
        status: 'Paid',
        paymentMode: billFormData.paymentMode,
        date: new Date().toISOString()
      };

      setBills([newBill, ...bills]);
      setBillItems([]);
      setIsNewBillDialogOpen(false);
      setBillFormData({
        patientId: '',
        patientName: '',
        patientMRN: '',
        billType: 'OPD',
        paymentMode: 'cash',
        discountPercent: 0,
        taxPercent: 5
      });

      alert(`Bill created successfully! Invoice: ${newBill.billNo}`);
    } catch (error) {
      console.error('Error creating bill:', error);
      alert('Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = billItems.reduce((sum, item) => sum + item.total, 0);
  const discount = (subtotal * billFormData.discountPercent) / 100;
  const afterDiscount = subtotal - discount;
  const tax = (afterDiscount * billFormData.taxPercent) / 100;
  const grandTotal = afterDiscount + tax;

  function openGst(b: Bill) {
    setGstBill(b);
    setGstForm({
      gstinPatient: b.gstinPatient || '',
      hsnSac: b.hsnSac || '',
      cgst: b.cgst ?? '',
      sgst: b.sgst ?? '',
      igst: b.igst ?? '',
      placeOfSupply: b.placeOfSupply || '',
    });
  }

  async function saveGst() {
    if (!gstBill) return;
    setGstSaving(true);
    try {
      const payload: any = {};
      if (gstForm.gstinPatient) payload.gstinPatient = gstForm.gstinPatient;
      if (gstForm.hsnSac) payload.hsnSac = gstForm.hsnSac;
      if (gstForm.cgst !== '') payload.cgst = Number(gstForm.cgst);
      if (gstForm.sgst !== '') payload.sgst = Number(gstForm.sgst);
      if (gstForm.igst !== '') payload.igst = Number(gstForm.igst);
      if (gstForm.placeOfSupply) payload.placeOfSupply = gstForm.placeOfSupply;
      await api.post(`/api/invoices/${gstBill.id}/gst`, payload);
      // Patch the local row so the GST section reflects immediately.
      setBills(prev => prev.map(b => b.id === gstBill.id ? { ...b, ...payload } : b));
      setGstBill(null);
    } catch (e: any) {
      alert('Save failed: ' + (e?.response?.data?.error || 'Try again'));
    } finally {
      setGstSaving(false);
    }
  }

  async function generateIrn(bill: Bill) {
    setIrnGenerating(bill.id);
    try {
      const r = await api.post(`/api/invoices/${bill.id}/generate-irn`);
      const irn = r.data?.irn || r.data?.invoice?.irn || null;
      const irnGeneratedAt = r.data?.irnGeneratedAt || r.data?.invoice?.irnGeneratedAt || new Date().toISOString();
      setBills(prev => prev.map(b => b.id === bill.id ? { ...b, irn, irnGeneratedAt } : b));
    } catch (e: any) {
      alert('IRN generation failed: ' + (e?.response?.data?.error || 'Try again'));
    } finally {
      setIrnGenerating(null);
    }
  }

  const stats = {
    todayRevenue: bills.filter(b => new Date(b.date).toDateString() === new Date().toDateString())
      .reduce((sum, b) => sum + b.total, 0),
    pending: bills.filter(b => b.status === 'Pending').reduce((sum, b) => sum + b.balance, 0),
    collected: bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + b.paid, 0),
    refunds: 0
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full max-w-[1500px] mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Billing & Payments</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage patient billing and revenue cycle</p>
          </div>
        </div>
        <Dialog open={isNewBillDialogOpen} onOpenChange={setIsNewBillDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 rounded-xl h-10">
              <Plus className="w-4 h-4 mr-2" />
              New Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Bill</DialogTitle>
              <DialogDescription>Generate invoice for OPD/IPD/Emergency services</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="patient" className="w-full">
              <TabsList>
                <TabsTrigger value="patient">Patient Info</TabsTrigger>
                <TabsTrigger value="items">Bill Items</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="patient" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Existing Patient</Label>
                    <Select value={billFormData.patientId} onValueChange={(value) => {
                      const patient = patients.find(p => p.id === value);
                      setBillFormData(prev => ({
                        ...prev,
                        patientId: value,
                        patientName: patient?.name || '',
                        patientMRN: patient?.mrn || ''
                      }));
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map(patient => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name} - {patient.mrn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bill Type *</Label>
                    <Select value={billFormData.billType} onValueChange={(value: any) => setBillFormData(prev => ({ ...prev, billType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPD">OPD</SelectItem>
                        <SelectItem value="IPD">IPD</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium mb-3">Or Enter Walk-in Patient Details</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Patient Name</Label>
                      <Input
                        value={billFormData.patientName}
                        onChange={(e) => setBillFormData(prev => ({ ...prev, patientName: e.target.value }))}
                        placeholder="Enter patient name"
                        disabled={!!billFormData.patientId}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Patient MRN (Optional)</Label>
                      <Input
                        value={billFormData.patientMRN}
                        onChange={(e) => setBillFormData(prev => ({ ...prev, patientMRN: e.target.value }))}
                        placeholder="Enter MRN"
                        disabled={!!billFormData.patientId}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="items" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add Bill Items</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select value={itemFormData.category} onValueChange={(value: any) => setItemFormData(prev => ({ ...prev, category: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consultation">Consultation</SelectItem>
                            <SelectItem value="lab">Lab Test</SelectItem>
                            <SelectItem value="radiology">Radiology</SelectItem>
                            <SelectItem value="procedure">Procedure</SelectItem>
                            <SelectItem value="bed">Bed Charges</SelectItem>
                            <SelectItem value="ot">OT Charges</SelectItem>
                            <SelectItem value="pharmacy">Pharmacy</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Description *</Label>
                        <Input
                          value={itemFormData.description}
                          onChange={(e) => setItemFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="e.g., General Physician Consultation"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={itemFormData.quantity}
                          onChange={(e) => setItemFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit Price (Rs.) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={itemFormData.unitPrice}
                          onChange={(e) => setItemFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddItem} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item to Bill
                    </Button>
                  </CardContent>
                </Card>

                {billItems.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Bill Items ({billItems.length})</CardTitle>
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
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {billItems.map(item => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <Badge variant="outline">{item.category}</Badge>
                              </TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>Rs. {item.unitPrice.toFixed(2)}</TableCell>
                              <TableCell className="font-semibold">Rs. {item.total.toFixed(2)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="summary" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Bill Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span className="font-semibold">Rs. {subtotal.toFixed(2)}</span>
                      </div>

                      <div className="flex gap-4 items-center">
                        <Label className="flex-1">Discount (%):</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="w-24"
                          value={billFormData.discountPercent}
                          onChange={(e) => setBillFormData(prev => ({ ...prev, discountPercent: parseFloat(e.target.value) || 0 }))}
                        />
                        <span className="font-semibold text-red-600 w-32 text-right">- Rs. {discount.toFixed(2)}</span>
                      </div>

                      <div className="flex gap-4 items-center">
                        <Label className="flex-1">Tax (%):</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="w-24"
                          value={billFormData.taxPercent}
                          onChange={(e) => setBillFormData(prev => ({ ...prev, taxPercent: parseFloat(e.target.value) || 0 }))}
                        />
                        <span className="font-semibold text-green-600 w-32 text-right">+ Rs. {tax.toFixed(2)}</span>
                      </div>

                      <div className="border-t pt-2 flex justify-between text-lg font-bold">
                        <span>Grand Total:</span>
                        <span className="text-blue-600">Rs. {grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Mode *</Label>
                      <Select value={billFormData.paymentMode} onValueChange={(value) => setBillFormData(prev => ({ ...prev, paymentMode: value }))}>
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
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewBillDialogOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleCreateBill} disabled={loading || billItems.length === 0}>
                <Receipt className="w-4 h-4 mr-2" />
                {loading ? 'Creating...' : 'Create Bill & Print Invoice'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Today's Revenue</div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-emerald-700 mt-2 tracking-tight tabular-nums">Rs. {stats.todayRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Pending</div>
              <div className="w-8 h-8 rounded-lg bg-orange-50 ring-1 ring-orange-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-orange-700 mt-2 tracking-tight tabular-nums">Rs. {stats.pending.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Collected</div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-blue-700 mt-2 tracking-tight tabular-nums">Rs. {stats.collected.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Refunds</div>
              <div className="w-8 h-8 rounded-lg bg-red-50 ring-1 ring-red-100 flex items-center justify-center">
                <RefreshCcw className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-red-700 mt-2 tracking-tight tabular-nums">Rs. {stats.refunds.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bills</CardTitle>
          <CardDescription>View and manage patient bills</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill No</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    No bills created yet
                  </TableCell>
                </TableRow>
              ) : (
                bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.billNo}</TableCell>
                    <TableCell>
                      {bill.patientName}
                      {bill.patientMRN && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          <MrnLink mrn={bill.patientMRN} patientId={bill.patientId} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{bill.billType}</Badge>
                    </TableCell>
                    <TableCell>Rs. {bill.total.toFixed(2)}</TableCell>
                    <TableCell>Rs. {bill.paid.toFixed(2)}</TableCell>
                    <TableCell className={bill.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                      Rs. {bill.balance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={bill.status === 'Paid' ? 'default' : bill.status === 'Partial' ? 'secondary' : 'destructive'}>
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(bill.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPdfPreview(generateBillPDF({
                            billNumber: bill.billNo,
                            date: new Date(bill.date).toLocaleDateString(),
                            patientName: bill.patientName,
                            patientMRN: bill.patientMRN,
                            items: bill.items.map(item => ({
                              description: item.description,
                              quantity: item.quantity,
                              unitPrice: item.unitPrice,
                              total: item.total
                            })),
                            subtotal: bill.subtotal,
                            discount: bill.discount,
                            tax: bill.tax,
                            total: bill.total,
                            paymentMode: bill.paymentMode,
                            paidAmount: bill.paid,
                            balance: bill.balance
                          }))}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        {bill.balance > 0 && (
                          <Button size="sm">
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        )}
                        {/* India GST / e-invoice section — surgical inline.
                            Shows a compact summary if any field is set, plus
                            an "Add GST" CTA if anything is missing. */}
                        <GstRowSection
                          bill={bill}
                          onAdd={() => openGst(bill)}
                          onGenerateIrn={() => generateIrn(bill)}
                          irnLoading={irnGenerating === bill.id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* In-app PDF preview — shows the bill with explicit Print +
          Download buttons. */}
      <PdfPreviewDialog pdf={pdfPreview} onClose={() => setPdfPreview(null)} />

      {/* India GST / e-invoice (IRN) modal — surgical addition. */}
      <Dialog open={!!gstBill} onOpenChange={(o) => { if (!o) setGstBill(null); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add GST details</DialogTitle>
            <DialogDescription>
              Required for GST-compliant invoices. e-Invoice (IRN) is generated separately once all fields are filled.
            </DialogDescription>
          </DialogHeader>
          {gstBill && (
            <div className="space-y-3 py-2">
              <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-2">
                <div className="font-medium text-slate-800">{gstBill.billNo}</div>
                <div>{gstBill.patientName} · {gstBill.patientMRN}</div>
                <div className="tabular-nums">Total: ₹{gstBill.total.toFixed(2)}</div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Patient GSTIN (optional)</Label>
                <Input value={gstForm.gstinPatient} onChange={(e) => setGstForm({ ...gstForm, gstinPatient: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" className="rounded-lg font-mono" maxLength={15} />
              </div>
              <div>
                <Label className="text-xs text-slate-500">HSN / SAC code</Label>
                <Input value={gstForm.hsnSac} onChange={(e) => setGstForm({ ...gstForm, hsnSac: e.target.value })} placeholder="9993 (healthcare)" className="rounded-lg" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-slate-500">CGST</Label>
                  <Input type="number" value={gstForm.cgst} onChange={(e) => setGstForm({ ...gstForm, cgst: e.target.value })} className="rounded-lg" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">SGST</Label>
                  <Input type="number" value={gstForm.sgst} onChange={(e) => setGstForm({ ...gstForm, sgst: e.target.value })} className="rounded-lg" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">IGST</Label>
                  <Input type="number" value={gstForm.igst} onChange={(e) => setGstForm({ ...gstForm, igst: e.target.value })} className="rounded-lg" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Place of supply</Label>
                <Input value={gstForm.placeOfSupply} onChange={(e) => setGstForm({ ...gstForm, placeOfSupply: e.target.value })} placeholder="State code or name" className="rounded-lg" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGstBill(null)} disabled={gstSaving}>Cancel</Button>
            <Button onClick={saveGst} disabled={gstSaving}>{gstSaving ? 'Saving…' : 'Save GST'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// India GST / IRP details — compact inline section appended to each
// row's actions column. Shows the running CGST+SGST+IGST chip + IRN if
// present, plus buttons to add missing GST details or generate an IRN
// once everything is filled. Surgical addition — no impact on the rest
// of BillingPage.
function GstRowSection({ bill, onAdd, onGenerateIrn, irnLoading }: {
  bill: Bill;
  onAdd: () => void;
  onGenerateIrn: () => void;
  irnLoading: boolean;
}) {
  const hasAnyGst = !!(bill.gstinPatient || bill.hsnSac || bill.cgst || bill.sgst || bill.igst || bill.placeOfSupply);
  const isComplete = !!bill.hsnSac && (
    (bill.cgst != null && bill.sgst != null) || bill.igst != null
  );
  const gstSum = (bill.cgst || 0) + (bill.sgst || 0) + (bill.igst || 0);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {hasAnyGst && (
        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono tabular-nums" title={`HSN ${bill.hsnSac || '—'} · CGST ${bill.cgst ?? '—'} · SGST ${bill.sgst ?? '—'} · IGST ${bill.igst ?? '—'}`}>
          GST ₹{gstSum.toFixed(2)}
        </span>
      )}
      {bill.irn && (
        <span className="text-[10px] text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded font-mono truncate max-w-[100px]" title={bill.irn}>
          IRN {bill.irn.slice(0, 8)}…
        </span>
      )}
      <Button size="sm" variant="ghost" onClick={onAdd} className="h-7 text-[11px] px-2">
        {hasAnyGst ? 'Edit GST' : 'Add GST'}
      </Button>
      {isComplete && !bill.irn && (
        <Button size="sm" variant="outline" onClick={onGenerateIrn} disabled={irnLoading} className="h-7 text-[11px] px-2">
          {irnLoading ? '…' : 'Generate IRN'}
        </Button>
      )}
    </div>
  );
}
