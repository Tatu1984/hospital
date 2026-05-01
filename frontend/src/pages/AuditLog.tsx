import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { RefreshCw, Search, AlertCircle, Shield } from 'lucide-react';
import api from '../services/api';

interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

const MODULES = [
  'all', 'Authentication', 'Patient', 'Encounter', 'Invoice', 'Admission',
  'Surgery', 'Lab', 'Radiology', 'Pharmacy', 'BloodBank', 'Asset',
  'User', 'System',
];

function actionTone(action: string) {
  const a = (action || '').toLowerCase();
  if (a.includes('login_failed') || a.includes('access_denied') || a.includes('rate_limit'))
    return 'bg-red-100 text-red-800 border-0';
  if (a.includes('login_success') || a.includes('create') || a.includes('add'))
    return 'bg-emerald-100 text-emerald-800 border-0';
  if (a.includes('update') || a.includes('edit')) return 'bg-amber-100 text-amber-800 border-0';
  if (a.includes('delete') || a.includes('logout')) return 'bg-slate-200 text-slate-800 border-0';
  return 'bg-blue-100 text-blue-800 border-0';
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.data)) return o.data as T[];
  }
  return [];
}

const DEFAULT_LIMIT = 100;

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { limit: DEFAULT_LIMIT, page };
      if (moduleFilter && moduleFilter !== 'all') params.module = moduleFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.get('/api/audit-logs', { params });
      setLogs(toArray<AuditLogEntry>(res.data));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load audit log');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter, dateFrom, dateTo, page]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) =>
      (l.action || '').toLowerCase().includes(q) ||
      (l.userName || '').toLowerCase().includes(q) ||
      (l.module || '').toLowerCase().includes(q) ||
      (l.details || '').toLowerCase().includes(q) ||
      (l.ipAddress || '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" /> Audit Log
          </h1>
          <p className="text-sm text-slate-500">
            Append-only record of who did what, when. Tenant-scoped.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Narrow down the log to find specific events.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search (free text)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="action, user, ip…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Module</Label>
              <Select value={moduleFilter} onValueChange={(v) => { setPage(1); setModuleFilter(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODULES.map((m) => (
                    <SelectItem key={m} value={m}>{m === 'all' ? 'All modules' : m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Events</CardTitle>
              <CardDescription>
                {loading ? 'Loading…' : `${filtered.length} of ${logs.length} on this page`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Badge variant="secondary" className="self-center">Page {page}</Badge>
              <Button variant="outline" disabled={loading || logs.length < DEFAULT_LIMIT} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-500">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-500">
                    No events match these filters.
                  </TableCell></TableRow>
                ) : (
                  filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-xs text-slate-600">
                        {new Date(l.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">{l.userName || '—'}</TableCell>
                      <TableCell>
                        <Badge className={actionTone(l.action)}>{l.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{l.module || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-md">{l.details || '—'}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-500">{l.ipAddress}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
