import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus, Search, MoreVertical, Eye, Edit, Trash2, Wrench, Power, RotateCcw, AlertCircle, Wrench as WrenchIcon,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';

interface Asset {
  id: string;
  name: string;
  assetCode: string;
  category: string;
  location: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  amcVendor: string | null;
  amcExpiry: string | null;
  status: string;
  isActive: boolean;
  _count?: { maintenanceLogs: number };
}

interface MaintenanceLog {
  id: string;
  maintenanceType: string;
  scheduledDate: string | null;
  completedDate: string | null;
  technician: string | null;
  findings: string | null;
  actionTaken: string | null;
  status: string;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', tone: 'bg-emerald-100 text-emerald-800' },
  { value: 'under_maintenance', label: 'Under Maintenance', tone: 'bg-amber-100 text-amber-800' },
  { value: 'out_of_order', label: 'Out of Order', tone: 'bg-red-100 text-red-800' },
  { value: 'retired', label: 'Retired', tone: 'bg-slate-200 text-slate-700' },
];

const CATEGORY_OPTIONS = [
  'Medical Equipment', 'Diagnostic', 'Surgical', 'ICU', 'Laboratory', 'Radiology',
  'Office Equipment', 'IT / Computing', 'Furniture', 'Vehicle', 'Other',
];

function statusBadge(status: string) {
  const s = STATUS_OPTIONS.find((o) => o.value === status);
  return (
    <Badge className={`${s?.tone || 'bg-slate-100 text-slate-700'} border-0`}>
      {s?.label || status}
    </Badge>
  );
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.results)) return o.results as T[];
  }
  return [];
}

const emptyForm = {
  name: '',
  assetCode: '',
  category: '',
  location: '',
  purchaseDate: '',
  warrantyExpiry: '',
  amcVendor: '',
  amcExpiry: '',
  status: 'active',
};

