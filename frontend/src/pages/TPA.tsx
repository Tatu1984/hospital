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
import { Plus } from 'lucide-react';
import api from '../services/api';

interface InsuranceCompany {
  id: string;
  name: string;
  code: string;
  contact: string;
  email: string;
  address: string;
  status: 'active' | 'inactive';
}

interface PatientInsurance {
  id: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  insuranceCompanyId: string;
  insuranceCompanyName: string;
  policyNumber: string;
  policyHolderName: string;
  validFrom: string;
  validTill: string;
  sumInsured: number;
  status: 'active' | 'expired';
}

interface TPAClaim {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  patientInsuranceId: string;
  insuranceCompanyId: string;
  insuranceCompanyName: string;
  policyNumber: string;
  admissionId?: string;
  claimType: 'Cashless' | 'Reimbursement';
  claimAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  status: 'Submitted' | 'Approved' | 'Rejected' | 'Pending' | 'Query' | 'Settled';
  submittedDate: string;
  approvedDate?: string;
  settledDate?: string;
  documents: string[];
  remarks?: string;
}

interface PreAuthorization {
  id: string;
  patientId: string;
  patientName: string;
  patientInsuranceId: string;
  insuranceCompanyName: string;
  policyNumber: string;
  procedure: string;
  estimatedAmount: number;
  approvedAmount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedDate: string;
  approvedDate?: string;
}

