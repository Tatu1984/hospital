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
import { Search, Package, CheckCircle, Barcode, Trash2, ShoppingCart, AlertTriangle, Plus, FileText } from 'lucide-react';
import api from '../services/api';

interface Drug {
  id: string;
  code?: string;
  name: string;
  genericName: string;
  category: string;
  dosageForm?: string;
  form?: string;
  strength: string;
  unitPrice?: number;
  price?: number;
  stockQuantity: number;
  reorderLevel: number;
  isActive: boolean;
}

interface StockItem {
  id: string;
  drugId: string;
  drugName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  mrp: number;
  purchasePrice: number;
}

interface CartItem {
  drugId: string;
  drugName: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Sale {
  id: string;
  invoiceNumber: string;
  patientName?: string;
  patientMRN?: string;
  items: CartItem[];
  total: number;
  paymentMode: string;
  timestamp: string;
}

export default function Pharmacy() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [billingFormData, setBillingFormData] = useState({
    patientName: '',
    patientMRN: '',
    paymentMode: 'cash'
  });

  const [stockFormData, setStockFormData] = useState({
    drugId: '',
    drugName: '',
    batchNumber: '',
    expiryDate: '',
    quantity: 0,
    mrp: 0,
    purchasePrice: 0
  });

  useEffect(() => {
    fetchDrugs();
    fetchStockItems();
    fetchSales();
  }, []);

  const fetchDrugs = async () => {
    try {
      const response = await api.get('/api/drugs');
      setDrugs(response.data);
    } catch (error) {
      console.error('Error fetching drugs:', error);
    }
  };

  const fetchStockItems = async () => {
    try {
      const response = await api.get('/api/pharmacy/stock');
      setStockItems(response.data);
    } catch (error) {
      console.error('Error fetching stock:', error);
    }
  };

