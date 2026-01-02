import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/Toast';
import {
  Monitor, Search, Plus, Package, AlertTriangle, Wrench,
  MapPin, Calendar, DollarSign, RefreshCw, QrCode, FileText
} from 'lucide-react';

interface Asset {
  id: string;
  assetCode: string;
  name: string;
  category: 'MEDICAL_EQUIPMENT' | 'IT_EQUIPMENT' | 'FURNITURE' | 'VEHICLE' | 'BUILDING' | 'OTHER';
  subCategory?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  depreciationRate: number;
  depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  usefulLife: number;
  location: string;
  department: string;
  assignedTo?: string;
  status: 'ACTIVE' | 'UNDER_MAINTENANCE' | 'DISPOSED' | 'TRANSFERRED' | 'LOST';
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  warrantyExpiry?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  notes?: string;
}

interface AssetTransfer {
  id: string;
  assetId: string;
  fromLocation: string;
  toLocation: string;
  fromDepartment: string;
  toDepartment: string;
  transferDate: string;
  reason: string;
  approvedBy: string;
}

const CATEGORIES = [
  { value: 'MEDICAL_EQUIPMENT', label: 'Medical Equipment', subCategories: ['Diagnostic', 'Therapeutic', 'Monitoring', 'Laboratory', 'Surgical'] },
  { value: 'IT_EQUIPMENT', label: 'IT Equipment', subCategories: ['Computer', 'Printer', 'Network', 'Server', 'Peripheral'] },
  { value: 'FURNITURE', label: 'Furniture', subCategories: ['Office', 'Patient', 'Waiting Area', 'Storage'] },
  { value: 'VEHICLE', label: 'Vehicle', subCategories: ['Ambulance', 'Transport', 'Utility'] },
  { value: 'BUILDING', label: 'Building', subCategories: ['Land', 'Structure', 'Improvement'] },
  { value: 'OTHER', label: 'Other', subCategories: ['Miscellaneous'] },
];

const DEPARTMENTS = ['ICU', 'Emergency', 'OPD', 'Laboratory', 'Radiology', 'Pharmacy', 'Administration', 'IT', 'Housekeeping'];

