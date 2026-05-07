// Payroll panel — runs payroll for a given month, shows the resulting
// payslips with full attendance breakdown (worked / paid-leave / LOP)
// and per-employee earned-gross + deductions + net pay. The Run button
// generates payslips in 'draft' status; Mark Paid finalizes them after
// disbursement reconciliation.

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calculator, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '../../services/api';

interface Payslip {
  id: string;
  payslipNumber: string;
  employeeId: string;
  employeeName: string;
  department: string | null;
  month: number;
  year: number;
  monthDays: number;
  workingDays: number;
  daysPresent: number;
  daysHalfDay: number;
  daysOnPaidLeave: number;
  daysLOP: number;
  baseSalary: number;
  perDayRate: number;
  earnedGross: number;
  deductions: { pf?: number; esi?: number; professionalTax?: number; tds?: number; loan?: number; other?: number } | null;
  totalDeductions: number;
  netPay: number;
  status: 'draft' | 'finalized' | 'paid' | 'cancelled';
  paidAt: string | null;
  paymentRef: string | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const fmt = (n: number) => `₹${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function PayrollPanel() {
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [detail, setDetail] = useState<Payslip | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentMode, setPaymentMode] = useState('NEFT');

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/api/payroll/payslips', { params: { month, year } });
      setPayslips(r.data);
    } catch (e: any) {
      console.error('Load payslips', e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [month, year]);

  async function runPayroll() {
    if (!confirm(`Generate payroll for ${MONTHS[month - 1]} ${year}? Existing draft payslips for this period will be re-calculated.`)) return;
    setGenerating(true);
    try {
      const r = await api.post('/api/payroll/generate', { month, year });
      const data = r.data;
      alert(
        `Payroll generated:\n` +
        `• Processed: ${data.employeesProcessed}\n` +
        `• Skipped: ${data.employeesSkipped}\n` +
        `• Total net amount: ${fmt(data.totalAmount)}`,
      );
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.response?.data?.error || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  }

  async function markPaid() {
    if (!detail) return;
    setPaying(true);
    try {
      await api.post(`/api/payroll/payslips/${detail.id}/pay`, {
        paymentMode,
        paymentRef,
        paymentDate: new Date().toISOString(),
      });
      setDetail(null);
      setPaymentRef('');
      void load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to mark paid');
    } finally {
      setPaying(false);
    }
  }

  const totals = payslips.reduce(
    (acc, p) => ({
      gross: acc.gross + p.earnedGross,
      deductions: acc.deductions + p.totalDeductions,
      net: acc.net + p.netPay,
    }),
    { gross: 0, deductions: 0, net: 0 },
  );

  return (
    <div className="space-y-4">
      {/* Period + run controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-600" />
            Payroll run
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs text-slate-500">Month</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <Button onClick={runPayroll} disabled={generating} className="gap-1">
              <Calculator className="w-3.5 h-3.5" />
              {generating ? 'Generating…' : 'Run payroll for this period'}
            </Button>
            <Button variant="outline" onClick={load} className="gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Computes pay days from biometric attendance + approved leaves. Already-paid payslips are
            skipped — re-running is safe.
          </p>
        </CardContent>
      </Card>

      {/* Period totals */}
      {payslips.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile label="Payslips" value={String(payslips.length)} />
          <Tile label="Total gross" value={fmt(totals.gross)} />
          <Tile label="Deductions" value={fmt(totals.deductions)} />
          <Tile label="Net payable" value={fmt(totals.net)} accent />
        </div>
      )}

      {/* Payslips table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{MONTHS[month - 1]} {year} — payslips</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500 py-4 text-center">Loading…</p>
          ) : payslips.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No payslips generated yet for this period. Click "Run payroll" above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Payslip #</TableHead>
                    <TableHead className="text-right">Worked</TableHead>
                    <TableHead className="text-right">Paid leave</TableHead>
                    <TableHead className="text-right">LOP</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setDetail(p)}
                    >
                      <TableCell className="font-medium">
                        {p.employeeName}
                        <div className="text-xs text-slate-500">{p.employeeId}{p.department ? ` · ${p.department}` : ''}</div>
                      </TableCell>
                      <TableCell><span className="text-xs font-mono">{p.payslipNumber}</span></TableCell>
                      <TableCell className="text-right">
                        {(p.daysPresent + 0.5 * p.daysHalfDay).toFixed(1)}
                        <span className="text-xs text-slate-400"> / {p.workingDays}</span>
                      </TableCell>
                      <TableCell className="text-right">{p.daysOnPaidLeave}</TableCell>
                      <TableCell className={`text-right ${p.daysLOP > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                        {p.daysLOP}
                      </TableCell>
                      <TableCell className="text-right">{fmt(p.earnedGross)}</TableCell>
                      <TableCell className="text-right text-slate-500">{fmt(p.totalDeductions)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(p.netPay)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'paid' ? 'default' : 'outline'}
                          className={
                            p.status === 'paid' ? 'bg-emerald-600' :
                            p.status === 'finalized' ? 'bg-blue-100 text-blue-700' : ''
                          }>
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payslip detail modal */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Payslip {detail?.payslipNumber} — {detail?.employeeName}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Period" value={`${MONTHS[detail.month - 1]} ${detail.year}`} />
                <Field label="Department" value={detail.department || '—'} />
                <Field label="Working days" value={`${detail.workingDays} / ${detail.monthDays}`} />
                <Field label="Days present" value={detail.daysPresent.toFixed(1)} />
                <Field label="Half-days" value={detail.daysHalfDay.toFixed(1)} />
                <Field label="Paid leave days" value={detail.daysOnPaidLeave.toFixed(1)} />
                <Field label="LOP days" value={detail.daysLOP.toFixed(1)} highlight={detail.daysLOP > 0} />
                <Field label="Per-day rate" value={fmt(detail.perDayRate)} />
              </div>
              <div className="border-t pt-3">
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Earnings & Deductions</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Row label="Base salary" value={fmt(detail.baseSalary)} />
                  <Row label="Earned gross" value={fmt(detail.earnedGross)} bold />
                  {detail.deductions?.pf ? <Row label="PF" value={`-${fmt(detail.deductions.pf)}`} /> : null}
                  {detail.deductions?.esi ? <Row label="ESI" value={`-${fmt(detail.deductions.esi)}`} /> : null}
                  {detail.deductions?.professionalTax ? <Row label="Professional Tax" value={`-${fmt(detail.deductions.professionalTax)}`} /> : null}
                  {detail.deductions?.tds ? <Row label="TDS" value={`-${fmt(detail.deductions.tds)}`} /> : null}
                  <Row label="Total deductions" value={fmt(detail.totalDeductions)} />
                  <Row label="Net payable" value={fmt(detail.netPay)} bold accent />
                </div>
              </div>
              {detail.status !== 'paid' && (
                <div className="border-t pt-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Mark as paid</div>
                  <div className="flex gap-2">
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEFT">NEFT</SelectItem>
                        <SelectItem value="IMPS">IMPS</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Payment reference / UTR"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                    />
                  </div>
                </div>
              )}
              {detail.status === 'paid' && detail.paidAt && (
                <div className="border-t pt-3 flex items-center text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Paid {new Date(detail.paidAt).toLocaleDateString()}
                  {detail.paymentRef ? ` · ${detail.paymentRef}` : ''}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
            {detail?.status !== 'paid' && (
              <Button onClick={markPaid} disabled={paying} className="gap-1">
                <CheckCircle2 className="w-4 h-4" /> {paying ? 'Saving…' : 'Mark paid'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`text-xl font-bold mt-1 ${accent ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`font-medium ${highlight ? 'text-red-600' : 'text-slate-900'}`}>{value}</div>
    </div>
  );
}
function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-1">
      <span className="text-slate-600">{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${accent ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}
