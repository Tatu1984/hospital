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
import { DollarSign, Plus } from 'lucide-react';
import api from '../services/api';

interface ReferralDoctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  phone: string;
  email: string;
  commissionType: 'flat' | 'percentage';
  commissionValue: number;
  totalReferrals: number;
  totalCommission: number;
  status: 'active' | 'inactive';
}

interface Referral {
  id: string;
  referralDoctorId: string;
  referralDoctorName: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  serviceType: string;
  billAmount: number;
  commissionType: 'flat' | 'percentage';
  commissionValue: number;
  commissionAmount: number;
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  referralDate: string;
  paidDate?: string;
}

interface CommissionPayment {
  id: string;
  referralDoctorId: string;
  referralDoctorName: string;
  referralIds: string[];
  totalAmount: number;
  paymentMode: string;
  paymentDate: string;
  chequeNumber?: string;
  transactionId?: string;
}

export default function ReferralCommission() {
  const [referralDoctors, setReferralDoctors] = useState<ReferralDoctor[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payments, setPayments] = useState<CommissionPayment[]>([]);

  const [isAddDoctorDialogOpen, setIsAddDoctorDialogOpen] = useState(false);
  const [isAddReferralDialogOpen, setIsAddReferralDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<ReferralDoctor | null>(null);
  const [loading, setLoading] = useState(false);

  const [doctorFormData, setDoctorFormData] = useState({
    name: '',
    specialty: '',
    hospital: '',
    phone: '',
    email: '',
    commissionType: 'percentage' as const,
    commissionValue: 0
  });

  const [referralFormData, setReferralFormData] = useState({
    referralDoctorId: '',
    patientId: '',
    patientName: '',
    patientMRN: '',
    serviceType: '',
    billAmount: 0
  });

  const [paymentFormData, setPaymentFormData] = useState({
    referralDoctorId: '',
    paymentMode: 'cheque',
    chequeNumber: '',
    transactionId: ''
  });

  useEffect(() => {
    fetchReferralDoctors();
    fetchReferrals();
    fetchPayments();
  }, []);

  const fetchReferralDoctors = async () => {
    try {
      const response = await api.get('/api/referral-doctors');
      setReferralDoctors(response.data);
    } catch (error) {
      console.error('Error fetching referral doctors:', error);
    }
  };

  const fetchReferrals = async () => {
    try {
      const response = await api.get('/api/referrals');
      setReferrals(response.data);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await api.get('/api/commission-payments');
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleAddDoctor = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/referral-doctors', doctorFormData);

      const newDoctor: ReferralDoctor = {
        id: response.data.id || Date.now().toString(),
        ...doctorFormData,
        totalReferrals: 0,
        totalCommission: 0,
        status: 'active'
      };

      setReferralDoctors([...referralDoctors, newDoctor]);
      setIsAddDoctorDialogOpen(false);
      setDoctorFormData({
        name: '',
        specialty: '',
        hospital: '',
        phone: '',
        email: '',
        commissionType: 'percentage',
        commissionValue: 0
      });
      alert('Referral doctor added successfully!');
    } catch (error) {
      console.error('Error adding doctor:', error);
      alert('Failed to add referral doctor');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReferral = async () => {
    setLoading(true);
    try {
      const doctor = referralDoctors.find(d => d.id === referralFormData.referralDoctorId);
      if (!doctor) {
        alert('Please select a referral doctor');
        return;
      }

      let commissionAmount = 0;
      if (doctor.commissionType === 'flat') {
        commissionAmount = doctor.commissionValue;
      } else {
        commissionAmount = (referralFormData.billAmount * doctor.commissionValue) / 100;
      }

      const referralData = {
        ...referralFormData,
        commissionType: doctor.commissionType,
        commissionValue: doctor.commissionValue,
        commissionAmount
      };

      const response = await api.post('/api/referrals', referralData);

      const newReferral: Referral = {
        id: response.data.id || Date.now().toString(),
        referralDoctorId: referralFormData.referralDoctorId,
        referralDoctorName: doctor.name,
        patientId: referralFormData.patientId,
        patientName: referralFormData.patientName,
        patientMRN: referralFormData.patientMRN,
        serviceType: referralFormData.serviceType,
        billAmount: referralFormData.billAmount,
        commissionType: doctor.commissionType,
        commissionValue: doctor.commissionValue,
        commissionAmount,
        paymentStatus: 'pending',
        referralDate: new Date().toISOString()
      };

      setReferrals([newReferral, ...referrals]);
      setIsAddReferralDialogOpen(false);
      setReferralFormData({
        referralDoctorId: '',
        patientId: '',
        patientName: '',
        patientMRN: '',
        serviceType: '',
        billAmount: 0
      });
      alert('Referral recorded successfully!');
    } catch (error) {
      console.error('Error adding referral:', error);
      alert('Failed to record referral');
    } finally {
      setLoading(false);
    }
  };

  const handlePayCommission = async (doctorId: string) => {
    const pendingReferrals = referrals.filter(
      r => r.referralDoctorId === doctorId && r.paymentStatus === 'pending'
    );

    if (pendingReferrals.length === 0) {
      alert('No pending commissions for this doctor');
      return;
    }

    const totalAmount = pendingReferrals.reduce((sum, r) => sum + r.commissionAmount, 0);

    setLoading(true);
    try {
      const paymentData = {
        ...paymentFormData,
        referralDoctorId: doctorId,
        referralIds: pendingReferrals.map(r => r.id),
        totalAmount
      };

      const response = await api.post('/api/commission-payments', paymentData);

      const doctor = referralDoctors.find(d => d.id === doctorId);
      const newPayment: CommissionPayment = {
        id: response.data.id || Date.now().toString(),
        referralDoctorId: doctorId,
        referralDoctorName: doctor?.name || '',
        referralIds: pendingReferrals.map(r => r.id),
        totalAmount,
        paymentMode: paymentFormData.paymentMode,
        paymentDate: new Date().toISOString(),
        chequeNumber: paymentFormData.chequeNumber,
        transactionId: paymentFormData.transactionId
      };

      setPayments([newPayment, ...payments]);

      // Update referrals to mark as paid
      setReferrals(referrals.map(r =>
        pendingReferrals.find(pr => pr.id === r.id)
          ? { ...r, paymentStatus: 'paid' as const, paidDate: new Date().toISOString() }
          : r
      ));

      setIsPaymentDialogOpen(false);
      setPaymentFormData({
        referralDoctorId: '',
        paymentMode: 'cheque',
        chequeNumber: '',
        transactionId: ''
      });
      alert(`Commission of Rs. ${totalAmount.toFixed(2)} paid successfully!`);
    } catch (error) {
      console.error('Error paying commission:', error);
      alert('Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalDoctors: referralDoctors.filter(d => d.status === 'active').length,
    totalReferrals: referrals.length,
    pendingCommission: referrals
      .filter(r => r.paymentStatus === 'pending')
      .reduce((sum, r) => sum + r.commissionAmount, 0),
    paidCommission: referrals
      .filter(r => r.paymentStatus === 'paid')
      .reduce((sum, r) => sum + r.commissionAmount, 0)
  };

  const doctorStats = referralDoctors.map(doctor => {
    const doctorReferrals = referrals.filter(r => r.referralDoctorId === doctor.id);
    const pending = doctorReferrals
      .filter(r => r.paymentStatus === 'pending')
      .reduce((sum, r) => sum + r.commissionAmount, 0);
    return {
      ...doctor,
      totalReferrals: doctorReferrals.length,
      totalCommission: doctorReferrals.reduce((sum, r) => sum + r.commissionAmount, 0),
      pendingCommission: pending
    };
  });

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Referral & Commission Management</h1>
          <p className="text-slate-600">Manage referring doctors and commission payments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Referral Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDoctors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalReferrals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">Rs. {stats.pendingCommission.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Paid Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Rs. {stats.paidCommission.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="doctors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="doctors">Referral Doctors</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="payments">Commission Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Referral Doctors Tab */}
        <TabsContent value="doctors">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Referral Doctors</CardTitle>
                  <CardDescription>Manage referring doctors and commission structure</CardDescription>
                </div>
                <Dialog open={isAddDoctorDialogOpen} onOpenChange={setIsAddDoctorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Referral Doctor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Referral Doctor</DialogTitle>
                      <DialogDescription>Register a new referring doctor with commission details</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Doctor Name *</Label>
                        <Input
                          value={doctorFormData.name}
                          onChange={(e) => setDoctorFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Dr. John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Specialty</Label>
                        <Input
                          value={doctorFormData.specialty}
                          onChange={(e) => setDoctorFormData(prev => ({ ...prev, specialty: e.target.value }))}
                          placeholder="Cardiology"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hospital/Clinic</Label>
                        <Input
                          value={doctorFormData.hospital}
                          onChange={(e) => setDoctorFormData(prev => ({ ...prev, hospital: e.target.value }))}
                          placeholder="City Hospital"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone *</Label>
                        <Input
                          value={doctorFormData.phone}
                          onChange={(e) => setDoctorFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={doctorFormData.email}
                          onChange={(e) => setDoctorFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="doctor@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Commission Type *</Label>
                        <Select value={doctorFormData.commissionType} onValueChange={(value: any) => setDoctorFormData(prev => ({ ...prev, commissionType: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="flat">Flat Rate (Rs.)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>
                          Commission Value *
                          {doctorFormData.commissionType === 'percentage' ? ' (%)' : ' (Rs.)'}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step={doctorFormData.commissionType === 'percentage' ? '0.1' : '1'}
                          value={doctorFormData.commissionValue}
                          onChange={(e) => setDoctorFormData(prev => ({ ...prev, commissionValue: parseFloat(e.target.value) || 0 }))}
                          placeholder={doctorFormData.commissionType === 'percentage' ? '10.5' : '500'}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDoctorDialogOpen(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddDoctor} disabled={loading}>
                        {loading ? 'Adding...' : 'Add Doctor'}
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
                    <TableHead>Name</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Hospital</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctorStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No referral doctors registered
                      </TableCell>
                    </TableRow>
                  ) : (
                    doctorStats.map(doctor => (
                      <TableRow key={doctor.id}>
                        <TableCell className="font-medium">{doctor.name}</TableCell>
                        <TableCell>{doctor.specialty}</TableCell>
                        <TableCell>{doctor.hospital}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{doctor.phone}</div>
                            {doctor.email && <div className="text-slate-500">{doctor.email}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {doctor.commissionType === 'percentage'
                              ? `${doctor.commissionValue}%`
                              : `Rs. ${doctor.commissionValue}`}
                          </Badge>
                        </TableCell>
                        <TableCell>{doctor.totalReferrals}</TableCell>
                        <TableCell className="font-semibold text-orange-600">
                          Rs. {doctor.pendingCommission.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {doctor.pendingCommission > 0 && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedDoctor(doctor);
                                setPaymentFormData(prev => ({ ...prev, referralDoctorId: doctor.id }));
                                setIsPaymentDialogOpen(true);
                              }}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Pay
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Patient Referrals</CardTitle>
                  <CardDescription>Track all patient referrals and commissions</CardDescription>
                </div>
                <Dialog open={isAddReferralDialogOpen} onOpenChange={setIsAddReferralDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Referral
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Patient Referral</DialogTitle>
                      <DialogDescription>Add a new patient referral</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Referral Doctor *</Label>
                        <Select value={referralFormData.referralDoctorId} onValueChange={(value) => setReferralFormData(prev => ({ ...prev, referralDoctorId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select referral doctor" />
                          </SelectTrigger>
                          <SelectContent>
                            {referralDoctors.filter(d => d.status === 'active').map(doctor => (
                              <SelectItem key={doctor.id} value={doctor.id}>
                                {doctor.name} - {doctor.commissionType === 'percentage' ? `${doctor.commissionValue}%` : `Rs. ${doctor.commissionValue}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Patient Name *</Label>
                        <Input
                          value={referralFormData.patientName}
                          onChange={(e) => setReferralFormData(prev => ({ ...prev, patientName: e.target.value }))}
                          placeholder="Enter patient name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Patient MRN</Label>
                        <Input
                          value={referralFormData.patientMRN}
                          onChange={(e) => setReferralFormData(prev => ({ ...prev, patientMRN: e.target.value }))}
                          placeholder="MRN123456"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Service Type *</Label>
                        <Input
                          value={referralFormData.serviceType}
                          onChange={(e) => setReferralFormData(prev => ({ ...prev, serviceType: e.target.value }))}
                          placeholder="e.g., Consultation, Surgery, etc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bill Amount (Rs.) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={referralFormData.billAmount}
                          onChange={(e) => setReferralFormData(prev => ({ ...prev, billAmount: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddReferralDialogOpen(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddReferral} disabled={loading}>
                        {loading ? 'Recording...' : 'Record Referral'}
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
                    <TableHead>Date</TableHead>
                    <TableHead>Referral Doctor</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Bill Amount</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No referrals recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    referrals.map(referral => (
                      <TableRow key={referral.id}>
                        <TableCell>{new Date(referral.referralDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{referral.referralDoctorName}</TableCell>
                        <TableCell>
                          {referral.patientName}
                          {referral.patientMRN && <div className="text-xs text-slate-500">{referral.patientMRN}</div>}
                        </TableCell>
                        <TableCell>{referral.serviceType}</TableCell>
                        <TableCell>Rs. {referral.billAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {referral.commissionType === 'percentage'
                              ? `${referral.commissionValue}%`
                              : `Rs. ${referral.commissionValue}`}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">Rs. {referral.commissionAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={referral.paymentStatus === 'paid' ? 'default' : referral.paymentStatus === 'pending' ? 'secondary' : 'destructive'}>
                            {referral.paymentStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Commission Payments</CardTitle>
              <CardDescription>History of all commission payments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Referral Doctor</TableHead>
                    <TableHead>Referrals Count</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        No commission payments made yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{payment.referralDoctorName}</TableCell>
                        <TableCell>{payment.referralIds.length}</TableCell>
                        <TableCell className="font-semibold text-green-600">Rs. {payment.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{payment.paymentMode.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {payment.chequeNumber && `Cheque: ${payment.chequeNumber}`}
                          {payment.transactionId && `TXN: ${payment.transactionId}`}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Commission Reports</CardTitle>
              <CardDescription>Detailed commission analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Referring Doctors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {doctorStats
                        .sort((a, b) => b.totalReferrals - a.totalReferrals)
                        .slice(0, 5)
                        .map(doctor => (
                          <div key={doctor.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                            <div>
                              <div className="font-medium">{doctor.name}</div>
                              <div className="text-xs text-slate-500">{doctor.totalReferrals} referrals</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-green-600">Rs. {doctor.totalCommission.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between p-3 bg-blue-50 rounded">
                        <span>This Month Referrals:</span>
                        <span className="font-bold">{referrals.filter(r =>
                          new Date(r.referralDate).getMonth() === new Date().getMonth()
                        ).length}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-green-50 rounded">
                        <span>This Month Commission:</span>
                        <span className="font-bold text-green-600">
                          Rs. {referrals
                            .filter(r => new Date(r.referralDate).getMonth() === new Date().getMonth())
                            .reduce((sum, r) => sum + r.commissionAmount, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between p-3 bg-orange-50 rounded">
                        <span>Pending Payments:</span>
                        <span className="font-bold text-orange-600">
                          Rs. {stats.pendingCommission.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Commission</DialogTitle>
            <DialogDescription>
              Pay pending commission to {selectedDoctor?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between mb-2">
                <span>Pending Referrals:</span>
                <span className="font-semibold">
                  {referrals.filter(r => r.referralDoctorId === selectedDoctor?.id && r.paymentStatus === 'pending').length}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-green-600">
                  Rs. {referrals
                    .filter(r => r.referralDoctorId === selectedDoctor?.id && r.paymentStatus === 'pending')
                    .reduce((sum, r) => sum + r.commissionAmount, 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Mode *</Label>
              <Select value={paymentFormData.paymentMode} onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, paymentMode: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentFormData.paymentMode === 'cheque' && (
              <div className="space-y-2">
                <Label>Cheque Number</Label>
                <Input
                  value={paymentFormData.chequeNumber}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, chequeNumber: e.target.value }))}
                  placeholder="Enter cheque number"
                />
              </div>
            )}

            {(paymentFormData.paymentMode === 'bank_transfer' || paymentFormData.paymentMode === 'upi') && (
              <div className="space-y-2">
                <Label>Transaction ID</Label>
                <Input
                  value={paymentFormData.transactionId}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                  placeholder="Enter transaction ID"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={() => selectedDoctor && handlePayCommission(selectedDoctor.id)} disabled={loading}>
              {loading ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