export default function TPA() {
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [patientInsurances, setPatientInsurances] = useState<PatientInsurance[]>([]);
  const [claims, setClaims] = useState<TPAClaim[]>([]);
  const [preAuths, setPreAuths] = useState<PreAuthorization[]>([]);

  const [isAddInsuranceDialogOpen, setIsAddInsuranceDialogOpen] = useState(false);
  const [isAddPatientInsDialogOpen, setIsAddPatientInsDialogOpen] = useState(false);
  const [isAddClaimDialogOpen, setIsAddClaimDialogOpen] = useState(false);
  const [isPreAuthDialogOpen, setIsPreAuthDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [insuranceFormData, setInsuranceFormData] = useState({
    name: '',
    code: '',
    contact: '',
    email: '',
    address: ''
  });

  const [patientInsFormData, setPatientInsFormData] = useState({
    patientId: '',
    patientName: '',
    insuranceCompanyId: '',
    policyNumber: '',
    policyHolderName: '',
    validFrom: '',
    validTill: '',
    sumInsured: 0
  });

  const [claimFormData, setClaimFormData] = useState({
    patientInsuranceId: '',
    admissionId: '',
    claimType: 'Cashless' as const,
    claimAmount: 0,
    documents: [] as string[]
  });

  const [preAuthFormData, setPreAuthFormData] = useState({
    patientInsuranceId: '',
    procedure: '',
    estimatedAmount: 0
  });

  useEffect(() => {
    fetchInsuranceCompanies();
    fetchPatientInsurances();
    fetchClaims();
    fetchPreAuths();
  }, []);

  const fetchInsuranceCompanies = async () => {
    try {
      const response = await api.get('/api/insurance-companies');
      setInsuranceCompanies(response.data);
    } catch (error) {
      console.error('Error fetching insurance companies:', error);
    }
  };

  const fetchPatientInsurances = async () => {
    try {
      const response = await api.get('/api/patient-insurances');
      setPatientInsurances(response.data);
    } catch (error) {
      console.error('Error fetching patient insurances:', error);
    }
  };

  const fetchClaims = async () => {
    try {
      const response = await api.get('/api/tpa/claims');
      setClaims(response.data);
    } catch (error) {
      console.error('Error fetching claims:', error);
    }
  };

  const fetchPreAuths = async () => {
    try {
      const response = await api.get('/api/tpa/pre-authorizations');
      setPreAuths(response.data);
    } catch (error) {
      console.error('Error fetching pre-authorizations:', error);
    }
  };

  const handleAddInsurance = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/insurance-companies', insuranceFormData);

      const newInsurance: InsuranceCompany = {
        id: response.data.id || Date.now().toString(),
        ...insuranceFormData,
        status: 'active'
      };

      setInsuranceCompanies([...insuranceCompanies, newInsurance]);
      setIsAddInsuranceDialogOpen(false);
      setInsuranceFormData({
        name: '',
        code: '',
        contact: '',
        email: '',
        address: ''
      });
      alert('Insurance company added successfully!');
    } catch (error) {
      console.error('Error adding insurance:', error);
      alert('Failed to add insurance company');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatientInsurance = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/patient-insurances', patientInsFormData);

      const company = insuranceCompanies.find(c => c.id === patientInsFormData.insuranceCompanyId);
      const newPatientIns: PatientInsurance = {
        id: response.data.id || Date.now().toString(),
        patientId: patientInsFormData.patientId,
        patientName: patientInsFormData.patientName,
        patientMRN: 'MRN' + Date.now().toString().slice(-6),
        insuranceCompanyId: patientInsFormData.insuranceCompanyId,
        insuranceCompanyName: company?.name || '',
        policyNumber: patientInsFormData.policyNumber,
        policyHolderName: patientInsFormData.policyHolderName,
        validFrom: patientInsFormData.validFrom,
        validTill: patientInsFormData.validTill,
        sumInsured: patientInsFormData.sumInsured,
        status: new Date(patientInsFormData.validTill) > new Date() ? 'active' : 'expired'
      };

      setPatientInsurances([...patientInsurances, newPatientIns]);
      setIsAddPatientInsDialogOpen(false);
      setPatientInsFormData({
        patientId: '',
        patientName: '',
        insuranceCompanyId: '',
        policyNumber: '',
        policyHolderName: '',
        validFrom: '',
        validTill: '',
        sumInsured: 0
      });
      alert('Patient insurance added successfully!');
    } catch (error) {
      console.error('Error adding patient insurance:', error);
      alert('Failed to add patient insurance');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClaim = async () => {
    setLoading(true);
    try {
      const patientIns = patientInsurances.find(p => p.id === claimFormData.patientInsuranceId);
      if (!patientIns) {
        alert('Please select patient insurance');
        return;
      }

      const claimData = {
        ...claimFormData,
        patientId: patientIns.patientId,
        patientName: patientIns.patientName,
        patientMRN: patientIns.patientMRN,
        insuranceCompanyId: patientIns.insuranceCompanyId,
        insuranceCompanyName: patientIns.insuranceCompanyName,
        policyNumber: patientIns.policyNumber
      };

      const response = await api.post('/api/tpa/claims', claimData);

      const newClaim: TPAClaim = {
        id: response.data.id || Date.now().toString(),
        claimNumber: 'CLM-' + Date.now().toString().slice(-8),
        patientId: patientIns.patientId,
        patientName: patientIns.patientName,
        patientMRN: patientIns.patientMRN,
        patientInsuranceId: claimFormData.patientInsuranceId,
        insuranceCompanyId: patientIns.insuranceCompanyId,
        insuranceCompanyName: patientIns.insuranceCompanyName,
        policyNumber: patientIns.policyNumber,
        admissionId: claimFormData.admissionId,
        claimType: claimFormData.claimType,
        claimAmount: claimFormData.claimAmount,
        approvedAmount: 0,
        rejectedAmount: 0,
        status: 'Submitted',
        submittedDate: new Date().toISOString(),
        documents: claimFormData.documents
      };

      setClaims([newClaim, ...claims]);
      setIsAddClaimDialogOpen(false);
      setClaimFormData({
        patientInsuranceId: '',
        admissionId: '',
        claimType: 'Cashless',
        claimAmount: 0,
        documents: []
      });
      alert('Claim submitted successfully!');
    } catch (error) {
      console.error('Error submitting claim:', error);
      alert('Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPreAuth = async () => {
    setLoading(true);
    try {
      const patientIns = patientInsurances.find(p => p.id === preAuthFormData.patientInsuranceId);
      if (!patientIns) {
        alert('Please select patient insurance');
        return;
      }

      const response = await api.post('/api/tpa/pre-authorizations', preAuthFormData);

      const newPreAuth: PreAuthorization = {
        id: response.data.id || Date.now().toString(),
        patientId: patientIns.patientId,
        patientName: patientIns.patientName,
        patientInsuranceId: preAuthFormData.patientInsuranceId,
        insuranceCompanyName: patientIns.insuranceCompanyName,
        policyNumber: patientIns.policyNumber,
        procedure: preAuthFormData.procedure,
        estimatedAmount: preAuthFormData.estimatedAmount,
        approvedAmount: 0,
        status: 'Pending',
        requestedDate: new Date().toISOString()
      };

      setPreAuths([newPreAuth, ...preAuths]);
      setIsPreAuthDialogOpen(false);
      setPreAuthFormData({
        patientInsuranceId: '',
        procedure: '',
        estimatedAmount: 0
      });
      alert('Pre-authorization request submitted successfully!');
    } catch (error) {
      console.error('Error submitting pre-auth:', error);
      alert('Failed to submit pre-authorization');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    activeInsurances: patientInsurances.filter(p => p.status === 'active').length,
    pendingClaims: claims.filter(c => c.status === 'Pending' || c.status === 'Submitted').length,
    approvedClaims: claims.filter(c => c.status === 'Approved').length,
    claimAmount: claims.reduce((sum, c) => sum + c.claimAmount, 0)
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">TPA & Insurance Management</h1>
          <p className="text-slate-600">Manage insurance claims and pre-authorizations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Insurances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeInsurances}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingClaims}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approved Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approvedClaims}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Claim Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Rs. {stats.claimAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="claims" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="preauth">Pre-Authorization</TabsTrigger>
          <TabsTrigger value="patient-ins">Patient Insurance</TabsTrigger>
          <TabsTrigger value="companies">Insurance Companies</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Claims Tab */}
        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Insurance Claims</CardTitle>
                  <CardDescription>Manage and track insurance claims</CardDescription>
                </div>
                <Dialog open={isAddClaimDialogOpen} onOpenChange={setIsAddClaimDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Submit Claim
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit Insurance Claim</DialogTitle>
                      <DialogDescription>File a new insurance claim</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Patient Insurance *</Label>
                        <Select value={claimFormData.patientInsuranceId} onValueChange={(value) => setClaimFormData(prev => ({ ...prev, patientInsuranceId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select patient insurance" />
                          </SelectTrigger>
                          <SelectContent>
                            {patientInsurances.filter(p => p.status === 'active').map(ins => (
                              <SelectItem key={ins.id} value={ins.id}>
                                {ins.patientName} - {ins.insuranceCompanyName} ({ins.policyNumber})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Claim Type *</Label>
                        <Select value={claimFormData.claimType} onValueChange={(value: any) => setClaimFormData(prev => ({ ...prev, claimType: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cashless">Cashless</SelectItem>
                            <SelectItem value="Reimbursement">Reimbursement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Admission ID (Optional)</Label>
                        <Input
                          value={claimFormData.admissionId}
                          onChange={(e) => setClaimFormData(prev => ({ ...prev, admissionId: e.target.value }))}
                          placeholder="ADM12345"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Claim Amount (Rs.) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={claimFormData.claimAmount}
                          onChange={(e) => setClaimFormData(prev => ({ ...prev, claimAmount: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddClaimDialogOpen(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmitClaim} disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Claim'}
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
                    <TableHead>Claim Number</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Insurance Company</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Claim Amount</TableHead>
                    <TableHead>Approved Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No claims submitted
                      </TableCell>
                    </TableRow>
                  ) : (
                    claims.map(claim => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.claimNumber}</TableCell>
                        <TableCell>
                          {claim.patientName}
                          <div className="text-xs text-slate-500">{claim.patientMRN}</div>
                        </TableCell>
                        <TableCell>{claim.insuranceCompanyName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{claim.claimType}</Badge>
                        </TableCell>
                        <TableCell>Rs. {claim.claimAmount.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          Rs. {claim.approvedAmount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            claim.status === 'Approved' ? 'default' :
                            claim.status === 'Rejected' ? 'destructive' :
                            'secondary'
                          }>
                            {claim.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(claim.submittedDate).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pre-Authorization Tab */}
        <TabsContent value="preauth">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Pre-Authorization Requests</CardTitle>
                  <CardDescription>Manage pre-authorization requests</CardDescription>
                </div>
                <Dialog open={isPreAuthDialogOpen} onOpenChange={setIsPreAuthDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Request Pre-Auth
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Pre-Authorization</DialogTitle>
                      <DialogDescription>Submit pre-authorization request</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Patient Insurance *</Label>
                        <Select value={preAuthFormData.patientInsuranceId} onValueChange={(value) => setPreAuthFormData(prev => ({ ...prev, patientInsuranceId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select patient insurance" />
                          </SelectTrigger>
                          <SelectContent>
                            {patientInsurances.filter(p => p.status === 'active').map(ins => (
                              <SelectItem key={ins.id} value={ins.id}>
                                {ins.patientName} - {ins.insuranceCompanyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Procedure/Treatment *</Label>
                        <Input
                          value={preAuthFormData.procedure}
                          onChange={(e) => setPreAuthFormData(prev => ({ ...prev, procedure: e.target.value }))}
                          placeholder="e.g., Knee Replacement Surgery"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estimated Amount (Rs.) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={preAuthFormData.estimatedAmount}
                          onChange={(e) => setPreAuthFormData(prev => ({ ...prev, estimatedAmount: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsPreAuthDialogOpen(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmitPreAuth} disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Request'}
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
                    <TableHead>Patient</TableHead>
                    <TableHead>Insurance</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Estimated Amount</TableHead>
                    <TableHead>Approved Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preAuths.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No pre-authorization requests
                      </TableCell>
                    </TableRow>
                  ) : (
                    preAuths.map(preAuth => (
                      <TableRow key={preAuth.id}>
                        <TableCell className="font-medium">{preAuth.patientName}</TableCell>
                        <TableCell>{preAuth.insuranceCompanyName}</TableCell>
                        <TableCell>{preAuth.procedure}</TableCell>
                        <TableCell>Rs. {preAuth.estimatedAmount.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          Rs. {preAuth.approvedAmount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            preAuth.status === 'Approved' ? 'default' :
                            preAuth.status === 'Rejected' ? 'destructive' :
                            'secondary'
                          }>
                            {preAuth.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(preAuth.requestedDate).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patient Insurance Tab */}
        <TabsContent value="patient-ins">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Patient Insurance Details</CardTitle>
                  <CardDescription>Manage patient insurance policies</CardDescription>
                </div>
                <Dialog open={isAddPatientInsDialogOpen} onOpenChange={setIsAddPatientInsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Patient Insurance
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Patient Insurance</DialogTitle>
                      <DialogDescription>Register patient insurance details</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Patient Name *</Label>
                        <Input
                          value={patientInsFormData.patientName}
                          onChange={(e) => setPatientInsFormData(prev => ({ ...prev, patientName: e.target.value }))}
                          placeholder="Enter patient name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Insurance Company *</Label>
                        <Select value={patientInsFormData.insuranceCompanyId} onValueChange={(value) => setPatientInsFormData(prev => ({ ...prev, insuranceCompanyId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                          <SelectContent>
                            {insuranceCompanies.filter(c => c.status === 'active').map(company => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Policy Number *</Label>
                        <Input
                          value={patientInsFormData.policyNumber}
                          onChange={(e) => setPatientInsFormData(prev => ({ ...prev, policyNumber: e.target.value }))}
                          placeholder="POL123456"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Policy Holder Name *</Label>
                        <Input
                          value={patientInsFormData.policyHolderName}
                          onChange={(e) => setPatientInsFormData(prev => ({ ...prev, policyHolderName: e.target.value }))}
                          placeholder="Policy holder name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valid From *</Label>
                        <Input
                          type="date"
                          value={patientInsFormData.validFrom}
                          onChange={(e) => setPatientInsFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valid Till *</Label>
                        <Input
                          type="date"
                          value={patientInsFormData.validTill}
                          onChange={(e) => setPatientInsFormData(prev => ({ ...prev, validTill: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Sum Insured (Rs.) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={patientInsFormData.sumInsured}
                          onChange={(e) => setPatientInsFormData(prev => ({ ...prev, sumInsured: parseFloat(e.target.value) || 0 }))}
                          placeholder="500000"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddPatientInsDialogOpen(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddPatientInsurance} disabled={loading}>
                        {loading ? 'Adding...' : 'Add Insurance'}
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
                    <TableHead>Patient</TableHead>
                    <TableHead>Insurance Company</TableHead>
                    <TableHead>Policy Number</TableHead>
                    <TableHead>Policy Holder</TableHead>
                    <TableHead>Valid Till</TableHead>
                    <TableHead>Sum Insured</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientInsurances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No patient insurances registered
                      </TableCell>
                    </TableRow>
                  ) : (
                    patientInsurances.map(ins => (
                      <TableRow key={ins.id}>
                        <TableCell className="font-medium">
                          {ins.patientName}
                          <div className="text-xs text-slate-500">{ins.patientMRN}</div>
                        </TableCell>
                        <TableCell>{ins.insuranceCompanyName}</TableCell>
                        <TableCell>{ins.policyNumber}</TableCell>
                        <TableCell>{ins.policyHolderName}</TableCell>
                        <TableCell>{new Date(ins.validTill).toLocaleDateString()}</TableCell>
                        <TableCell>Rs. {ins.sumInsured.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={ins.status === 'active' ? 'default' : 'destructive'}>
                            {ins.status}
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

        {/* Insurance Companies Tab */}
        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Insurance Companies</CardTitle>
                  <CardDescription>Manage insurance company master data</CardDescription>
                </div>
                <Dialog open={isAddInsuranceDialogOpen} onOpenChange={setIsAddInsuranceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Insurance Company
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Insurance Company</DialogTitle>
                      <DialogDescription>Register new insurance company</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Company Name *</Label>
                        <Input
                          value={insuranceFormData.name}
                          onChange={(e) => setInsuranceFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="HDFC ERGO"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Company Code *</Label>
                        <Input
                          value={insuranceFormData.code}
                          onChange={(e) => setInsuranceFormData(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="HDFC"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Number *</Label>
                        <Input
                          value={insuranceFormData.contact}
                          onChange={(e) => setInsuranceFormData(prev => ({ ...prev, contact: e.target.value }))}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={insuranceFormData.email}
                          onChange={(e) => setInsuranceFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="contact@insurance.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Input
                          value={insuranceFormData.address}
                          onChange={(e) => setInsuranceFormData(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Company address"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddInsuranceDialogOpen(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddInsurance} disabled={loading}>
                        {loading ? 'Adding...' : 'Add Company'}
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
                    <TableHead>Company Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insuranceCompanies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No insurance companies registered
                      </TableCell>
                    </TableRow>
                  ) : (
                    insuranceCompanies.map(company => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.code}</TableCell>
                        <TableCell>{company.contact}</TableCell>
                        <TableCell>{company.email}</TableCell>
                        <TableCell>
                          <Badge variant={company.status === 'active' ? 'default' : 'destructive'}>
                            {company.status}
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

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>TPA & Insurance Reports</CardTitle>
              <CardDescription>Claims and insurance analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Claim Status Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between p-2 bg-orange-50 rounded">
                        <span>Pending:</span>
                        <span className="font-bold">{claims.filter(c => c.status === 'Pending' || c.status === 'Submitted').length}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-green-50 rounded">
                        <span>Approved:</span>
                        <span className="font-bold">{claims.filter(c => c.status === 'Approved').length}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-red-50 rounded">
                        <span>Rejected:</span>
                        <span className="font-bold">{claims.filter(c => c.status === 'Rejected').length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Claim Amounts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between p-2 bg-blue-50 rounded">
                        <span>Total Claimed:</span>
                        <span className="font-bold">Rs. {claims.reduce((sum, c) => sum + c.claimAmount, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-green-50 rounded">
                        <span>Total Approved:</span>
                        <span className="font-bold text-green-600">Rs. {claims.reduce((sum, c) => sum + c.approvedAmount, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-red-50 rounded">
                        <span>Total Rejected:</span>
                        <span className="font-bold text-red-600">Rs. {claims.reduce((sum, c) => sum + c.rejectedAmount, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
