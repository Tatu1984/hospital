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
import { Plus, Edit, Trash2, DollarSign, Building2, Search } from 'lucide-react';
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

interface TPA {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
}

interface TariffConfig {
  id: string;
  tpaId: string;
  tpaName?: string;
  serviceType: string;
  serviceId: string;
  serviceName?: string;
  cashPrice: number;
  cardPrice: number;
  tpaPrice: number;
  discountPercent: number;
}

export default function MasterData() {
  const [activeTab, setActiveTab] = useState('drugs');
  const [items, setItems] = useState<MasterItem[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MasterItem | null>(null);
  const [loading, setLoading] = useState(false);

  // TPA Tariff state
  const [tpas, setTpas] = useState<TPA[]>([]);
  const [tariffs, setTariffs] = useState<TariffConfig[]>([]);
  const [isTariffDialogOpen, setIsTariffDialogOpen] = useState(false);
  const [selectedTpaForTariff, setSelectedTpaForTariff] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState('lab-tests');
  const [services, setServices] = useState<MasterItem[]>([]);
  const [tariffSearch, setTariffSearch] = useState('');

  // Generic form data
  const [formData, setFormData] = useState<any>({});
  const [tariffFormData, setTariffFormData] = useState<any>({
    serviceId: '',
    cashPrice: 0,
    cardPrice: 0,
    tpaPrice: 0,
    discountPercent: 0,
  });

  useEffect(() => {
    fetchItems(activeTab);
    if (activeTab === 'tariffs') {
      fetchTPAs();
      fetchTariffs();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'tariffs' && selectedServiceType) {
      fetchServicesForTariff(selectedServiceType);
    }
  }, [activeTab, selectedServiceType]);

  const fetchItems = async (type: string) => {
    if (type === 'tariffs' || type === 'tpa-management') return;
    try {
      const response = await api.get(`/api/master/${type}`);
      setItems(response.data);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
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

  const fetchTariffs = async () => {
    try {
      const response = await api.get('/api/tariffs');
      setTariffs(response.data);
    } catch (error) {
      console.error('Error fetching tariffs:', error);
    }
  };

  const fetchServicesForTariff = async (serviceType: string) => {
    try {
      const response = await api.get(`/api/master/${serviceType}`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
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

  const handleAddTariff = async () => {
    if (!selectedTpaForTariff || !tariffFormData.serviceId) {
      alert('Please select TPA and service');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/tariffs', {
        tpaId: selectedTpaForTariff,
        serviceType: selectedServiceType,
        serviceId: tariffFormData.serviceId,
        cashPrice: tariffFormData.cashPrice,
        cardPrice: tariffFormData.cardPrice,
        tpaPrice: tariffFormData.tpaPrice,
        discountPercent: tariffFormData.discountPercent,
      });
      await fetchTariffs();
      setIsTariffDialogOpen(false);
      setTariffFormData({
        serviceId: '',
        cashPrice: 0,
        cardPrice: 0,
        tpaPrice: 0,
        discountPercent: 0,
      });
      alert('Tariff configured successfully!');
    } catch (error) {
      console.error('Error adding tariff:', error);
      alert('Failed to configure tariff');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTariff = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tariff configuration?')) return;

    try {
      await api.delete(`/api/tariffs/${id}`);
      await fetchTariffs();
      alert('Tariff deleted successfully!');
    } catch (error) {
      console.error('Error deleting tariff:', error);
      alert('Failed to delete tariff');
    }
  };

  // TPA Management handlers
  const handleAddTPA = async () => {
    setLoading(true);
    try {
      await api.post('/api/tpas', { ...formData, status: 'active' });
      await fetchTPAs();
      setIsAddDialogOpen(false);
      setFormData({});
      alert('TPA added successfully!');
    } catch (error) {
      console.error('Error adding TPA:', error);
      alert('Failed to add TPA');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTPA = async () => {
    if (!selectedItem) return;

    setLoading(true);
    try {
      await api.put(`/api/tpas/${selectedItem.id}`, formData);
      await fetchTPAs();
      setIsEditDialogOpen(false);
      setSelectedItem(null);
      setFormData({});
      alert('TPA updated successfully!');
    } catch (error) {
      console.error('Error updating TPA:', error);
      alert('Failed to update TPA');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTPA = async (id: string) => {
    if (!confirm('Are you sure you want to delete this TPA?')) return;

    try {
      await api.delete(`/api/tpas/${id}`);
      await fetchTPAs();
      alert('TPA deleted successfully!');
    } catch (error) {
      console.error('Error deleting TPA:', error);
      alert('Failed to delete TPA');
    }
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
                <Label>Standard Price (Rs.) *</Label>
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
                <Label>Modality</Label>
                <Select value={formData.modality || ''} onValueChange={(value) => setFormData({ ...formData, modality: value })}>
                  <SelectTrigger><SelectValue placeholder="Select modality" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X-Ray">X-Ray</SelectItem>
                    <SelectItem value="CT">CT Scan</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="Mammography">Mammography</SelectItem>
                    <SelectItem value="Fluoroscopy">Fluoroscopy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Body Part</Label>
                <Input value={formData.bodyPart || ''} onChange={(e) => setFormData({ ...formData, bodyPart: e.target.value })} placeholder="Chest" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Standard Price (Rs.) *</Label>
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
                <Label>Standard Price (Rs.) *</Label>
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
                <Label>Ward Type</Label>
                <Select value={formData.wardType || 'general'} onValueChange={(value) => setFormData({ ...formData, wardType: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Ward</SelectItem>
                    <SelectItem value="male">Male Ward</SelectItem>
                    <SelectItem value="female">Female Ward</SelectItem>
                    <SelectItem value="paediatric">Paediatric Ward</SelectItem>
                    <SelectItem value="obsgynae">Obs & Gynae Ward</SelectItem>
                    <SelectItem value="private">Private Room</SelectItem>
                    <SelectItem value="semi-private">Semi-Private</SelectItem>
                    <SelectItem value="deluxe">Deluxe Room</SelectItem>
                    <SelectItem value="suite">Suite</SelectItem>
                    <SelectItem value="icu">ICU</SelectItem>
                    <SelectItem value="ccu">CCU</SelectItem>
                    <SelectItem value="iccu">ICCU</SelectItem>
                    <SelectItem value="hdu">HDU</SelectItem>
                    <SelectItem value="itu">ITU</SelectItem>
                    <SelectItem value="micu">MICU</SelectItem>
                    <SelectItem value="sicu">SICU</SelectItem>
                    <SelectItem value="ricu">RICU</SelectItem>
                    <SelectItem value="nicu">NICU</SelectItem>
                    <SelectItem value="picu">PICU</SelectItem>
                    <SelectItem value="burns">Burns ICU</SelectItem>
                    <SelectItem value="neuro">Neuro ICU</SelectItem>
                    <SelectItem value="cardiac">Cardiac ICU</SelectItem>
                    <SelectItem value="trauma">Trauma ICU</SelectItem>
                    <SelectItem value="isolation">Isolation Ward</SelectItem>
                    <SelectItem value="emergency">Emergency Ward</SelectItem>
                    <SelectItem value="daycare">Day Care</SelectItem>
                    <SelectItem value="ot">Operation Theatre</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label>Nursing Charge (Rs./day)</Label>
                <Input type="number" step="0.01" value={formData.nursingCharge || 0} onChange={(e) => setFormData({ ...formData, nursingCharge: parseFloat(e.target.value) })} />
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

      case 'tpa-management':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TPA Code *</Label>
                <Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="TPA001" />
              </div>
              <div className="space-y-2">
                <Label>TPA Name *</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Star Health Insurance" />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={formData.contactPerson || ''} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input value={formData.contact || ''} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Default Discount %</Label>
                <Input type="number" step="0.1" value={formData.discountPercent || 0} onChange={(e) => setFormData({ ...formData, discountPercent: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
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
      'packages': 'Service Packages',
      'tpa-management': 'TPA/Insurance',
      'tariffs': 'Pricing & Tariffs'
    };
    return labels[tab] || tab;
  };

  const filteredTariffs = tariffs.filter(t => {
    if (!tariffSearch) return true;
    const search = tariffSearch.toLowerCase();
    return (
      t.tpaName?.toLowerCase().includes(search) ||
      t.serviceName?.toLowerCase().includes(search) ||
      t.serviceType.toLowerCase().includes(search)
    );
  });

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Master Data Management</h1>
          <p className="text-slate-600">Configure hospital master data, pricing, and tariffs</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="drugs">Drugs</TabsTrigger>
          <TabsTrigger value="lab-tests">Lab Tests</TabsTrigger>
          <TabsTrigger value="radiology-tests">Radiology</TabsTrigger>
          <TabsTrigger value="procedures">Procedures</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="wards">Wards/Rooms</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="tpa-management">TPA/Insurance</TabsTrigger>
          <TabsTrigger value="tariffs">Pricing</TabsTrigger>
        </TabsList>

        {/* TPA Management Tab */}
        <TabsContent value="tpa-management">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    TPA / Insurance Companies
                  </CardTitle>
                  <CardDescription>Manage insurance providers and TPA contracts</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setFormData({})}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add TPA/Insurance
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add TPA / Insurance Company</DialogTitle>
                      <DialogDescription>Add new insurance provider or TPA</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      {getFormFields('tpa-management')}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddTPA} disabled={loading}>
                        {loading ? 'Adding...' : 'Add TPA'}
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
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Default Discount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tpas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No TPA/Insurance companies found. Add new entries to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tpas.map((tpa: any) => (
                      <TableRow key={tpa.id}>
                        <TableCell className="font-medium">{tpa.code}</TableCell>
                        <TableCell>{tpa.name}</TableCell>
                        <TableCell>{tpa.contactPerson || '-'}</TableCell>
                        <TableCell>{tpa.contact || '-'}</TableCell>
                        <TableCell>{tpa.discountPercent ? `${tpa.discountPercent}%` : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={tpa.status === 'active' ? 'default' : 'secondary'}>
                            {tpa.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(tpa);
                                setFormData(tpa);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteTPA(tpa.id)}>
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

        {/* Pricing/Tariffs Tab */}
        <TabsContent value="tariffs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Pricing Configuration
                  </CardTitle>
                  <CardDescription>Configure pricing for different payment modes: Cash, Card, and TPA contracts</CardDescription>
                </div>
                <Dialog open={isTariffDialogOpen} onOpenChange={setIsTariffDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Configure Pricing
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Configure Service Pricing</DialogTitle>
                      <DialogDescription>Set prices for different payment modes</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>TPA / Insurance *</Label>
                          <Select value={selectedTpaForTariff} onValueChange={setSelectedTpaForTariff}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select TPA" />
                            </SelectTrigger>
                            <SelectContent>
                              {tpas.map((tpa) => (
                                <SelectItem key={tpa.id} value={tpa.id}>{tpa.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Service Type *</Label>
                          <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lab-tests">Lab Tests</SelectItem>
                              <SelectItem value="radiology-tests">Radiology Tests</SelectItem>
                              <SelectItem value="procedures">Procedures</SelectItem>
                              <SelectItem value="packages">Packages</SelectItem>
                              <SelectItem value="wards">Room Charges</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Select Service *</Label>
                        <Select
                          value={tariffFormData.serviceId}
                          onValueChange={(value) => {
                            const service = services.find(s => s.id === value);
                            setTariffFormData({
                              ...tariffFormData,
                              serviceId: value,
                              cashPrice: service?.price || service?.bedCharge || 0,
                              cardPrice: service?.price || service?.bedCharge || 0,
                              tpaPrice: service?.price || service?.bedCharge || 0,
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name} - Rs. {service.price?.toFixed(2) || service.bedCharge?.toFixed(2) || 0}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg border space-y-4">
                        <h4 className="font-semibold">Price Configuration</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Cash Price (Rs.)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={tariffFormData.cashPrice || 0}
                              onChange={(e) => setTariffFormData({ ...tariffFormData, cashPrice: parseFloat(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Card Price (Rs.)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={tariffFormData.cardPrice || 0}
                              onChange={(e) => setTariffFormData({ ...tariffFormData, cardPrice: parseFloat(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>TPA Contract Price (Rs.)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={tariffFormData.tpaPrice || 0}
                              onChange={(e) => setTariffFormData({ ...tariffFormData, tpaPrice: parseFloat(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Discount Percentage (%)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={tariffFormData.discountPercent || 0}
                              onChange={(e) => setTariffFormData({ ...tariffFormData, discountPercent: parseFloat(e.target.value) })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsTariffDialogOpen(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddTariff} disabled={loading || !selectedTpaForTariff || !tariffFormData.serviceId}>
                        {loading ? 'Saving...' : 'Save Pricing'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by TPA, service name, or type..."
                    value={tariffSearch}
                    onChange={(e) => setTariffSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TPA/Insurance</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Cash Price</TableHead>
                    <TableHead>Card Price</TableHead>
                    <TableHead>TPA Price</TableHead>
                    <TableHead>Discount %</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTariffs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No tariff configurations found. Click "Configure Pricing" to add pricing rules.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTariffs.map((tariff) => (
                      <TableRow key={tariff.id}>
                        <TableCell className="font-medium">{tariff.tpaName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tariff.serviceType}</Badge>
                        </TableCell>
                        <TableCell>{tariff.serviceName}</TableCell>
                        <TableCell>Rs. {tariff.cashPrice?.toFixed(2)}</TableCell>
                        <TableCell>Rs. {tariff.cardPrice?.toFixed(2)}</TableCell>
                        <TableCell>Rs. {tariff.tpaPrice?.toFixed(2)}</TableCell>
                        <TableCell>{tariff.discountPercent}%</TableCell>
                        <TableCell>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteTariff(tariff.id)}>
                            <Trash2 className="w-4 h-4" />
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

        {/* Regular Master Data Tabs */}
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
                          <TableHead>Type</TableHead>
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
                              <TableCell>{item.category || item.modality}</TableCell>
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
                              <TableCell>{item.wardType || 'general'}</TableCell>
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
            <Button onClick={activeTab === 'tpa-management' ? handleEditTPA : handleEdit} disabled={loading}>
              {loading ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
