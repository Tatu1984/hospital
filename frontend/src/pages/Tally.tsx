import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/Toast';
import {
  RefreshCw, Upload, CheckCircle, XCircle,
  Clock, ArrowUpRight, ArrowDownLeft, DollarSign
} from 'lucide-react';

interface SyncEntry {
  id: string;
  date: string;
  type: 'REVENUE' | 'EXPENSE' | 'RECEIPT' | 'PAYMENT';
  voucherNumber: string;
  description: string;
  amount: number;
  ledger: string;
  department?: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED' | 'SKIPPED';
  errorMessage?: string;
  tallyVoucherNo?: string;
}

interface AccountMapping {
  id: string;
  hospitalAccount: string;
  tallyLedger: string;
  accountType: string;
  isActive: boolean;
}

interface SyncLog {
  id: string;
  timestamp: string;
  entriesTotal: number;
  entriesSynced: number;
  entriesFailed: number;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  duration: number; // seconds
}

export default function Tally() {
  const { success: showToast } = useToast();
  const [activeTab, setActiveTab] = useState('entries');
  const [entries, setEntries] = useState<SyncEntry[]>([]);
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  const fetchData = async () => {
    try {
      // Mock entries
      setEntries([
        {
          id: '1',
          date: '2024-12-28',
          type: 'REVENUE',
          voucherNumber: 'INV-2024-001234',
          description: 'OPD Consultation - Dr. Amit Sharma',
          amount: 1500,
          ledger: 'OPD Income',
          department: 'Cardiology',
          status: 'SYNCED',
          tallyVoucherNo: 'TL-12345',
        },
        {
          id: '2',
          date: '2024-12-28',
          type: 'REVENUE',
          voucherNumber: 'INV-2024-001235',
          description: 'Laboratory Tests - CBC, LFT',
          amount: 2500,
          ledger: 'Lab Income',
          department: 'Laboratory',
          status: 'SYNCED',
          tallyVoucherNo: 'TL-12346',
        },
        {
          id: '3',
          date: '2024-12-28',
          type: 'EXPENSE',
          voucherNumber: 'EXP-2024-000456',
          description: 'Medical Supplies Purchase',
          amount: 45000,
          ledger: 'Medical Supplies',
          status: 'PENDING',
        },
        {
          id: '4',
          date: '2024-12-27',
          type: 'RECEIPT',
          voucherNumber: 'REC-2024-000789',
          description: 'Patient Payment - Rajesh Kumar',
          amount: 50000,
          ledger: 'Patient Receivables',
          status: 'FAILED',
          errorMessage: 'Ledger not found in Tally',
        },
        {
          id: '5',
          date: '2024-12-27',
          type: 'PAYMENT',
          voucherNumber: 'PAY-2024-000123',
          description: 'Vendor Payment - Medical Equipment',
          amount: 125000,
          ledger: 'Vendor Payables',
          status: 'SYNCED',
          tallyVoucherNo: 'TL-12340',
        },
      ]);

      // Mock mappings
      setMappings([
        { id: '1', hospitalAccount: 'OPD Consultation Income', tallyLedger: 'OPD Income', accountType: 'Income', isActive: true },
        { id: '2', hospitalAccount: 'Laboratory Income', tallyLedger: 'Lab Income', accountType: 'Income', isActive: true },
        { id: '3', hospitalAccount: 'Pharmacy Sales', tallyLedger: 'Pharmacy Income', accountType: 'Income', isActive: true },
        { id: '4', hospitalAccount: 'IPD Room Charges', tallyLedger: 'IPD Income', accountType: 'Income', isActive: true },
        { id: '5', hospitalAccount: 'Medical Supplies', tallyLedger: 'Medical Supplies Expense', accountType: 'Expense', isActive: true },
        { id: '6', hospitalAccount: 'Salary & Wages', tallyLedger: 'Salary Expense', accountType: 'Expense', isActive: true },
        { id: '7', hospitalAccount: 'Patient Receivables', tallyLedger: 'Sundry Debtors', accountType: 'Asset', isActive: false },
      ]);

      // Mock sync logs
      setSyncLogs([
        { id: '1', timestamp: '2024-12-28T18:30:00', entriesTotal: 45, entriesSynced: 43, entriesFailed: 2, status: 'PARTIAL', duration: 12 },
        { id: '2', timestamp: '2024-12-27T18:30:00', entriesTotal: 52, entriesSynced: 52, entriesFailed: 0, status: 'COMPLETED', duration: 15 },
        { id: '3', timestamp: '2024-12-26T18:30:00', entriesTotal: 38, entriesSynced: 38, entriesFailed: 0, status: 'COMPLETED', duration: 10 },
      ]);
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    showToast('Syncing entries to Tally...', 'success');

    // Simulate sync
    setTimeout(() => {
      setEntries(prev => prev.map(e =>
        e.status === 'PENDING' ? { ...e, status: 'SYNCED', tallyVoucherNo: `TL-${Date.now()}` } : e
      ));
      setSyncing(false);
      showToast('Sync completed successfully', 'success');
    }, 3000);
  };

  const handleRetryFailed = () => {
    setEntries(prev => prev.map(e =>
      e.status === 'FAILED' ? { ...e, status: 'PENDING' } : e
    ));
    showToast('Failed entries marked for retry', 'success');
  };

  const filteredEntries = entries.filter(e => {
    const matchesStatus = filterStatus === 'all' || e.status === filterStatus;
    const matchesType = filterType === 'all' || e.type === filterType;
    return matchesStatus && matchesType;
  });

  const stats = {
    pending: entries.filter(e => e.status === 'PENDING').length,
    synced: entries.filter(e => e.status === 'SYNCED').length,
    failed: entries.filter(e => e.status === 'FAILED').length,
    totalAmount: entries.reduce((sum, e) => sum + e.amount, 0),
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      SYNCED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      SKIPPED: 'bg-slate-100 text-slate-800',
    };
    return <Badge className={colors[status]}>{status}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'REVENUE': return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case 'EXPENSE': return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case 'RECEIPT': return <ArrowDownLeft className="w-4 h-4 text-blue-600" />;
      case 'PAYMENT': return <ArrowUpRight className="w-4 h-4 text-orange-600" />;
      default: return null;
    }
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
          <h1 className="text-2xl font-bold text-slate-800">Tally Integration</h1>
          <p className="text-slate-600">Accounting system integration and financial sync</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRetryFailed} disabled={stats.failed === 0}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Failed
          </Button>
          <Button onClick={handleSync} disabled={syncing || stats.pending === 0}>
            {syncing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Sync to Tally
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Sync</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Synced</p>
                <p className="text-2xl font-bold text-green-600">{stats.synced}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600">₹{(stats.totalAmount / 1000).toFixed(0)}K</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="entries">Journal Entries</TabsTrigger>
          <TabsTrigger value="mappings">Account Mappings</TabsTrigger>
          <TabsTrigger value="logs">Sync History</TabsTrigger>
        </TabsList>

        {/* Entries Tab */}
        <TabsContent value="entries" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[150px]"
                />
                <span className="self-center">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[150px]"
                />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="REVENUE">Revenue</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="RECEIPT">Receipt</SelectItem>
                    <SelectItem value="PAYMENT">Payment</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="SYNCED">Synced</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Type</th>
                    <th className="text-left p-4">Voucher</th>
                    <th className="text-left p-4">Description</th>
                    <th className="text-left p-4">Ledger</th>
                    <th className="text-right p-4">Amount</th>
                    <th className="text-left p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-t hover:bg-slate-50">
                      <td className="p-4">{entry.date}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(entry.type)}
                          <span>{entry.type}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm">{entry.voucherNumber}</td>
                      <td className="p-4">
                        <p className="text-sm">{entry.description}</p>
                        {entry.department && (
                          <p className="text-xs text-slate-500">{entry.department}</p>
                        )}
                      </td>
                      <td className="p-4">{entry.ledger}</td>
                      <td className="p-4 text-right font-medium">₹{entry.amount.toLocaleString()}</td>
                      <td className="p-4">
                        <div>
                          {getStatusBadge(entry.status)}
                          {entry.tallyVoucherNo && (
                            <p className="text-xs text-slate-500 mt-1">{entry.tallyVoucherNo}</p>
                          )}
                          {entry.errorMessage && (
                            <p className="text-xs text-red-500 mt-1">{entry.errorMessage}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mappings Tab */}
        <TabsContent value="mappings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Mappings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4">Hospital Account</th>
                    <th className="text-left p-4">Tally Ledger</th>
                    <th className="text-left p-4">Type</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping) => (
                    <tr key={mapping.id} className="border-t">
                      <td className="p-4 font-medium">{mapping.hospitalAccount}</td>
                      <td className="p-4">{mapping.tallyLedger}</td>
                      <td className="p-4">
                        <Badge variant="outline">{mapping.accountType}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={mapping.isActive ? 'bg-green-500' : 'bg-slate-500'}>
                          {mapping.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button size="sm" variant="outline">Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4">Timestamp</th>
                    <th className="text-center p-4">Total</th>
                    <th className="text-center p-4">Synced</th>
                    <th className="text-center p-4">Failed</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLogs.map((log) => (
                    <tr key={log.id} className="border-t">
                      <td className="p-4">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-4 text-center">{log.entriesTotal}</td>
                      <td className="p-4 text-center text-green-600">{log.entriesSynced}</td>
                      <td className="p-4 text-center text-red-600">{log.entriesFailed}</td>
                      <td className="p-4">
                        <Badge className={
                          log.status === 'COMPLETED' ? 'bg-green-500' :
                          log.status === 'PARTIAL' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">{log.duration}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
