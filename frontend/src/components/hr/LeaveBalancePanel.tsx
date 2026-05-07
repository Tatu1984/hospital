// Leave-balance panel for the HR page. Shows entitled / used / available
// per employee + leave-type for the chosen year, plus an inline form
// to seed a new entitlement (admins only — gated by 'leaves:approve').

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Wallet } from 'lucide-react';
import api from '../../services/api';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  department?: string | null;
}

interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveType: string;
  year: number;
  entitled: number;
  used: number;
  carriedFwd: number;
  encashable: number | null;
  available: number;
  remarks?: string | null;
}

const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual (CL)' },
  { value: 'sick', label: 'Sick (SL)' },
  { value: 'earned', label: 'Earned / Privilege (EL/PL)' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'paternity', label: 'Paternity' },
  { value: 'compoff', label: 'Comp-off' },
  { value: 'lop', label: 'Loss of Pay (LOP)' },
];

export default function LeaveBalancePanel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  // Add-balance form state
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    employeeId: '',
    leaveType: 'casual',
    entitled: '12',
    carriedFwd: '0',
  });

  async function load() {
    try {
      setLoading(true);
      const [eRes, bRes] = await Promise.all([
        api.get('/api/hr/employees'),
        api.get('/api/hr/leave-balances', { params: { year } }),
      ]);
      setEmployees(eRes.data);
      setBalances(bRes.data);
    } catch (e: any) {
      console.error('Load leave balances failed', e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [year]);

  async function saveBalance() {
    if (!form.employeeId || !form.entitled) {
      alert('Pick an employee and enter the entitlement');
      return;
    }
    setAdding(true);
    try {
      await api.post('/api/hr/leave-balances', {
        employeeId: form.employeeId,
        leaveType: form.leaveType,
        year,
        entitled: Number(form.entitled),
        carriedFwd: Number(form.carriedFwd || 0),
      });
      setForm({ employeeId: '', leaveType: 'casual', entitled: '12', carriedFwd: '0' });
      void load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to save balance');
    } finally {
      setAdding(false);
    }
  }

  // Group by employee for the display
  const empById = Object.fromEntries(employees.map((e) => [e.id, e]));
  const grouped: Record<string, LeaveBalance[]> = {};
  for (const b of balances) {
    (grouped[b.employeeId] = grouped[b.employeeId] || []).push(b);
  }

  return (
    <div className="space-y-4">
      {/* Year selector + add form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            Leave entitlement for year
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs text-slate-500">Year</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[year - 1, year, year + 1].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs text-slate-500">Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee…" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.employeeId} — {e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Leave type</Label>
              <Select value={form.leaveType} onValueChange={(v) => setForm({ ...form, leaveType: v })}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Entitled (days)</Label>
              <Input
                type="number" step="0.5" className="w-24"
                value={form.entitled}
                onChange={(e) => setForm({ ...form, entitled: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Carry fwd</Label>
              <Input
                type="number" step="0.5" className="w-24"
                value={form.carriedFwd}
                onChange={(e) => setForm({ ...form, carriedFwd: e.target.value })}
              />
            </div>
            <Button onClick={saveBalance} disabled={adding} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> {adding ? 'Saving…' : 'Set entitlement'}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Sets the annual entitlement for one employee + leave-type. Re-runs are idempotent —
            running it again with a different number updates the existing row.
          </p>
        </CardContent>
      </Card>

      {/* Balance table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Balances ({balances.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500 py-4 text-center">Loading…</p>
          ) : balances.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No leave balances configured yet for {year}. Use the form above to seed entitlements.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave type</TableHead>
                    <TableHead className="text-right">Entitled</TableHead>
                    <TableHead className="text-right">Carry fwd</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(grouped).map(([empId, list]) => (
                    list.map((b, idx) => (
                      <TableRow key={b.id}>
                        {idx === 0 && (
                          <TableCell rowSpan={list.length} className="align-top font-medium">
                            {empById[empId]?.employeeId} — {empById[empId]?.name}
                            {empById[empId]?.department && (
                              <div className="text-xs text-slate-500">{empById[empId]?.department}</div>
                            )}
                          </TableCell>
                        )}
                        <TableCell>{b.leaveType}</TableCell>
                        <TableCell className="text-right">{b.entitled}</TableCell>
                        <TableCell className="text-right text-slate-500">{b.carriedFwd || '—'}</TableCell>
                        <TableCell className="text-right">{b.used}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={b.available > 0 ? 'secondary' : 'outline'}
                            className={b.available < 0 ? 'bg-red-100 text-red-700' : ''}>
                            {b.available.toFixed(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
