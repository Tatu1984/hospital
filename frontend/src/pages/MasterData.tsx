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
import { Plus, Edit, Trash2 } from 'lucide-react';
import api from '../services/api';

interface MasterItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  status: 'active' | 'inactive';
  [key: string]: any;
}

export default function MasterData() {
  const [activeTab, setActiveTab] = useState('drugs');
  const [items, setItems] = useState<MasterItem[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MasterItem | null>(null);
  const [loading, setLoading] = useState(false);

  // Generic form data
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchItems(activeTab);
  }, [activeTab]);

  const fetchItems = async (type: string) => {
    try {
      const response = await api.get(`/api/master/${type}`);
      setItems(response.data);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
    }
  };

  const handleAdd = async () => {
    setLoading(true);
    try {
      await api.post(`/api/master/${activeTab}`, { ...formData, status: 'active' });
      await fetchItems(activeTab);
      setIsAddDialogOpen(false);
      setFormData({});
      alert('Item added successfully!');
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedItem) return;

    setLoading(true);
    try {
      await api.put(`/api/master/${activeTab}/${selectedItem.id}`, formData);
      await fetchItems(activeTab);
      setIsEditDialogOpen(false);
      setSelectedItem(null);
      setFormData({});
      alert('Item updated successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await api.delete(`/api/master/${activeTab}/${id}`);
      await fetchItems(activeTab);
      alert('Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const openEditDialog = (item: MasterItem) => {
    setSelectedItem(item);
    setFormData(item);
    setIsEditDialogOpen(true);
  };

  const getFormFields = (type: string) => {
    switch (type) {
      case 'drugs':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Drug Code *</Label>
                <Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="DRG001" />
              </div>
              <div className="space-y-2">
                <Label>Drug Name *</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Paracetamol" />
              </div>
              <div className="space-y-2">
                <Label>Generic Name</Label>
                <Input value={formData.genericName || ''} onChange={(e) => setFormData({ ...formData, genericName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Analgesic" />
              </div>
              <div className="space-y-2">
                <Label>Dosage Form</Label>
                <Input value={formData.dosageForm || ''} onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })} placeholder="Tablet" />
              </div>
              <div className="space-y-2">
                <Label>Strength</Label>
                <Input value={formData.strength || ''} onChange={(e) => setFormData({ ...formData, strength: e.target.value })} placeholder="500mg" />
              </div>
              <div className="space-y-2">
                <Label>Unit Price (Rs.)</Label>
                <Input type="number" step="0.01" value={formData.unitPrice || 0} onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input type="number" value={formData.reorderLevel || 0} onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) })} />
              </div>
            </div>
          </>
        );

      case 'lab-tests':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Test Code *</Label>
                <Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="LAB001" />
              </div>
              <div className="space-y-2">
                <Label>Test Name *</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Complete Blood Count" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Hematology" />
              </div>
              <div className="space-y-2">
                <Label>Sample Type</Label>
                <Input value={formData.sampleType || ''} onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })} placeholder="Blood" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Price (Rs.) *</Label>
                <Input type="number" step="0.01" value={formData.price || 0} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
              </div>
            </div>
          </>
        );

      case 'radiology-tests':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Test Code *</Label>
                <Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="RAD001" />
              </div>
              <div className="space-y-2">
                <Label>Test Name *</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="X-Ray Chest" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category || ''} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X-Ray">X-Ray</SelectItem>
                    <SelectItem value="CT Scan">CT Scan</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="Mammography">Mammography</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price (Rs.) *</Label>
                <Input type="number" step="0.01" value={formData.price || 0} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
              </div>
            </div>
          </>
        );

      case 'procedures':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Procedure Code *</Label>
                <Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="PROC001" />
              </div>
              <div className="space-y-2">
                <Label>Procedure Name *</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Appendectomy" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Description</Label>
                <Input value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Surgery" />
              </div>
              <div className="space-y-2">
                <Label>Price (Rs.) *</Label>
                <Input type="number" step="0.01" value={formData.price || 0} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
              </div>
            </div>
          </>
        );

      case 'departments':
        return (
          <>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Department Code *</Label>
                <Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="DEPT001" />
              </div>
              <div className="space-y-2">
                <Label>Department Name *</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Cardiology" />
              </div>
              <div className="space-y-2">
                <Label>HOD Name</Label>
                <Input value={formData.hodName || ''} onChange={(e) => setFormData({ ...formData, hodName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input value={formData.contact || ''} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
              </div>
            </div>
          </>
        );

      case 'wards':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ward Code *</Label>
                <Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="WARD001" />
              </div>
              <div className="space-y-2">
                <Label>Ward Name *</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="General Ward" />
              </div>
              <div className="space-y-2">
                <Label>Total Beds</Label>
                <Input type="number" value={formData.totalBeds || 0} onChange={(e) => setFormData({ ...formData, totalBeds: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Bed Charge (Rs./day)</Label>
                <Input type="number" step="0.01" value={formData.bedCharge || 0} onChange={(e) => setFormData({ ...formData, bedCharge: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Floor</Label>
                <Input value={formData.floor || ''} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Wing</Label>
                <Input value={formData.wing || ''} onChange={(e) => setFormData({ ...formData, wing: e.target.value })} />
              </div>
            </div>
          </>
        );

      case 'packages':
        return (
          <>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Package Code *</Label>
                <Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="PKG001" />
              </div>
              <div className="space-y-2">
                <Label>Package Name *</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Health Checkup Package" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Package details..."
                />
              </div>
              <div className="space-y-2">
                <Label>Price (Rs.) *</Label>
                <Input type="number" step="0.01" value={formData.price || 0} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
              </div>
            </div>
          </>
        );

      default:
        return (
          <>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
            </div>
          </>
        );
    }
  };

  const getTabLabel = (tab: string) => {
    const labels: { [key: string]: string } = {
      'drugs': 'Drugs',
      'lab-tests': 'Lab Tests',
      'radiology-tests': 'Radiology Tests',
      'procedures': 'Procedures',
      'departments': 'Departments',
      'wards': 'Wards/Rooms',
      'packages': 'Service Packages'
    };
    return labels[tab] || tab;
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Master Data Management</h1>
          <p className="text-slate-600">Configure hospital master data and tariffs</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="drugs">Drugs</TabsTrigger>
          <TabsTrigger value="lab-tests">Lab Tests</TabsTrigger>
          <TabsTrigger value="radiology-tests">Radiology</TabsTrigger>
          <TabsTrigger value="procedures">Procedures</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="wards">Wards/Rooms</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>

        {['drugs', 'lab-tests', 'radiology-tests', 'procedures', 'departments', 'wards', 'packages'].map(tab => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{getTabLabel(tab)} Master</CardTitle>
                    <CardDescription>Manage {getTabLabel(tab).toLowerCase()} master data</CardDescription>
                  </div>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setFormData({})}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add {getTabLabel(tab)}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add {getTabLabel(tab)}</DialogTitle>
                        <DialogDescription>Add new {getTabLabel(tab).toLowerCase()} to master data</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        {getFormFields(tab)}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={loading}>
                          Cancel
                        </Button>
                        <Button onClick={handleAdd} disabled={loading}>
                          {loading ? 'Adding...' : `Add ${getTabLabel(tab)}`}
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
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      {tab === 'drugs' && (
                        <>
                          <TableHead>Generic Name</TableHead>
                          <TableHead>Form</TableHead>
                          <TableHead>Strength</TableHead>
                          <TableHead>Price</TableHead>
                        </>
                      )}
                      {(tab === 'lab-tests' || tab === 'radiology-tests') && (
                        <>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                        </>
                      )}
                      {tab === 'procedures' && (
                        <>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                        </>
                      )}
                      {tab === 'departments' && (
                        <>
                          <TableHead>HOD</TableHead>
                          <TableHead>Contact</TableHead>
                        </>
                      )}
                      {tab === 'wards' && (
                        <>
                          <TableHead>Beds</TableHead>
                          <TableHead>Charge/Day</TableHead>
                          <TableHead>Floor/Wing</TableHead>
                        </>
                      )}
                      {tab === 'packages' && (
                        <>
                          <TableHead>Description</TableHead>
                          <TableHead>Price</TableHead>
                        </>
                      )}
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                          No {getTabLabel(tab).toLowerCase()} found. Add new items to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.code}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          {tab === 'drugs' && (
                            <>
                              <TableCell>{item.genericName}</TableCell>
                              <TableCell>{item.dosageForm}</TableCell>
                              <TableCell>{item.strength}</TableCell>
                              <TableCell>Rs. {item.unitPrice?.toFixed(2)}</TableCell>
                            </>
                          )}
                          {(tab === 'lab-tests' || tab === 'radiology-tests') && (
                            <>
                              <TableCell>{item.category}</TableCell>
                              <TableCell>Rs. {item.price?.toFixed(2)}</TableCell>
                            </>
                          )}
                          {tab === 'procedures' && (
                            <>
                              <TableCell>{item.category}</TableCell>
                              <TableCell>Rs. {item.price?.toFixed(2)}</TableCell>
                            </>
                          )}
                          {tab === 'departments' && (
                            <>
                              <TableCell>{item.hodName}</TableCell>
                              <TableCell>{item.contact}</TableCell>
                            </>
                          )}
                          {tab === 'wards' && (
                            <>
                              <TableCell>{item.totalBeds}</TableCell>
                              <TableCell>Rs. {item.bedCharge?.toFixed(2)}</TableCell>
                              <TableCell>{item.floor} - {item.wing}</TableCell>
                            </>
                          )}
                          {tab === 'packages' && (
                            <>
                              <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                              <TableCell>Rs. {item.price?.toFixed(2)}</TableCell>
                            </>
                          )}
                          <TableCell>
                            <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {getTabLabel(activeTab)}</DialogTitle>
            <DialogDescription>Update {getTabLabel(activeTab).toLowerCase()} details</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {getFormFields(activeTab)}
            <div className="space-y-2 mt-4">
              <Label>Status</Label>
              <Select value={formData.status || 'active'} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
