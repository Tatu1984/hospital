import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/Toast';
import {
  Wind,
  Plus,
  Search,
  RefreshCw,
  Package,
  Thermometer,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Square,
  Edit,
  Trash2,
  FileText,
  Settings,
  BarChart3,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Instrument {
  id: string;
  instrumentCode: string;
  name: string;
  type: string;
  category: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  condition?: string;
  status: string;
  location?: string;
  lastSterilizedAt?: string;
  purchaseDate?: string;
  notes?: string;
}

interface SterilizationCycle {
  id: string;
  cycleNumber: string;
  autoclaveName: string;
  cycleType: string;
  loadType: string;
  temperature: number;
  pressure: number;
  duration: number;
  startTime: string;
  endTime?: string;
  status: string;
  result?: string;
  operatorName: string;
  biologicalIndicator: boolean;
  chemicalIndicator: boolean;
  instruments?: Array<{ instrument: Instrument }>;
  packs?: SterilizationPack[];
}

interface SterilizationPack {
  id: string;
  packCode: string;
  packType: string;
  packName: string;
  contents: any[];
  sterilizedAt: string;
  expiryDate: string;
  status: string;
  issuedTo?: string;
  issuedAt?: string;
  usedAt?: string;
}

interface DashboardStats {
  instruments: {
    total: number;
    byStatus: Record<string, number>;
  };
  cycles: {
    today: number;
    byResult: Record<string, number>;
  };
  packs: {
    available: number;
    expiringSoon: number;
    issuedToday: number;
  };
}

export default function CSSD() {
  const { token } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [_loading, setLoading] = useState(false);

  // Dashboard
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Instruments
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [instrumentSearch, setInstrumentSearch] = useState('');
  const [instrumentFilter, setInstrumentFilter] = useState('all');
  const [showInstrumentDialog, setShowInstrumentDialog] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null);

  // Cycles
  const [cycles, setCycles] = useState<SterilizationCycle[]>([]);
  const [showCycleDialog, setShowCycleDialog] = useState(false);
  const [showCompleteCycleDialog, setShowCompleteCycleDialog] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<SterilizationCycle | null>(null);

  // Packs
  const [packs, setPacks] = useState<SterilizationPack[]>([]);
  const [showPackDialog, setShowPackDialog] = useState(false);
  const [showIssuePackDialog, setShowIssuePackDialog] = useState(false);
  const [selectedPack, setSelectedPack] = useState<SterilizationPack | null>(null);

  // Form states
  const [instrumentForm, setInstrumentForm] = useState({
    name: '',
    type: '',
    category: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    condition: 'good',
    location: '',
    notes: '',
  });

  const [cycleForm, setCycleForm] = useState({
    autoclaveName: '',
    cycleType: 'gravity',
    loadType: 'wrapped',
    temperature: 134,
    pressure: 30,
    duration: 4,
    biologicalIndicator: false,
    chemicalIndicator: true,
    instrumentIds: [] as string[],
    notes: '',
  });

  const [packForm, setPackForm] = useState({
    packType: '',
    packName: '',
    description: '',
    contents: [] as { name: string; quantity: number }[],
    expiryDays: 30,
    cycleId: '',
  });

  const [completeForm, setCompleteForm] = useState({
    result: 'pass',
    biologicalResult: 'pass',
    chemicalResult: 'pass',
    failureReason: '',
    notes: '',
  });

  const [issueForm, setIssueForm] = useState({
    issuedTo: '',
    notes: '',
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Fetch functions
  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cssd/dashboard`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  };

  const fetchInstruments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (instrumentSearch) params.append('search', instrumentSearch);
      if (instrumentFilter !== 'all') params.append('status', instrumentFilter);

      const res = await fetch(`${API_BASE}/api/cssd/instruments?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setInstruments(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch instruments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCycles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/cssd/cycles`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCycles(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch cycles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPacks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/cssd/packs`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPacks(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch packs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchInstruments();
    fetchCycles();
    fetchPacks();
  }, []);

  useEffect(() => {
    if (activeTab === 'instruments') fetchInstruments();
    if (activeTab === 'cycles') fetchCycles();
    if (activeTab === 'packs') fetchPacks();
    if (activeTab === 'dashboard') fetchDashboard();
  }, [activeTab]);

  // Instrument handlers
  const handleSaveInstrument = async () => {
    try {
      const url = editingInstrument
        ? `${API_BASE}/api/cssd/instruments/${editingInstrument.id}`
        : `${API_BASE}/api/cssd/instruments`;
      const method = editingInstrument ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(instrumentForm),
      });

      if (res.ok) {
        toast.success( editingInstrument ? 'Instrument updated' : 'Instrument created');
        setShowInstrumentDialog(false);
        setEditingInstrument(null);
        resetInstrumentForm();
        fetchInstruments();
        fetchDashboard();
      } else {
        const error = await res.json();
        toast.error( error.message || 'Failed to save instrument');
      }
    } catch (err) {
      toast.error( 'Failed to save instrument');
    }
  };

  const handleDeleteInstrument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this instrument?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/cssd/instruments/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        toast.success( 'Instrument deleted');
        fetchInstruments();
        fetchDashboard();
      }
    } catch (err) {
      toast.error( 'Failed to delete instrument');
    }
  };

  const resetInstrumentForm = () => {
    setInstrumentForm({
      name: '',
      type: '',
      category: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      condition: 'good',
      location: '',
      notes: '',
    });
  };

  // Cycle handlers
  const handleStartCycle = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cssd/cycles`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cycleForm),
      });

      if (res.ok) {
        toast.success( 'Sterilization cycle started');
        setShowCycleDialog(false);
        resetCycleForm();
        fetchCycles();
        fetchDashboard();
        fetchInstruments();
      } else {
        const error = await res.json();
        toast.error( error.message || 'Failed to start cycle');
      }
    } catch (err) {
      toast.error( 'Failed to start cycle');
    }
  };

  const handleCompleteCycle = async () => {
    if (!selectedCycle) return;

    try {
      const res = await fetch(`${API_BASE}/api/cssd/cycles/${selectedCycle.id}/complete`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(completeForm),
      });

      if (res.ok) {
        toast.success( 'Cycle completed');
        setShowCompleteCycleDialog(false);
        setSelectedCycle(null);
        fetchCycles();
        fetchDashboard();
        fetchInstruments();
      } else {
        const error = await res.json();
        toast.error( error.message || 'Failed to complete cycle');
      }
    } catch (err) {
      toast.error( 'Failed to complete cycle');
    }
  };

  const handleAbortCycle = async (cycle: SterilizationCycle) => {
    const reason = prompt('Enter reason for aborting the cycle:');
    if (!reason) return;

    try {
      const res = await fetch(`${API_BASE}/api/cssd/cycles/${cycle.id}/abort`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        toast.success( 'Cycle aborted');
        fetchCycles();
        fetchDashboard();
        fetchInstruments();
      }
    } catch (err) {
      toast.error( 'Failed to abort cycle');
    }
  };

  const resetCycleForm = () => {
    setCycleForm({
      autoclaveName: '',
      cycleType: 'gravity',
      loadType: 'wrapped',
      temperature: 134,
      pressure: 30,
      duration: 4,
      biologicalIndicator: false,
      chemicalIndicator: true,
      instrumentIds: [],
      notes: '',
    });
  };

  // Pack handlers
  const handleCreatePack = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cssd/packs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(packForm),
      });

      if (res.ok) {
        toast.success( 'Pack created');
        setShowPackDialog(false);
        resetPackForm();
        fetchPacks();
        fetchDashboard();
      } else {
        const error = await res.json();
        toast.error( error.message || 'Failed to create pack');
      }
    } catch (err) {
      toast.error( 'Failed to create pack');
    }
  };

  const handleIssuePack = async () => {
    if (!selectedPack) return;

    try {
      const res = await fetch(`${API_BASE}/api/cssd/packs/${selectedPack.id}/issue`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(issueForm),
      });

      if (res.ok) {
        toast.success( 'Pack issued');
        setShowIssuePackDialog(false);
        setSelectedPack(null);
        setIssueForm({ issuedTo: '', notes: '' });
        fetchPacks();
        fetchDashboard();
      }
    } catch (err) {
      toast.error( 'Failed to issue pack');
    }
  };

  const handleMarkPackUsed = async (pack: SterilizationPack) => {
    const usedFor = prompt('Enter usage location/purpose:');
    if (!usedFor) return;

    try {
      const res = await fetch(`${API_BASE}/api/cssd/packs/${pack.id}/use`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ usedFor }),
      });

      if (res.ok) {
        toast.success( 'Pack marked as used');
        fetchPacks();
        fetchDashboard();
      }
    } catch (err) {
      toast.error( 'Failed to mark pack as used');
    }
  };

  const resetPackForm = () => {
    setPackForm({
      packType: '',
      packName: '',
      description: '',
      contents: [],
      expiryDays: 30,
      cycleId: '',
    });
  };

  // Helper functions
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-100 text-green-800',
      in_use: 'bg-blue-100 text-blue-800',
      sterilizing: 'bg-yellow-100 text-yellow-800',
      maintenance: 'bg-orange-100 text-orange-800',
      disposed: 'bg-red-100 text-red-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      aborted: 'bg-red-100 text-red-800',
      issued: 'bg-blue-100 text-blue-800',
      used: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getResultIcon = (result?: string) => {
    if (result === 'pass') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (result === 'fail') return <XCircle className="h-4 w-4 text-red-600" />;
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const completedCycles = cycles.filter(c => c.status === 'completed' && c.result === 'pass');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Wind className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">CSSD Management</h1>
            <p className="text-slate-500">Central Sterilization Services Department</p>
          </div>
        </div>
        <Button onClick={() => { fetchDashboard(); fetchInstruments(); fetchCycles(); fetchPacks(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="instruments" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Instruments
          </TabsTrigger>
          <TabsTrigger value="cycles" className="flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            Sterilization
          </TabsTrigger>
          <TabsTrigger value="packs" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Packs
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Instruments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats?.instruments.total || 0}</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {stats?.instruments.byStatus && Object.entries(stats.instruments.byStatus).map(([status, count]) => (
                    <Badge key={status} variant="outline" className="text-xs">
                      {status}: {count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Today's Cycles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats?.cycles.today || 0}</div>
                <div className="flex gap-2 mt-2">
                  {stats?.cycles.byResult.pass && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Pass: {stats.cycles.byResult.pass}
                    </Badge>
                  )}
                  {stats?.cycles.byResult.fail && (
                    <Badge className="bg-red-100 text-red-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      Fail: {stats.cycles.byResult.fail}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Available Packs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{stats?.packs.available || 0}</div>
                <p className="text-sm text-slate-500 mt-1">
                  Issued today: {stats?.packs.issuedToday || 0}
                </p>
              </CardContent>
            </Card>

            <Card className={stats?.packs.expiringSoon ? 'border-orange-300 bg-orange-50' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Expiring Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats?.packs.expiringSoon || 0}</div>
                <p className="text-sm text-slate-500 mt-1">Within 7 days</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
              <Button onClick={() => { setActiveTab('cycles'); setShowCycleDialog(true); }}>
                <Play className="h-4 w-4 mr-2" />
                Start Cycle
              </Button>
              <Button variant="outline" onClick={() => { setActiveTab('instruments'); setShowInstrumentDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Instrument
              </Button>
              <Button variant="outline" onClick={() => { setActiveTab('packs'); setShowPackDialog(true); }}>
                <Package className="h-4 w-4 mr-2" />
                Create Pack
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instruments Tab */}
        <TabsContent value="instruments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Instruments</CardTitle>
                <Button onClick={() => { setEditingInstrument(null); resetInstrumentForm(); setShowInstrumentDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Instrument
                </Button>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by name or code..."
                      value={instrumentSearch}
                      onChange={(e) => setInstrumentSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchInstruments()}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={instrumentFilter} onValueChange={(v) => { setInstrumentFilter(v); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="sterilizing">Sterilizing</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchInstruments}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sterilized</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instruments.map((instrument) => (
                    <TableRow key={instrument.id}>
                      <TableCell className="font-mono text-sm">{instrument.instrumentCode}</TableCell>
                      <TableCell className="font-medium">{instrument.name}</TableCell>
                      <TableCell>{instrument.type}</TableCell>
                      <TableCell>{instrument.category}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(instrument.status)}>
                          {instrument.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {instrument.lastSterilizedAt ? formatDate(instrument.lastSterilizedAt) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingInstrument(instrument);
                              setInstrumentForm({
                                name: instrument.name,
                                type: instrument.type,
                                category: instrument.category,
                                manufacturer: instrument.manufacturer || '',
                                model: instrument.model || '',
                                serialNumber: instrument.serialNumber || '',
                                condition: instrument.condition || 'good',
                                location: instrument.location || '',
                                notes: instrument.notes || '',
                              });
                              setShowInstrumentDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleDeleteInstrument(instrument.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {instruments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No instruments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cycles Tab */}
        <TabsContent value="cycles">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sterilization Cycles</CardTitle>
                <Button onClick={() => { resetCycleForm(); setShowCycleDialog(true); }}>
                  <Play className="h-4 w-4 mr-2" />
                  Start New Cycle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cycle #</TableHead>
                    <TableHead>Autoclave</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Parameters</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cycles.map((cycle) => (
                    <TableRow key={cycle.id}>
                      <TableCell className="font-mono text-sm">{cycle.cycleNumber}</TableCell>
                      <TableCell>{cycle.autoclaveName}</TableCell>
                      <TableCell>{cycle.cycleType}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-slate-600">{cycle.temperature}°C</span>
                          <span className="mx-1">/</span>
                          <span className="text-slate-600">{cycle.pressure} PSI</span>
                          <span className="mx-1">/</span>
                          <span className="text-slate-600">{cycle.duration} min</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(cycle.startTime)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(cycle.status)}>
                          {cycle.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getResultIcon(cycle.result)}
                          <span className="capitalize">{cycle.result || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cycle.status === 'in_progress' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedCycle(cycle);
                                setCompleteForm({
                                  result: 'pass',
                                  biologicalResult: 'pass',
                                  chemicalResult: 'pass',
                                  failureReason: '',
                                  notes: '',
                                });
                                setShowCompleteCycleDialog(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAbortCycle(cycle)}
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {cycles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No sterilization cycles found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Packs Tab */}
        <TabsContent value="packs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sterilization Packs</CardTitle>
                <Button onClick={() => { resetPackForm(); setShowPackDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Pack
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pack Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Sterilized</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packs.map((pack) => (
                    <TableRow key={pack.id} className={isExpiringSoon(pack.expiryDate) ? 'bg-orange-50' : ''}>
                      <TableCell className="font-mono text-sm">{pack.packCode}</TableCell>
                      <TableCell>{pack.packType}</TableCell>
                      <TableCell className="font-medium">{pack.packName}</TableCell>
                      <TableCell>{formatDate(pack.sterilizedAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {formatDate(pack.expiryDate)}
                          {isExpiringSoon(pack.expiryDate) && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(pack.status)}>
                          {pack.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pack.status === 'available' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPack(pack);
                                setShowIssuePackDialog(true);
                              }}
                            >
                              Issue
                            </Button>
                          </div>
                        )}
                        {pack.status === 'issued' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkPackUsed(pack)}
                          >
                            Mark Used
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {packs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No packs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Expiring Packs
                </CardTitle>
                <CardDescription>Packs expiring within the next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {packs.filter(p => p.status === 'available' && isExpiringSoon(p.expiryDate)).length > 0 ? (
                  <div className="space-y-2">
                    {packs
                      .filter(p => p.status === 'available' && isExpiringSoon(p.expiryDate))
                      .map(pack => (
                        <div key={pack.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div>
                            <p className="font-medium">{pack.packName}</p>
                            <p className="text-sm text-slate-500">{pack.packCode}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-orange-600 font-medium">
                              Expires: {new Date(pack.expiryDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-4">No packs expiring soon</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Pending Sterilization
                </CardTitle>
                <CardDescription>Instruments needing sterilization</CardDescription>
              </CardHeader>
              <CardContent>
                {instruments.filter(i => i.status === 'available' && !i.lastSterilizedAt).length > 0 ? (
                  <div className="space-y-2">
                    {instruments
                      .filter(i => i.status === 'available' && !i.lastSterilizedAt)
                      .slice(0, 10)
                      .map(instrument => (
                        <div key={instrument.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium">{instrument.name}</p>
                            <p className="text-sm text-slate-500">{instrument.instrumentCode}</p>
                          </div>
                          <Badge variant="outline">Never sterilized</Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-4">All instruments are sterilized</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Instrument Dialog */}
      <Dialog open={showInstrumentDialog} onOpenChange={setShowInstrumentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingInstrument ? 'Edit Instrument' : 'Add New Instrument'}</DialogTitle>
            <DialogDescription>Enter the instrument details</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={instrumentForm.name}
                onChange={(e) => setInstrumentForm({ ...instrumentForm, name: e.target.value })}
                placeholder="Instrument name"
              />
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={instrumentForm.type} onValueChange={(v) => setInstrumentForm({ ...instrumentForm, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surgical">Surgical</SelectItem>
                  <SelectItem value="diagnostic">Diagnostic</SelectItem>
                  <SelectItem value="dental">Dental</SelectItem>
                  <SelectItem value="ophthalmic">Ophthalmic</SelectItem>
                  <SelectItem value="orthopedic">Orthopedic</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={instrumentForm.category} onValueChange={(v) => setInstrumentForm({ ...instrumentForm, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="forceps">Forceps</SelectItem>
                  <SelectItem value="scissors">Scissors</SelectItem>
                  <SelectItem value="clamps">Clamps</SelectItem>
                  <SelectItem value="retractors">Retractors</SelectItem>
                  <SelectItem value="needles">Needles</SelectItem>
                  <SelectItem value="scalpels">Scalpels</SelectItem>
                  <SelectItem value="probes">Probes</SelectItem>
                  <SelectItem value="speculums">Speculums</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Input
                value={instrumentForm.manufacturer}
                onChange={(e) => setInstrumentForm({ ...instrumentForm, manufacturer: e.target.value })}
                placeholder="Manufacturer"
              />
            </div>
            <div>
              <Label>Model</Label>
              <Input
                value={instrumentForm.model}
                onChange={(e) => setInstrumentForm({ ...instrumentForm, model: e.target.value })}
                placeholder="Model number"
              />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input
                value={instrumentForm.serialNumber}
                onChange={(e) => setInstrumentForm({ ...instrumentForm, serialNumber: e.target.value })}
                placeholder="Serial number"
              />
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={instrumentForm.condition} onValueChange={(v) => setInstrumentForm({ ...instrumentForm, condition: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="needs_repair">Needs Repair</SelectItem>
                  <SelectItem value="condemned">Condemned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={instrumentForm.location}
                onChange={(e) => setInstrumentForm({ ...instrumentForm, location: e.target.value })}
                placeholder="Storage location"
              />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={instrumentForm.notes}
                onChange={(e) => setInstrumentForm({ ...instrumentForm, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstrumentDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveInstrument}>
              {editingInstrument ? 'Update' : 'Create'} Instrument
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Cycle Dialog */}
      <Dialog open={showCycleDialog} onOpenChange={setShowCycleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Start Sterilization Cycle</DialogTitle>
            <DialogDescription>Configure and start a new sterilization cycle</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Autoclave *</Label>
              <Input
                value={cycleForm.autoclaveName}
                onChange={(e) => setCycleForm({ ...cycleForm, autoclaveName: e.target.value })}
                placeholder="Autoclave name/number"
              />
            </div>
            <div>
              <Label>Cycle Type *</Label>
              <Select value={cycleForm.cycleType} onValueChange={(v) => setCycleForm({ ...cycleForm, cycleType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gravity">Gravity Displacement</SelectItem>
                  <SelectItem value="prevacuum">Pre-vacuum</SelectItem>
                  <SelectItem value="flash">Flash Sterilization</SelectItem>
                  <SelectItem value="ETO">Ethylene Oxide (ETO)</SelectItem>
                  <SelectItem value="plasma">Hydrogen Peroxide Plasma</SelectItem>
                  <SelectItem value="dry_heat">Dry Heat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Load Type *</Label>
              <Select value={cycleForm.loadType} onValueChange={(v) => setCycleForm({ ...cycleForm, loadType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wrapped">Wrapped</SelectItem>
                  <SelectItem value="unwrapped">Unwrapped</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Temperature (°C) *</Label>
              <Input
                type="number"
                value={cycleForm.temperature}
                onChange={(e) => setCycleForm({ ...cycleForm, temperature: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Pressure (PSI) *</Label>
              <Input
                type="number"
                value={cycleForm.pressure}
                onChange={(e) => setCycleForm({ ...cycleForm, pressure: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Duration (minutes) *</Label>
              <Input
                type="number"
                value={cycleForm.duration}
                onChange={(e) => setCycleForm({ ...cycleForm, duration: parseInt(e.target.value) })}
              />
            </div>
            <div className="col-span-2 flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cycleForm.biologicalIndicator}
                  onChange={(e) => setCycleForm({ ...cycleForm, biologicalIndicator: e.target.checked })}
                  className="rounded"
                />
                Biological Indicator
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cycleForm.chemicalIndicator}
                  onChange={(e) => setCycleForm({ ...cycleForm, chemicalIndicator: e.target.checked })}
                  className="rounded"
                />
                Chemical Indicator
              </label>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={cycleForm.notes}
                onChange={(e) => setCycleForm({ ...cycleForm, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCycleDialog(false)}>Cancel</Button>
            <Button onClick={handleStartCycle}>
              <Play className="h-4 w-4 mr-2" />
              Start Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Cycle Dialog */}
      <Dialog open={showCompleteCycleDialog} onOpenChange={setShowCompleteCycleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Sterilization Cycle</DialogTitle>
            <DialogDescription>Record the cycle results</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Overall Result *</Label>
              <Select value={completeForm.result} onValueChange={(v) => setCompleteForm({ ...completeForm, result: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedCycle?.biologicalIndicator && (
              <div>
                <Label>Biological Indicator Result</Label>
                <Select value={completeForm.biologicalResult} onValueChange={(v) => setCompleteForm({ ...completeForm, biologicalResult: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedCycle?.chemicalIndicator && (
              <div>
                <Label>Chemical Indicator Result</Label>
                <Select value={completeForm.chemicalResult} onValueChange={(v) => setCompleteForm({ ...completeForm, chemicalResult: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {completeForm.result === 'fail' && (
              <div>
                <Label>Failure Reason *</Label>
                <Textarea
                  value={completeForm.failureReason}
                  onChange={(e) => setCompleteForm({ ...completeForm, failureReason: e.target.value })}
                  placeholder="Describe the failure reason"
                  rows={2}
                />
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={completeForm.notes}
                onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteCycleDialog(false)}>Cancel</Button>
            <Button onClick={handleCompleteCycle}>Complete Cycle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Pack Dialog */}
      <Dialog open={showPackDialog} onOpenChange={setShowPackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sterilization Pack</DialogTitle>
            <DialogDescription>Create a new pack from a completed cycle</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sterilization Cycle *</Label>
              <Select value={packForm.cycleId} onValueChange={(v) => setPackForm({ ...packForm, cycleId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select completed cycle" />
                </SelectTrigger>
                <SelectContent>
                  {completedCycles.map(cycle => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.cycleNumber} - {formatDate(cycle.endTime || cycle.startTime)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pack Type *</Label>
              <Select value={packForm.packType} onValueChange={(v) => setPackForm({ ...packForm, packType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pack type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surgical_set">Surgical Set</SelectItem>
                  <SelectItem value="dressing_set">Dressing Set</SelectItem>
                  <SelectItem value="delivery_set">Delivery Set</SelectItem>
                  <SelectItem value="minor_procedure">Minor Procedure Set</SelectItem>
                  <SelectItem value="suture_set">Suture Removal Set</SelectItem>
                  <SelectItem value="catheter_set">Catheterization Set</SelectItem>
                  <SelectItem value="wound_care">Wound Care Set</SelectItem>
                  <SelectItem value="custom">Custom Set</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pack Name *</Label>
              <Input
                value={packForm.packName}
                onChange={(e) => setPackForm({ ...packForm, packName: e.target.value })}
                placeholder="e.g., General Surgery Pack #1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={packForm.description}
                onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
                placeholder="Pack contents description"
                rows={2}
              />
            </div>
            <div>
              <Label>Expiry Days</Label>
              <Input
                type="number"
                value={packForm.expiryDays}
                onChange={(e) => setPackForm({ ...packForm, expiryDays: parseInt(e.target.value) })}
                min={1}
                max={365}
              />
              <p className="text-sm text-slate-500 mt-1">Pack will expire after {packForm.expiryDays} days</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePack}>Create Pack</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Pack Dialog */}
      <Dialog open={showIssuePackDialog} onOpenChange={setShowIssuePackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Pack</DialogTitle>
            <DialogDescription>Issue pack {selectedPack?.packCode} to a department</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Issue To *</Label>
              <Select value={issueForm.issuedTo} onValueChange={(v) => setIssueForm({ ...issueForm, issuedTo: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operation_theatre">Operation Theatre</SelectItem>
                  <SelectItem value="emergency">Emergency Department</SelectItem>
                  <SelectItem value="icu">ICU</SelectItem>
                  <SelectItem value="labor_room">Labor Room</SelectItem>
                  <SelectItem value="ward_a">Ward A</SelectItem>
                  <SelectItem value="ward_b">Ward B</SelectItem>
                  <SelectItem value="opd">OPD</SelectItem>
                  <SelectItem value="dressing_room">Dressing Room</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={issueForm.notes}
                onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssuePackDialog(false)}>Cancel</Button>
            <Button onClick={handleIssuePack}>Issue Pack</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