  const fetchSales = async () => {
    try {
      const response = await api.get('/api/pharmacy/sales');
      setSales(response.data);
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  const handleAddStock = async () => {
    setLoading(true);
    try {
      await api.post('/api/pharmacy/stock', stockFormData);

      // Update local stock list
      const newStock: StockItem = {
        id: Date.now().toString(),
        ...stockFormData
      };
      setStockItems([...stockItems, newStock]);

      await fetchDrugs();
      await fetchStockItems();
      setIsAddStockDialogOpen(false);
      setStockFormData({
        drugId: '',
        drugName: '',
        batchNumber: '',
        expiryDate: '',
        quantity: 0,
        mrp: 0,
        purchasePrice: 0
      });
      alert('Stock added successfully!');
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStock = async (stockId: string, quantity: number) => {
    try {
      await api.put(`/api/pharmacy/stock/${stockId}`, { quantity });
      await fetchDrugs();
      await fetchStockItems();
      alert('Stock updated successfully!');
    } catch (error) {
      console.error('Error removing stock:', error);
      alert('Failed to update stock');
    }
  };

  const handleBarcodeScanner = (barcode: string) => {
    if (!barcode.trim()) return;

    // Find drug by code/barcode
    const drug = drugs.find(d => d.code === barcode || d.id === barcode);
    if (drug) {
      addToCart(drug);
      setBarcodeInput('');
    } else {
      alert('Drug not found with barcode: ' + barcode);
    }
  };

  const addToCart = (drug: Drug) => {
    const existingItem = cart.find(item => item.drugId === drug.id);
    const unitPrice = drug.unitPrice || drug.price || 0;

    if (existingItem) {
      setCart(cart.map(item =>
        item.drugId === drug.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      setCart([...cart, {
        drugId: drug.id,
        drugName: drug.name,
        batchNumber: 'BATCH-' + Date.now(),
        quantity: 1,
        unitPrice: unitPrice,
        total: unitPrice
      }]);
    }
  };

  const updateCartQuantity = (drugId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(drugId);
      return;
    }

    setCart(cart.map(item =>
      item.drugId === drugId
        ? { ...item, quantity, total: quantity * item.unitPrice }
        : item
    ));
  };

  const removeFromCart = (drugId: string) => {
    setCart(cart.filter(item => item.drugId !== drugId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        patientName: billingFormData.patientName,
        patientMRN: billingFormData.patientMRN,
        items: cart,
        paymentMode: billingFormData.paymentMode,
        total: cartTotal
      };

      const response = await api.post('/api/pharmacy/sales', saleData);

      // Add to sales history
      const newSale: Sale = {
        id: response.data.id || Date.now().toString(),
        invoiceNumber: 'INV-' + Date.now(),
        patientName: billingFormData.patientName,
        patientMRN: billingFormData.patientMRN,
        items: cart,
        total: cartTotal,
        paymentMode: billingFormData.paymentMode,
        timestamp: new Date().toISOString()
      };
      setSales([newSale, ...sales]);

      // Clear cart and form
      setCart([]);
      setBillingFormData({
        patientName: '',
        patientMRN: '',
        paymentMode: 'cash'
      });

      await fetchDrugs();
      await fetchSales();
      alert(`Sale completed! Invoice: ${newSale.invoiceNumber}`);
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  const filteredDrugs = drugs.filter(drug =>
    drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drug.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drug.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  const stats = {
    totalDrugs: drugs.length,
    lowStock: drugs.filter(d => d.stockQuantity <= d.reorderLevel).length,
    outOfStock: drugs.filter(d => d.stockQuantity === 0).length,
    todaySales: sales.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString()).length
  };

  const lowStockDrugs = drugs.filter(d => d.stockQuantity <= d.reorderLevel && d.stockQuantity > 0);
  const expiringSoon = stockItems.filter(s => {
    const daysUntilExpiry = Math.floor((new Date(s.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 90 && daysUntilExpiry >= 0;
  });

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pharmacy Management System</h1>
          <p className="text-slate-600">Complete drug inventory, stock management, and POS billing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Drugs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDrugs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.todaySales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.lowStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="billing" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="billing">Billing / POS</TabsTrigger>
          <TabsTrigger value="inventory">Drug Inventory</TabsTrigger>
          <TabsTrigger value="stock">Stock Management</TabsTrigger>
          <TabsTrigger value="sales">Sales History</TabsTrigger>
          <TabsTrigger value="lowstock">Low Stock Alerts</TabsTrigger>
          <TabsTrigger value="expiry">Expiry Tracking</TabsTrigger>
        </TabsList>

        {/* Billing / POS Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Point of Sale (POS)</CardTitle>
              <CardDescription>RFID/Barcode scanning and manual billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Barcode Scanner */}
              <div className="space-y-2">
                <Label>RFID / Barcode Scanner</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Scan barcode or enter drug code..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleBarcodeScanner(barcodeInput);
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={() => handleBarcodeScanner(barcodeInput)}>
                    <Barcode className="w-4 h-4 mr-1" />
                    Scan
                  </Button>
                </div>
              </div>

              {/* Drug Search */}
              <div className="space-y-2">
                <Label>Manual Drug Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search drugs to add to cart..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchTerm && (
                  <div className="border rounded-md max-h-60 overflow-y-auto">
                    {filteredDrugs.slice(0, 10).map(drug => (
                      <div
                        key={drug.id}
                        className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                        onClick={() => addToCart(drug)}
                      >
                        <div>
                          <div className="font-medium">{drug.name}</div>
                          <div className="text-sm text-slate-600">
                            {drug.genericName} | {drug.dosageForm || drug.form} {drug.strength}
                          </div>
                          <div className="text-xs text-slate-500">Code: {drug.code || drug.id.substring(0, 8)} | Stock: {drug.stockQuantity}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">Rs. {drug.unitPrice || drug.price}</div>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); addToCart(drug); }}>
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shopping Cart */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Shopping Cart</Label>
                  <Badge variant="secondary">{cart.length} item(s)</Badge>
                </div>
                <div className="border rounded-md">
                  {cart.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <div>Cart is empty. Scan or search to add items.</div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Drug Name</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cart.map(item => (
                          <TableRow key={item.drugId}>
                            <TableCell className="font-medium">{item.drugName}</TableCell>
                            <TableCell>Rs. {item.unitPrice}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateCartQuantity(item.drugId, parseInt(e.target.value) || 0)}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell className="font-semibold">Rs. {item.total.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.drugId)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>

              {/* Billing Details */}
              {cart.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Patient Name (Optional)</Label>
                    <Input
                      value={billingFormData.patientName}
                      onChange={(e) => setBillingFormData(prev => ({ ...prev, patientName: e.target.value }))}
                      placeholder="Enter patient name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Patient MRN (Optional)</Label>
                    <Input
                      value={billingFormData.patientMRN}
                      onChange={(e) => setBillingFormData(prev => ({ ...prev, patientMRN: e.target.value }))}
                      placeholder="Enter MRN"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select value={billingFormData.paymentMode} onValueChange={(value) => setBillingFormData(prev => ({ ...prev, paymentMode: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Total and Checkout */}
              {cart.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-md space-y-3">
                  <div className="flex justify-between items-center text-2xl font-bold">
                    <span>Total Amount:</span>
                    <span className="text-green-600">Rs. {cartTotal.toFixed(2)}</span>
                  </div>
                  <Button className="w-full" size="lg" onClick={handleCheckout} disabled={loading}>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {loading ? 'Processing...' : 'Complete Sale & Print Invoice'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drug Inventory Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Drug Inventory</CardTitle>
              <CardDescription>View all drugs and stock levels</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Drug Name</TableHead>
                    <TableHead>Generic Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Dosage Form</TableHead>
                    <TableHead>Strength</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drugs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                        No drugs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    drugs.map((drug) => (
                      <TableRow key={drug.id}>
                        <TableCell className="font-medium">{drug.code || drug.id.substring(0, 8)}</TableCell>
                        <TableCell>{drug.name}</TableCell>
                        <TableCell className="text-sm text-slate-600">{drug.genericName}</TableCell>
                        <TableCell>{drug.category}</TableCell>
                        <TableCell>{drug.dosageForm || drug.form}</TableCell>
                        <TableCell>{drug.strength}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={drug.stockQuantity <= drug.reorderLevel ? 'text-red-600 font-semibold' : ''}>
                              {drug.stockQuantity}
                            </span>
                            {drug.stockQuantity <= drug.reorderLevel && (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>Rs. {drug.unitPrice || drug.price}</TableCell>
                        <TableCell>
                          <Badge variant={
                            drug.stockQuantity === 0 ? 'destructive' :
                            drug.stockQuantity <= drug.reorderLevel ? 'secondary' :
                            'default'
                          }>
                            {drug.stockQuantity === 0 ? 'Out of Stock' :
                             drug.stockQuantity <= drug.reorderLevel ? 'Low Stock' :
                             'In Stock'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Management Tab */}
        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Stock Management</CardTitle>
                  <CardDescription>Add and manage stock batches</CardDescription>
                </div>
                <Dialog open={isAddStockDialogOpen} onOpenChange={setIsAddStockDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Stock
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Stock Batch</DialogTitle>
                      <DialogDescription>Enter stock details including batch and expiry</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Drug *</Label>
                        <Select value={stockFormData.drugId} onValueChange={(value) => {
                          const drug = drugs.find(d => d.id === value);
                          setStockFormData(prev => ({ ...prev, drugId: value, drugName: drug?.name || '' }));
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select drug" />
                          </SelectTrigger>
                          <SelectContent>
                            {drugs.map(drug => (
                              <SelectItem key={drug.id} value={drug.id}>{drug.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Batch Number *</Label>
                        <Input
                          value={stockFormData.batchNumber}
                          onChange={(e) => setStockFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                          placeholder="e.g., BATCH2025001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expiry Date *</Label>
                        <Input
                          type="date"
                          value={stockFormData.expiryDate}
                          onChange={(e) => setStockFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={stockFormData.quantity}
                          onChange={(e) => setStockFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Purchase Price (per unit)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={stockFormData.purchasePrice}
                          onChange={(e) => setStockFormData(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>MRP (per unit) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={stockFormData.mrp}
                          onChange={(e) => setStockFormData(prev => ({ ...prev, mrp: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddStockDialogOpen(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddStock} disabled={loading || !stockFormData.drugId}>
                        {loading ? 'Adding...' : 'Add Stock'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug Name</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>MRP</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No stock batches found. Add stock to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockItems.map(stock => (
                      <TableRow key={stock.id}>
                        <TableCell className="font-medium">{stock.drugName}</TableCell>
                        <TableCell>{stock.batchNumber}</TableCell>
                        <TableCell>{new Date(stock.expiryDate).toLocaleDateString()}</TableCell>
                        <TableCell>{stock.quantity}</TableCell>
                        <TableCell>Rs. {stock.purchasePrice}</TableCell>
                        <TableCell>Rs. {stock.mrp}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newQty = prompt(`Current quantity: ${stock.quantity}. Enter new quantity:`);
                              if (newQty) handleRemoveStock(stock.id, parseInt(newQty));
                            }}
                          >
                            Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales History Tab */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales History</CardTitle>
              <CardDescription>View all pharmacy sales transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No sales recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                        <TableCell>{new Date(sale.timestamp).toLocaleString()}</TableCell>
                        <TableCell>
                          {sale.patientName || 'Walk-in Customer'}
                          {sale.patientMRN && <div className="text-xs text-slate-500">{sale.patientMRN}</div>}
                        </TableCell>
                        <TableCell>{sale.items.length} item(s)</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{sale.paymentMode.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">Rs. {sale.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <FileText className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock Alerts Tab */}
        <TabsContent value="lowstock">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alerts</CardTitle>
              <CardDescription>Drugs that need to be reordered</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug Name</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockDrugs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                        <div>All drugs are above reorder levels</div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowStockDrugs.map((drug) => (
                      <TableRow key={drug.id}>
                        <TableCell className="font-medium">{drug.name}</TableCell>
                        <TableCell className="text-orange-600 font-semibold">{drug.stockQuantity}</TableCell>
                        <TableCell>{drug.reorderLevel}</TableCell>
                        <TableCell>{drug.category}</TableCell>
                        <TableCell>Rs. {drug.unitPrice || drug.price}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Package className="w-4 h-4 mr-1" />
                            Reorder
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expiry Tracking Tab */}
        <TabsContent value="expiry">
          <Card>
            <CardHeader>
              <CardTitle>Expiry Tracking</CardTitle>
              <CardDescription>Stock batches expiring in next 90 days</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug Name</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Days Until Expiry</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringSoon.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                        <div>No items expiring in the next 90 days</div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    expiringSoon.map((stock) => {
                      const daysUntilExpiry = Math.floor((new Date(stock.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <TableRow key={stock.id}>
                          <TableCell className="font-medium">{stock.drugName}</TableCell>
                          <TableCell>{stock.batchNumber}</TableCell>
                          <TableCell>{new Date(stock.expiryDate).toLocaleDateString()}</TableCell>
                          <TableCell className={daysUntilExpiry <= 30 ? 'text-red-600 font-semibold' : 'text-orange-600'}>
                            {daysUntilExpiry} days
                          </TableCell>
                          <TableCell>{stock.quantity}</TableCell>
                          <TableCell>
                            <Badge variant={daysUntilExpiry <= 30 ? 'destructive' : 'secondary'}>
                              {daysUntilExpiry <= 30 ? 'Urgent' : 'Warning'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
