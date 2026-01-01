import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, FileText, Fingerprint, Eye } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  bloodGroup: string;
  registrationDate: string;
  status: string;
}

export default function PatientRegistration() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [referralSources, setReferralSources] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    mrn: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    bloodGroup: '',
    emergencyContact: '',
    emergencyPhone: '',
    idProofType: '',
    idProofNumber: '',
    insuranceProvider: '',
    insuranceNumber: '',
    allergies: '',
    chronicConditions: '',
    referralSourceId: ''
  });

  useEffect(() => {
    fetchPatients();
    fetchReferralSources();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await api.get('/api/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchReferralSources = async () => {
    try {
      const response = await api.get('/api/referral-sources');
      setReferralSources(response.data);
    } catch (error) {
      console.error('Error fetching referral sources:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Guard against autofill events with undefined/empty name
    if (!name) return;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        dob: formData.dateOfBirth || null,
        gender: formData.gender,
        contact: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        bloodGroup: formData.bloodGroup || null,
        allergies: formData.allergies || null,
        referralSourceId: formData.referralSourceId || null,
      };

      await api.post('/api/patients', payload);
      await fetchPatients(); // Refresh the list
      setIsDialogOpen(false);
      setFormData({
        mrn: '', firstName: '', lastName: '', dateOfBirth: '', age: '', gender: '',
        phone: '', email: '', address: '', city: '', state: '', zipCode: '', country: '',
        bloodGroup: '', emergencyContact: '', emergencyPhone: '', idProofType: '',
        idProofNumber: '', insuranceProvider: '', insuranceNumber: '', allergies: '',
        chronicConditions: '', referralSourceId: ''
      });
    } catch (error) {
      console.error('Error creating patient:', error);
      alert('Failed to create patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsViewDialogOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    const [firstName, ...lastNameParts] = patient.name.split(' ');
    setFormData({
      mrn: patient.mrn,
      firstName: firstName || '',
      lastName: lastNameParts.join(' ') || '',
      dateOfBirth: '',
      age: String(patient.age),
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      city: '',
      state: '',
      zipCode: '',
      country: '',
      bloodGroup: patient.bloodGroup,
      emergencyContact: '',
      emergencyPhone: '',
      idProofType: '',
      idProofNumber: '',
      insuranceProvider: '',
      insuranceNumber: '',
      allergies: '',
      chronicConditions: '',
      referralSourceId: ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePatient = async () => {
    if (!selectedPatient) return;
    setLoading(true);
    try {
      const payload = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        contact: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        bloodGroup: formData.bloodGroup || null,
      };

      await api.put(`/api/patients/${selectedPatient.id}`, payload);
      await fetchPatients();
      setIsEditDialogOpen(false);
      setSelectedPatient(null);
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Failed to update patient.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = (patient: Patient) => {
    navigate(`/billing?patientId=${patient.id}&patientMRN=${patient.mrn}&patientName=${encodeURIComponent(patient.name)}`);
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patient Registration</h1>
          <p className="text-slate-600">Register new patients and manage demographics</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Register New Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Patient Registration Form</DialogTitle>
              <DialogDescription>
                Complete patient demographics and identification information
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="mrn">MRN (Medical Record Number)</Label>
                <Input id="mrn" name="mrn" value={formData.mrn} onChange={handleInputChange} placeholder="Auto-generated if empty" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" name="age" type="number" value={formData.age} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" value={formData.address} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" value={formData.city} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" value={formData.state} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code</Label>
                <Input id="zipCode" name="zipCode" value={formData.zipCode} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" value={formData.country} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Select value={formData.bloodGroup} onValueChange={(value) => setFormData(prev => ({ ...prev, bloodGroup: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="referralSource">Referral Source</Label>
                <Select value={formData.referralSourceId} onValueChange={(value) => setFormData(prev => ({ ...prev, referralSourceId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select referral source" />
                  </SelectTrigger>
                  <SelectContent>
                    {referralSources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name} ({source.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                <Input id="emergencyContact" name="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                <Input id="emergencyPhone" name="emergencyPhone" type="tel" value={formData.emergencyPhone} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idProofType">ID Proof Type</Label>
                <Select value={formData.idProofType} onValueChange={(value) => setFormData(prev => ({ ...prev, idProofType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers-license">Driver's License</SelectItem>
                    <SelectItem value="national-id">National ID</SelectItem>
                    <SelectItem value="ssn">SSN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="idProofNumber">ID Proof Number</Label>
                <Input id="idProofNumber" name="idProofNumber" value={formData.idProofNumber} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                <Input id="insuranceProvider" name="insuranceProvider" value={formData.insuranceProvider} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceNumber">Insurance Number</Label>
                <Input id="insuranceNumber" name="insuranceNumber" value={formData.insuranceNumber} onChange={handleInputChange} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="allergies">Known Allergies</Label>
                <Input id="allergies" name="allergies" value={formData.allergies} onChange={handleInputChange} placeholder="e.g., Penicillin, Peanuts" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="chronicConditions">Chronic Conditions</Label>
                <Input id="chronicConditions" name="chronicConditions" value={formData.chronicConditions} onChange={handleInputChange} placeholder="e.g., Diabetes, Hypertension" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Registering...' : 'Register Patient'}
              </Button>
              <Button variant="secondary" className="gap-2" disabled={loading}>
                <Fingerprint className="w-4 h-4" />
                Capture Biometric
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Registered Patients</CardTitle>
              <CardDescription>Search and manage patient records</CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, MRN, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MRN</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Age/Gender</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">{patient.mrn}</TableCell>
                  <TableCell>{patient.name}</TableCell>
                  <TableCell>{patient.age}Y / {patient.gender}</TableCell>
                  <TableCell>{patient.phone}</TableCell>
                  <TableCell>{patient.bloodGroup}</TableCell>
                  <TableCell>{patient.registrationDate}</TableCell>
                  <TableCell>
                    <Badge variant={patient.status === 'Active' ? 'default' : 'secondary'}>
                      {patient.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewPatient(patient)} title="View Details">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditPatient(patient)} title="Edit Patient">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleCreateInvoice(patient)} title="Create Invoice">
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Patient Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
            <DialogDescription>Complete patient information</DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label className="text-sm font-semibold">MRN</Label>
                <p className="text-sm">{selectedPatient.mrn}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Name</Label>
                <p className="text-sm">{selectedPatient.name}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Age</Label>
                <p className="text-sm">{selectedPatient.age} years</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Gender</Label>
                <p className="text-sm">{selectedPatient.gender}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Phone</Label>
                <p className="text-sm">{selectedPatient.phone}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Email</Label>
                <p className="text-sm">{selectedPatient.email || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-semibold">Address</Label>
                <p className="text-sm">{selectedPatient.address || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Blood Group</Label>
                <p className="text-sm">{selectedPatient.bloodGroup || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Registration Date</Label>
                <p className="text-sm">{selectedPatient.registrationDate}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient Information</DialogTitle>
            <DialogDescription>Update patient demographics</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name *</Label>
              <Input id="edit-firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name *</Label>
              <Input id="edit-lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gender">Gender *</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number *</Label>
              <Input id="edit-phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bloodGroup">Blood Group</Label>
              <Select value={formData.bloodGroup} onValueChange={(value) => setFormData(prev => ({ ...prev, bloodGroup: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" name="address" value={formData.address} onChange={handleInputChange} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleUpdatePatient} disabled={loading}>
              {loading ? 'Updating...' : 'Update Patient'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