export default function AssetManagement() {
  const toast = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);

  const [selected, setSelected] = useState<Asset | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [logForm, setLogForm] = useState({
    maintenanceType: '',
    scheduledDate: '',
    completedDate: '',
    technician: '',
    findings: '',
    actionTaken: '',
  });

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/assets');
      setAssets(toArray<Asset>(res.data));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.assetCode.toLowerCase().includes(q) ||
        (a.category || '').toLowerCase().includes(q) ||
        (a.location || '').toLowerCase().includes(q)
      );
    });
  }, [assets, search, statusFilter]);

  const stats = useMemo(() => {
    const total = assets.length;
    const active = assets.filter((a) => a.status === 'active').length;
    const maint = assets.filter((a) => a.status === 'under_maintenance').length;
    const retired = assets.filter((a) => a.status === 'retired').length;
    return { total, active, maint, retired };
  }, [assets]);

  const openCreate = () => {
    setForm({ ...emptyForm });
    setCreateOpen(true);
  };

  const openEdit = (a: Asset) => {
    setSelected(a);
    setForm({
      name: a.name || '',
      assetCode: a.assetCode || '',
      category: a.category || '',
      location: a.location || '',
      purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0, 10) : '',
      warrantyExpiry: a.warrantyExpiry ? a.warrantyExpiry.slice(0, 10) : '',
      amcVendor: a.amcVendor || '',
      amcExpiry: a.amcExpiry ? a.amcExpiry.slice(0, 10) : '',
      status: a.status || 'active',
    });
    setEditOpen(true);
  };

  const openView = async (a: Asset) => {
    setSelected(a);
    setViewOpen(true);
    try {
      const res = await api.get(`/api/assets/${a.id}/maintenance`);
      setLogs(toArray<MaintenanceLog>(res.data));
    } catch {
      setLogs([]);
    }
  };

  const openMaintenance = (a: Asset) => {
    setSelected(a);
    setLogForm({
      maintenanceType: '',
      scheduledDate: '',
      completedDate: '',
      technician: '',
      findings: '',
      actionTaken: '',
    });
    setMaintenanceOpen(true);
  };

  const errMsg = (e: any, fallback: string) =>
    e?.response?.data?.error || e?.message || fallback;

  const onCreate = async () => {
    if (!form.name || !form.category) {
      toast.warning('Missing fields', 'Name and category are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/assets', {
        ...form,
        purchaseDate: form.purchaseDate || null,
        warrantyExpiry: form.warrantyExpiry || null,
        amcExpiry: form.amcExpiry || null,
      });
      await loadAssets();
      setCreateOpen(false);
      toast.success('Asset added', form.name);
    } catch (e: any) {
      toast.error('Could not add asset', errMsg(e, 'Try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.put(`/api/assets/${selected.id}`, {
        ...form,
        purchaseDate: form.purchaseDate || null,
        warrantyExpiry: form.warrantyExpiry || null,
        amcExpiry: form.amcExpiry || null,
      });
      await loadAssets();
      setEditOpen(false);
      toast.success('Asset updated', form.name);
    } catch (e: any) {
      toast.error('Could not update asset', errMsg(e, 'Try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/assets/${selected.id}`);
      await loadAssets();
      setDeleteOpen(false);
      toast.success('Asset deleted', selected.name);
    } catch (e: any) {
      toast.error('Could not delete', errMsg(e, 'Try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const onChangeStatus = async (a: Asset, status: string) => {
    try {
      await api.post(`/api/assets/${a.id}/status`, { status });
      await loadAssets();
      toast.success('Status changed', `${a.name} → ${status.replace('_', ' ')}`);
    } catch (e: any) {
      toast.error('Could not change status', errMsg(e, 'Try again.'));
    }
  };

  const onAddMaintenance = async () => {
    if (!selected || !logForm.maintenanceType) {
      toast.warning('Missing field', 'Maintenance type is required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/assets/${selected.id}/maintenance`, {
        ...logForm,
        scheduledDate: logForm.scheduledDate || null,
        completedDate: logForm.completedDate || null,
      });
      if (!logForm.completedDate && selected.status === 'active') {
        await api.post(`/api/assets/${selected.id}/status`, { status: 'under_maintenance' });
      }
      await loadAssets();
      setMaintenanceOpen(false);
      toast.success('Maintenance logged', logForm.maintenanceType);
    } catch (e: any) {
      toast.error('Could not save maintenance', errMsg(e, 'Try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Management</h1>
          <p className="text-sm text-slate-500">Hospital equipment and asset registry</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Asset
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-emerald-600">Active</p>
          <p className="text-2xl font-bold mt-1">{stats.active}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-amber-600">Under Maintenance</p>
          <p className="text-2xl font-bold mt-1">{stats.maint}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Retired</p>
          <p className="text-2xl font-bold mt-1">{stats.retired}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Asset Registry</CardTitle>
              <CardDescription>Search, filter, and manage all hospital assets</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, code, category, location"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-72"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead>AMC</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-slate-500">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-slate-500">
                  {assets.length === 0 ? 'No assets yet — click "Add Asset".' : 'No results match your filter.'}
                </TableCell></TableRow>
              ) : (
                filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.assetCode}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.category}</TableCell>
                    <TableCell>{a.location || '—'}</TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                    <TableCell>
                      {a.warrantyExpiry ? new Date(a.warrantyExpiry).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {a.amcVendor || '—'}
                      {a.amcExpiry ? <div className="text-slate-500">until {new Date(a.amcExpiry).toLocaleDateString()}</div> : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openView(a)}>
                            <Eye className="w-4 h-4 mr-2" /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(a)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openMaintenance(a)}>
                            <Wrench className="w-4 h-4 mr-2" /> Log maintenance
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-slate-500">Change status</DropdownMenuLabel>
                          {STATUS_OPTIONS.filter((s) => s.value !== a.status).map((s) => (
                            <DropdownMenuItem
                              key={s.value}
                              onClick={() => onChangeStatus(a, s.value)}
                            >
                              {s.value === 'active' ? <Power className="w-4 h-4 mr-2" /> :
                               s.value === 'under_maintenance' ? <WrenchIcon className="w-4 h-4 mr-2" /> :
                               s.value === 'retired' ? <RotateCcw className="w-4 h-4 mr-2" /> :
                               <AlertCircle className="w-4 h-4 mr-2" />}
                              {s.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => { setSelected(a); setDeleteOpen(true); }}
                            className="text-red-600 focus:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE / EDIT — same form */}
      <Dialog open={createOpen || editOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditOpen(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editOpen ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
            <DialogDescription>
              {editOpen ? 'Update the asset details below.' : 'Register a new asset in the registry.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2 col-span-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Ventilator X-200" />
            </div>
            <div className="space-y-2">
              <Label>Asset Code</Label>
              <Input
                value={form.assetCode}
                onChange={(e) => setForm({ ...form, assetCode: e.target.value })}
                placeholder="auto-generated if empty"
                disabled={editOpen}
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., ICU Bay 3" />
            </div>
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Warranty Expiry</Label>
              <Input type="date" value={form.warrantyExpiry} onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>AMC Vendor</Label>
              <Input value={form.amcVendor} onChange={(e) => setForm({ ...form, amcVendor: e.target.value })} placeholder="e.g., MedTech Services" />
            </div>
            <div className="space-y-2">
              <Label>AMC Expiry</Label>
              <Input type="date" value={form.amcExpiry} onChange={(e) => setForm({ ...form, amcExpiry: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditOpen(false); }} disabled={submitting}>Cancel</Button>
            <Button onClick={editOpen ? onEdit : onCreate} disabled={submitting}>
              {submitting ? 'Saving…' : (editOpen ? 'Save Changes' : 'Add Asset')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name || 'Asset Details'}</DialogTitle>
            <DialogDescription>{selected?.assetCode}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium text-slate-500">Category:</span> {selected.category}</div>
                <div><span className="font-medium text-slate-500">Status:</span> {statusBadge(selected.status)}</div>
                <div><span className="font-medium text-slate-500">Location:</span> {selected.location || '—'}</div>
                <div><span className="font-medium text-slate-500">Purchase:</span> {selected.purchaseDate ? new Date(selected.purchaseDate).toLocaleDateString() : '—'}</div>
                <div><span className="font-medium text-slate-500">Warranty:</span> {selected.warrantyExpiry ? new Date(selected.warrantyExpiry).toLocaleDateString() : '—'}</div>
                <div><span className="font-medium text-slate-500">AMC Vendor:</span> {selected.amcVendor || '—'}</div>
                <div><span className="font-medium text-slate-500">AMC Expiry:</span> {selected.amcExpiry ? new Date(selected.amcExpiry).toLocaleDateString() : '—'}</div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Maintenance History</h3>
                {logs.length === 0 ? (
                  <p className="text-sm text-slate-500">No maintenance logs yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {logs.map((l) => (
                      <div key={l.id} className="border rounded-md p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{l.maintenanceType}</span>
                          <Badge variant="outline">{l.status}</Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {l.scheduledDate && <>Scheduled: {new Date(l.scheduledDate).toLocaleDateString()} · </>}
                          {l.completedDate && <>Completed: {new Date(l.completedDate).toLocaleDateString()} · </>}
                          {l.technician && <>Tech: {l.technician}</>}
                        </div>
                        {l.findings && <div className="mt-1"><span className="font-medium">Findings:</span> {l.findings}</div>}
                        {l.actionTaken && <div><span className="font-medium">Action:</span> {l.actionTaken}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            {selected && (
              <Button onClick={() => { setViewOpen(false); openMaintenance(selected); }} className="gap-2">
                <Wrench className="w-4 h-4" /> Log Maintenance
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MAINTENANCE LOG */}
      <Dialog open={maintenanceOpen} onOpenChange={setMaintenanceOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Log Maintenance</DialogTitle>
            <DialogDescription>{selected?.name} ({selected?.assetCode})</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2 col-span-2">
              <Label>Type *</Label>
              <Input
                value={logForm.maintenanceType}
                onChange={(e) => setLogForm({ ...logForm, maintenanceType: e.target.value })}
                placeholder="e.g., Quarterly preventive, Calibration, Repair"
              />
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input type="date" value={logForm.scheduledDate} onChange={(e) => setLogForm({ ...logForm, scheduledDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Completed Date</Label>
              <Input type="date" value={logForm.completedDate} onChange={(e) => setLogForm({ ...logForm, completedDate: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Technician</Label>
              <Input value={logForm.technician} onChange={(e) => setLogForm({ ...logForm, technician: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Findings</Label>
              <Textarea value={logForm.findings} onChange={(e) => setLogForm({ ...logForm, findings: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Action Taken</Label>
              <Textarea value={logForm.actionTaken} onChange={(e) => setLogForm({ ...logForm, actionTaken: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={onAddMaintenance} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Log'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Asset?</DialogTitle>
            <DialogDescription>
              {selected?.name} ({selected?.assetCode}) will be removed from the registry.
              Maintenance logs are preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={onDelete} disabled={submitting} className="bg-red-600 hover:bg-red-700">
              {submitting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
