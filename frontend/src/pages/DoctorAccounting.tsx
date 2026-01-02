import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/Toast';
import {
  CreditCard, Search, DollarSign, TrendingUp, Calendar,
  User, FileText, RefreshCw, Download, CheckCircle
} from 'lucide-react';

interface DoctorRevenue {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  month: string;
  year: number;
  consultations: number;
  consultationRevenue: number;
  procedures: number;
  procedureRevenue: number;
  opdShare: number;
  ipdShare: number;
  labShare: number;
  totalRevenue: number;
  hospitalShare: number;
  doctorShare: number;
  deductions: number;
  netPayable: number;
  status: 'PENDING' | 'PROCESSED' | 'PAID';
}

interface PayoutRecord {
  id: string;
  doctorId: string;
  doctorName: string;
  amount: number;
  period: string;
  paymentDate: string;
  paymentMode: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH';
  referenceNumber: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

interface DoctorContract {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  contractType: 'FULL_TIME' | 'VISITING' | 'CONSULTANT';
  consultationFee: number;
  sharingRatio: { hospital: number; doctor: number };
  opdSharing: number;
  ipdSharing: number;
  procedureSharing: number;
  labSharing: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'ACTIVE' | 'EXPIRED';
}

export default function DoctorAccounting() {
  const { success: showToast } = useToast();
  const [activeTab, setActiveTab] = useState('revenue');
  const [revenues, setRevenues] = useState<DoctorRevenue[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [contracts, setContracts] = useState<DoctorContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [selectedRevenue, setSelectedRevenue] = useState<DoctorRevenue | null>(null);

  const [payoutData, setPayoutData] = useState({
    paymentMode: 'BANK_TRANSFER' as PayoutRecord['paymentMode'],
    referenceNumber: '',
  });

  useEffect(() => {
    fetchData();
  }, [filterMonth]);

  const fetchData = async () => {
    try {
      // Mock revenue data
      setRevenues([
        {
          id: '1',
          doctorId: 'D001',
          doctorName: 'Dr. Amit Sharma',
          specialty: 'Cardiology',
          month: 'December',
          year: 2024,
          consultations: 145,
          consultationRevenue: 145000,
          procedures: 12,
          procedureRevenue: 180000,
          opdShare: 87000,
          ipdShare: 45000,
          labShare: 12000,
          totalRevenue: 325000,
          hospitalShare: 130000,
          doctorShare: 195000,
          deductions: 5000,
          netPayable: 190000,
          status: 'PENDING',
        },
        {
          id: '2',
          doctorId: 'D002',
          doctorName: 'Dr. Priya Patel',
          specialty: 'Gynecology',
          month: 'December',
          year: 2024,
          consultations: 180,
          consultationRevenue: 180000,
          procedures: 8,
          procedureRevenue: 120000,
          opdShare: 108000,
          ipdShare: 72000,
          labShare: 8000,
          totalRevenue: 300000,
          hospitalShare: 120000,
          doctorShare: 180000,
          deductions: 3000,
          netPayable: 177000,
          status: 'PROCESSED',
        },
        {
          id: '3',
          doctorId: 'D003',
          doctorName: 'Dr. Rajesh Kumar',
          specialty: 'Orthopedics',
          month: 'December',
          year: 2024,
          consultations: 120,
          consultationRevenue: 120000,
          procedures: 15,
          procedureRevenue: 450000,
          opdShare: 72000,
          ipdShare: 270000,
          labShare: 5000,
          totalRevenue: 570000,
          hospitalShare: 228000,
          doctorShare: 342000,
          deductions: 8000,
          netPayable: 334000,
          status: 'PAID',
        },
      ]);

      // Mock payouts
      setPayouts([
        {
          id: 'P001',
          doctorId: 'D003',
          doctorName: 'Dr. Rajesh Kumar',
          amount: 334000,
          period: 'December 2024',
          paymentDate: '2025-01-05',
          paymentMode: 'BANK_TRANSFER',
          referenceNumber: 'NEFT-20250105-001234',
          status: 'COMPLETED',
        },
        {
          id: 'P002',
          doctorId: 'D002',
          doctorName: 'Dr. Priya Patel',
          amount: 177000,
          period: 'December 2024',
          paymentDate: '2025-01-02',
          paymentMode: 'BANK_TRANSFER',
          referenceNumber: 'NEFT-20250102-005678',
          status: 'PENDING',
        },
      ]);

      // Mock contracts
      setContracts([
        {
          id: 'C001',
          doctorId: 'D001',
          doctorName: 'Dr. Amit Sharma',
          specialty: 'Cardiology',
          contractType: 'CONSULTANT',
          consultationFee: 1000,
          sharingRatio: { hospital: 40, doctor: 60 },
          opdSharing: 60,
          ipdSharing: 50,
          procedureSharing: 60,
          labSharing: 10,
          effectiveFrom: '2024-01-01',
          status: 'ACTIVE',
        },
        {
          id: 'C002',
          doctorId: 'D002',
          doctorName: 'Dr. Priya Patel',
          specialty: 'Gynecology',
          contractType: 'FULL_TIME',
          consultationFee: 1000,
          sharingRatio: { hospital: 40, doctor: 60 },
          opdSharing: 60,
          ipdSharing: 60,
          procedureSharing: 50,
          labSharing: 10,
          effectiveFrom: '2023-06-01',
          status: 'ACTIVE',
        },
      ]);
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async () => {
    if (!selectedRevenue || !payoutData.referenceNumber) return;

    try {
      // Update revenue status
      setRevenues(prev => prev.map(r =>
        r.id === selectedRevenue.id ? { ...r, status: 'PAID' } : r
      ));

      // Add payout record
      const newPayout: PayoutRecord = {
        id: `P${Date.now()}`,
        doctorId: selectedRevenue.doctorId,
        doctorName: selectedRevenue.doctorName,
        amount: selectedRevenue.netPayable,
        period: `${selectedRevenue.month} ${selectedRevenue.year}`,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMode: payoutData.paymentMode,
        referenceNumber: payoutData.referenceNumber,
        status: 'COMPLETED',
      };

      setPayouts(prev => [newPayout, ...prev]);
      showToast('Payout processed successfully', 'success');
      setShowPayoutDialog(false);
      setSelectedRevenue(null);
    } catch (error) {
      showToast('Failed to process payout', 'error');
    }
  };

  const filteredRevenues = revenues.filter(r => {
    const matchesSearch = r.doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPending = revenues
    .filter(r => r.status === 'PENDING' || r.status === 'PROCESSED')
    .reduce((sum, r) => sum + r.netPayable, 0);

  const totalPaid = revenues
    .filter(r => r.status === 'PAID')
    .reduce((sum, r) => sum + r.netPayable, 0);

  const totalRevenue = revenues.reduce((sum, r) => sum + r.totalRevenue, 0);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSED: 'bg-blue-100 text-blue-800',
      PAID: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[status]}>{status}</Badge>;
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
          <h1 className="text-2xl font-bold text-slate-800">Doctor Accounting</h1>
          <p className="text-slate-600">Revenue sharing and payouts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-600">₹{(totalRevenue / 100000).toFixed(1)}L</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Doctor Share</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{(revenues.reduce((sum, r) => sum + r.doctorShare, 0) / 100000).toFixed(1)}L
                </p>
              </div>
              <User className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Payouts</p>
                <p className="text-2xl font-bold text-yellow-600">₹{(totalPending / 100000).toFixed(1)}L</p>
              </div>
              <CreditCard className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Paid This Month</p>
                <p className="text-2xl font-bold text-purple-600">₹{(totalPaid / 100000).toFixed(1)}L</p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="revenue">Revenue Summary</TabsTrigger>
          <TabsTrigger value="payouts">Payout History</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search doctor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-[180px]"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSED">Processed</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {filteredRevenues.map((revenue) => (
              <Card key={revenue.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{revenue.doctorName}</h3>
                        <Badge variant="outline">{revenue.specialty}</Badge>
                        {getStatusBadge(revenue.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Consultations</p>
                          <p className="font-medium">{revenue.consultations} (₹{revenue.consultationRevenue.toLocaleString()})</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Procedures</p>
                          <p className="font-medium">{revenue.procedures} (₹{revenue.procedureRevenue.toLocaleString()})</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Total Revenue</p>
                          <p className="font-medium text-blue-600">₹{revenue.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Doctor Share</p>
                          <p className="font-medium text-green-600">₹{revenue.doctorShare.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
                        <span className="text-slate-600">Net Payable: </span>
                        <span className="font-bold text-lg">₹{revenue.netPayable.toLocaleString()}</span>
                        <span className="text-slate-500 ml-2">(After ₹{revenue.deductions.toLocaleString()} deductions)</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {revenue.status === 'PROCESSED' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRevenue(revenue);
                            setShowPayoutDialog(true);
                          }}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Pay
                        </Button>
                      )}
                      {revenue.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRevenues(prev => prev.map(r =>
                              r.id === revenue.id ? { ...r, status: 'PROCESSED' } : r
                            ));
                            showToast('Revenue processed for payout', 'success');
                          }}
                        >
                          Process
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4">Doctor</th>
                    <th className="text-left p-4">Period</th>
                    <th className="text-left p-4">Amount</th>
                    <th className="text-left p-4">Payment Date</th>
                    <th className="text-left p-4">Mode</th>
                    <th className="text-left p-4">Reference</th>
                    <th className="text-left p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-t">
                      <td className="p-4 font-medium">{payout.doctorName}</td>
                      <td className="p-4">{payout.period}</td>
                      <td className="p-4 font-medium">₹{payout.amount.toLocaleString()}</td>
                      <td className="p-4">{payout.paymentDate}</td>
                      <td className="p-4">
                        <Badge variant="outline">{payout.paymentMode.replace('_', ' ')}</Badge>
                      </td>
                      <td className="p-4 font-mono text-sm">{payout.referenceNumber}</td>
                      <td className="p-4">{getStatusBadge(payout.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contracts.map((contract) => (
              <Card key={contract.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold">{contract.doctorName}</h3>
                      <p className="text-sm text-slate-500">{contract.specialty}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={contract.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}>
                        {contract.status}
                      </Badge>
                      <Badge variant="outline">{contract.contractType.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Consultation Fee</p>
                      <p className="font-medium">₹{contract.consultationFee}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Sharing Ratio</p>
                      <p className="font-medium">Hospital {contract.sharingRatio.hospital}% : Doctor {contract.sharingRatio.doctor}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500">OPD Share</p>
                      <p className="font-medium">{contract.opdSharing}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500">IPD Share</p>
                      <p className="font-medium">{contract.ipdSharing}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Procedure Share</p>
                      <p className="font-medium">{contract.procedureSharing}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Lab Share</p>
                      <p className="font-medium">{contract.labSharing}%</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                    <span className="text-slate-500">Effective: {contract.effectiveFrom}</span>
                    <Button size="sm" variant="outline">Edit Contract</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Payout Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout</DialogTitle>
          </DialogHeader>
          {selectedRevenue && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedRevenue.doctorName}</p>
                <p className="text-sm text-slate-600">{selectedRevenue.month} {selectedRevenue.year}</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  ₹{selectedRevenue.netPayable.toLocaleString()}
                </p>
              </div>
              <div>
                <Label>Payment Mode</Label>
                <Select
                  value={payoutData.paymentMode}
                  onValueChange={(v: PayoutRecord['paymentMode']) => setPayoutData({ ...payoutData, paymentMode: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference Number *</Label>
                <Input
                  value={payoutData.referenceNumber}
                  onChange={(e) => setPayoutData({ ...payoutData, referenceNumber: e.target.value })}
                  placeholder="e.g., NEFT-20250102-001234"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>Cancel</Button>
            <Button onClick={handleProcessPayout}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
