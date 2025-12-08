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
import { Plus, Receipt, CreditCard, Trash2, Calculator, Printer, DollarSign } from 'lucide-react';
import api from '../services/api';

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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);

  const [isNewBillDialogOpen, setIsNewBillDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const stats = {
    todayRevenue: bills.filter(b => new Date(b.date).toDateString() === new Date().toDateString())
      .reduce((sum, b) => sum + b.total, 0),
    pending: bills.filter(b => b.status === 'Pending').reduce((sum, b) => sum + b.balance, 0),
    collected: bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + b.paid, 0),
    refunds: 0
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Billing & Payments</h1>
          <p className="text-slate-600">Manage patient billing and revenue cycle</p>
        </div>
        <Dialog open={isNewBillDialogOpen} onOpenChange={setIsNewBillDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Rs. {stats.todayRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">Rs. {stats.pending.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Rs. {stats.collected.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Rs. {stats.refunds.toFixed(2)}</div>
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
                      {bill.patientMRN && <div className="text-xs text-slate-500">{bill.patientMRN}</div>}
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
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Printer className="w-4 h-4" />
                        </Button>
                        {bill.balance > 0 && (
                          <Button size="sm">
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
