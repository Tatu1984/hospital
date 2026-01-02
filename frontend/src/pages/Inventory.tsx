import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, AlertTriangle, TrendingDown, FileText } from 'lucide-react';
import api from '../services/api';

interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  unitPrice: number;
  unit: string;
  supplier: string;
  lastRestocked: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  items: number;
  totalAmount: number;
  orderDate: string;
  expectedDelivery: string;
  status: string;
}

interface ItemFormData {
  name: string;
  category: string;
  unit: string;
  unitPrice: string;
  reorderLevel: string;
  supplier: string;
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [itemFormData, setItemFormData] = useState<ItemFormData>({
    name: '',
    category: '',
    unit: '',
    unitPrice: '',
    reorderLevel: '',
    supplier: ''
  });

  useEffect(() => {
    fetchItems();
    fetchPurchaseOrders();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await api.get('/api/inventory/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await api.get('/api/inventory/purchase-orders');
      setPurchaseOrders(response.data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  };

  const handleAddItem = async () => {
    setLoading(true);
    try {
      await api.post('/api/inventory/items', {
        ...itemFormData,
        unitPrice: parseFloat(itemFormData.unitPrice),
        reorderLevel: parseInt(itemFormData.reorderLevel)
      });
      await fetchItems();
      setIsItemDialogOpen(false);
      resetItemForm();
      alert('Item added successfully');
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const resetItemForm = () => {
    setItemFormData({
      name: '',
      category: '',
      unit: '',
      unitPrice: '',
      reorderLevel: '',
      supplier: ''
    });
  };

  const lowStockItems = items.filter(i => i.currentStock <= i.reorderLevel && i.currentStock > 0);
  const outOfStockItems = items.filter(i => i.currentStock === 0);
  const pendingPOs = purchaseOrders.filter(po => po.status === 'PENDING');

  const stats = {
    totalItems: items.length,
    lowStock: lowStockItems.length,
    outOfStock: outOfStockItems.length,
    pendingPOs: pendingPOs.length,
    totalValue: items.reduce((sum, item) => sum + (item.currentStock * item.unitPrice), 0)
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory & Procurement</h1>
          <p className="text-slate-600">Stock management, purchase orders, and supplier tracking</p>
        </div>
        <Button onClick={() => setIsItemDialogOpen(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <TrendingDown className="w-4 h-4" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.lowStock}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Pending POs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pendingPOs}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Rs. {stats.totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Management</CardTitle>
          <CardDescription>Track stock levels and manage procurement</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Items ({stats.totalItems})</TabsTrigger>
              <TabsTrigger value="lowstock">Low Stock ({stats.lowStock})</TabsTrigger>
              <TabsTrigger value="outofstock">Out of Stock ({stats.outOfStock})</TabsTrigger>
              <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
              <TabsTrigger value="grn">Goods Receipt</TabsTrigger>
              <TabsTrigger value="transfers">Stock Transfers</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemCode}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                        <TableCell>
                          <span className={item.currentStock === 0 ? 'text-red-600 font-semibold' : item.currentStock <= item.reorderLevel ? 'text-orange-600 font-semibold' : ''}>
                            {item.currentStock} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell>{item.reorderLevel} {item.unit}</TableCell>
                        <TableCell>Rs. {item.unitPrice}</TableCell>
                        <TableCell>{item.supplier}</TableCell>
                        <TableCell>
                          {item.currentStock === 0 ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : item.currentStock <= item.reorderLevel ? (
                            <Badge className="bg-orange-600">Low Stock</Badge>
                          ) : (
                            <Badge variant="default">In Stock</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="lowstock">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No low stock items
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowStockItems.map((item) => (
                      <TableRow key={item.id} className="bg-orange-50">
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-orange-600 font-semibold">{item.currentStock} {item.unit}</TableCell>
                        <TableCell>{item.reorderLevel} {item.unit}</TableCell>
                        <TableCell>{item.supplier}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Create PO
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="outofstock">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outOfStockItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No out of stock items
                      </TableCell>
                    </TableRow>
                  ) : (
                    outOfStockItems.map((item) => (
                      <TableRow key={item.id} className="bg-red-50">
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.reorderLevel} {item.unit}</TableCell>
                        <TableCell>{item.supplier}</TableCell>
                        <TableCell>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700">
                            Urgent Order
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="orders">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No purchase orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseOrders.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">{po.poNumber}</TableCell>
                        <TableCell>{po.supplier}</TableCell>
                        <TableCell>{po.items} items</TableCell>
                        <TableCell>Rs. {po.totalAmount}</TableCell>
                        <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(po.expectedDelivery).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              po.status === 'DELIVERED' ? 'default' :
                              po.status === 'PENDING' ? 'secondary' :
                              'outline'
                            }
                          >
                            {po.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Goods Receipt Tab */}
            <TabsContent value="grn">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Goods Receipt Notes</h3>
                  <Button onClick={() => alert('GRN form coming soon')}>
                    <Plus className="w-4 h-4 mr-2" />
                    New GRN
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GRN #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Received Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No goods receipts found. Create a new GRN to receive goods.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Stock Transfers Tab */}
            <TabsContent value="transfers">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Stock Transfers</h3>
                  <Button onClick={() => alert('Transfer form coming soon')}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Transfer
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transfer #</TableHead>
                      <TableHead>From Store</TableHead>
                      <TableHead>To Store</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No stock transfers found. Create a new transfer to move stock between stores.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Register a new item in inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input
                  placeholder="Item name"
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={itemFormData.category}
                  onValueChange={(value) => setItemFormData({ ...itemFormData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                    <SelectItem value="Surgical Items">Surgical Items</SelectItem>
                    <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                    <SelectItem value="Cleaning Supplies">Cleaning Supplies</SelectItem>
                    <SelectItem value="Food & Beverages">Food & Beverages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Input
                  placeholder="e.g., pcs, kg, liters"
                  value={itemFormData.unit}
                  onChange={(e) => setItemFormData({ ...itemFormData, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Price per unit"
                  value={itemFormData.unitPrice}
                  onChange={(e) => setItemFormData({ ...itemFormData, unitPrice: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reorder Level *</Label>
                <Input
                  type="number"
                  placeholder="Minimum stock level"
                  value={itemFormData.reorderLevel}
                  onChange={(e) => setItemFormData({ ...itemFormData, reorderLevel: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  placeholder="Supplier name"
                  value={itemFormData.supplier}
                  onChange={(e) => setItemFormData({ ...itemFormData, supplier: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={loading}>
              {loading ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