export default function AssetManagement() {
  const { success: showToast } = useToast();
  const [activeTab, setActiveTab] = useState('assets');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'MEDICAL_EQUIPMENT' as Asset['category'],
    subCategory: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    purchasePrice: 0,
    depreciationRate: 10,
    usefulLife: 10,
    location: '',
    department: '',
    warrantyExpiry: '',
    notes: '',
  });

  // Transfer form
  const [transferData, setTransferData] = useState({
    toLocation: '',
    toDepartment: '',
    reason: '',
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      // Mock data
      const mockAssets: Asset[] = [
        {
          id: '1',
          assetCode: 'AST-MED-001',
          name: 'Philips IntelliVue MX800 Patient Monitor',
          category: 'MEDICAL_EQUIPMENT',
          subCategory: 'Monitoring',
          manufacturer: 'Philips',
          model: 'MX800',
          serialNumber: 'PHI-2024-001234',
          purchaseDate: '2023-01-15',
          purchasePrice: 450000,
          currentValue: 405000,
          depreciationRate: 10,
          depreciationMethod: 'STRAIGHT_LINE',
          usefulLife: 10,
          location: 'ICU Room 5',
          department: 'ICU',
          status: 'ACTIVE',
          condition: 'EXCELLENT',
          warrantyExpiry: '2026-01-15',
          lastMaintenanceDate: '2024-06-15',
          nextMaintenanceDate: '2024-12-15',
        },
        {
          id: '2',
          assetCode: 'AST-MED-002',
          name: 'GE Logiq E10 Ultrasound',
          category: 'MEDICAL_EQUIPMENT',
          subCategory: 'Diagnostic',
          manufacturer: 'GE Healthcare',
          model: 'Logiq E10',
          serialNumber: 'GE-2023-005678',
          purchaseDate: '2022-06-20',
          purchasePrice: 2500000,
          currentValue: 2000000,
          depreciationRate: 10,
          depreciationMethod: 'STRAIGHT_LINE',
          usefulLife: 10,
          location: 'Radiology Department',
          department: 'Radiology',
          status: 'UNDER_MAINTENANCE',
          condition: 'GOOD',
          warrantyExpiry: '2025-06-20',
          lastMaintenanceDate: '2024-09-01',
        },
        {
          id: '3',
          assetCode: 'AST-IT-001',
          name: 'Dell OptiPlex 7090 Desktop',
          category: 'IT_EQUIPMENT',
          subCategory: 'Computer',
          manufacturer: 'Dell',
          model: 'OptiPlex 7090',
          serialNumber: 'DELL-2024-009876',
          purchaseDate: '2024-01-10',
          purchasePrice: 75000,
          currentValue: 67500,
          depreciationRate: 33,
          depreciationMethod: 'DECLINING_BALANCE',
          usefulLife: 3,
          location: 'OPD Reception',
          department: 'OPD',
          assignedTo: 'Reception Staff',
          status: 'ACTIVE',
          condition: 'EXCELLENT',
          warrantyExpiry: '2027-01-10',
        },
        {
          id: '4',
          assetCode: 'AST-VEH-001',
          name: 'Force Traveller Ambulance',
          category: 'VEHICLE',
          subCategory: 'Ambulance',
          manufacturer: 'Force Motors',
          model: 'Traveller',
          serialNumber: 'FM-AMB-2023-001',
          purchaseDate: '2023-03-01',
          purchasePrice: 1500000,
          currentValue: 1275000,
          depreciationRate: 15,
          depreciationMethod: 'STRAIGHT_LINE',
          usefulLife: 8,
          location: 'Ambulance Bay',
          department: 'Emergency',
          status: 'ACTIVE',
          condition: 'GOOD',
          lastMaintenanceDate: '2024-08-15',
          nextMaintenanceDate: '2024-11-15',
        },
      ];
      setAssets(mockAssets);
    } catch (error) {
      showToast('Failed to fetch assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async () => {
    try {
      const assetCode = `AST-${formData.category.slice(0, 3)}-${String(assets.length + 1).padStart(3, '0')}`;
      const newAsset: Asset = {
        id: String(Date.now()),
        assetCode,
        name: formData.name,
        category: formData.category,
        subCategory: formData.subCategory,
        manufacturer: formData.manufacturer,
        model: formData.model,
        serialNumber: formData.serialNumber,
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice,
        currentValue: formData.purchasePrice,
        depreciationRate: formData.depreciationRate,
        depreciationMethod: 'STRAIGHT_LINE',
        usefulLife: formData.usefulLife,
        location: formData.location,
        department: formData.department,
        status: 'ACTIVE',
        condition: 'EXCELLENT',
        warrantyExpiry: formData.warrantyExpiry,
        notes: formData.notes,
      };

      setAssets(prev => [newAsset, ...prev]);
      showToast('Asset added successfully', 'success');
      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      showToast('Failed to add asset', 'error');
    }
  };

  const handleTransfer = async () => {
    if (!selectedAsset) return;

    try {
      setAssets(prev => prev.map(a =>
        a.id === selectedAsset.id
          ? { ...a, location: transferData.toLocation, department: transferData.toDepartment }
          : a
      ));

      showToast('Asset transferred successfully', 'success');
      setShowTransferDialog(false);
      setSelectedAsset(null);
      setTransferData({ toLocation: '', toDepartment: '', reason: '' });
    } catch (error) {
      showToast('Failed to transfer asset', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'MEDICAL_EQUIPMENT',
      subCategory: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      purchaseDate: '',
      purchasePrice: 0,
      depreciationRate: 10,
      usefulLife: 10,
      location: '',
      department: '',
      warrantyExpiry: '',
      notes: '',
    });
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalDepreciation = assets.reduce((sum, a) => sum + (a.purchasePrice - a.currentValue), 0);
  const underMaintenance = assets.filter(a => a.status === 'UNDER_MAINTENANCE').length;
  const warrantyExpiringSoon = assets.filter(a => {
    if (!a.warrantyExpiry) return false;
    const expiry = new Date(a.warrantyExpiry);
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return expiry.getTime() - now.getTime() < thirtyDays && expiry > now;
  }).length;

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      UNDER_MAINTENANCE: 'bg-yellow-100 text-yellow-800',
      DISPOSED: 'bg-red-100 text-red-800',
      TRANSFERRED: 'bg-blue-100 text-blue-800',
      LOST: 'bg-slate-100 text-slate-800',
    };
    return <Badge className={colors[status]}>{status.replace('_', ' ')}</Badge>;
  };

  const getConditionBadge = (condition: string) => {
    const colors: Record<string, string> = {
      EXCELLENT: 'bg-green-500 text-white',
      GOOD: 'bg-blue-500 text-white',
      FAIR: 'bg-yellow-500 text-white',
      POOR: 'bg-red-500 text-white',
    };
    return <Badge className={colors[condition]}>{condition}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Asset Management</h1>
          <p className="text-slate-600">Track and manage hospital assets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAssets}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Assets</p>
                <p className="text-2xl font-bold text-blue-600">{assets.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Value</p>
                <p className="text-2xl font-bold text-green-600">₹{(totalValue / 100000).toFixed(1)}L</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Under Maintenance</p>
                <p className="text-2xl font-bold text-yellow-600">{underMaintenance}</p>
              </div>
              <Wrench className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Warranty Expiring</p>
                <p className="text-2xl font-bold text-red-600">{warrantyExpiringSoon}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, code, or serial number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                <SelectItem value="DISPOSED">Disposed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Asset List */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4">Asset</th>
                <th className="text-left p-4">Location</th>
                <th className="text-left p-4">Value</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Condition</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="border-t hover:bg-slate-50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-sm text-slate-500">{asset.assetCode}</p>
                      <p className="text-xs text-slate-400">{asset.manufacturer} {asset.model}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm">{asset.location}</p>
                        <p className="text-xs text-slate-500">{asset.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium">₹{asset.currentValue.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">
                      Purchase: ₹{asset.purchasePrice.toLocaleString()}
                    </p>
                  </td>
                  <td className="p-4">{getStatusBadge(asset.status)}</td>
                  <td className="p-4">{getConditionBadge(asset.condition)}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAsset(asset);
                          setShowTransferDialog(true);
                        }}
                      >
                        Transfer
                      </Button>
                      <Button size="sm" variant="outline">
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Depreciation Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Depreciation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Total Purchase Value</p>
              <p className="text-2xl font-bold text-blue-800">
                ₹{assets.reduce((sum, a) => sum + a.purchasePrice, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Current Book Value</p>
              <p className="text-2xl font-bold text-green-800">₹{totalValue.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-600">Total Depreciation</p>
              <p className="text-2xl font-bold text-orange-800">₹{totalDepreciation.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Asset Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Asset Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Philips Patient Monitor"
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: Asset['category']) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sub-Category</Label>
              <Select
                value={formData.subCategory}
                onValueChange={(value) => setFormData({ ...formData, subCategory: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.find(c => c.value === formData.category)?.subCategories.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Input
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              />
            </div>
            <div>
              <Label>Model</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </div>
            <div>
              <Label>Purchase Date *</Label>
              <Input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Purchase Price (₹) *</Label>
              <Input
                type="number"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Depreciation Rate (%)</Label>
              <Input
                type="number"
                value={formData.depreciationRate}
                onChange={(e) => setFormData({ ...formData, depreciationRate: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Location *</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., ICU Room 5"
              />
            </div>
            <div>
              <Label>Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Warranty Expiry</Label>
              <Input
                type="date"
                value={formData.warrantyExpiry}
                onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddAsset}>Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Asset</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedAsset.name}</p>
                <p className="text-sm text-slate-600">
                  Current: {selectedAsset.location} ({selectedAsset.department})
                </p>
              </div>
              <div>
                <Label>New Location *</Label>
                <Input
                  value={transferData.toLocation}
                  onChange={(e) => setTransferData({ ...transferData, toLocation: e.target.value })}
                  placeholder="e.g., OPD Room 3"
                />
              </div>
              <div>
                <Label>New Department *</Label>
                <Select
                  value={transferData.toDepartment}
                  onValueChange={(value) => setTransferData({ ...transferData, toDepartment: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason for Transfer</Label>
                <Textarea
                  value={transferData.reason}
                  onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                  placeholder="Reason for transfer..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
            <Button onClick={handleTransfer}>Confirm Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
