import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  GraduationCap,
  FileCheck,
  User,
  Building,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import api from '../services/api';

interface Qualification {
  id?: string;
  degree: string;
  specialization?: string;
  institution: string;
  university?: string;
  yearOfPassing: number;
  country: string;
  certificateNo?: string;
  certificateUrl?: string;
  isVerified: boolean;
  isPrimary: boolean;
}

interface License {
  id?: string;
  licenseType: string;
  licenseNumber: string;
  issuingAuthority: string;
  issuingState?: string;
  issueDate: string;
  expiryDate?: string;
  renewalDate?: string;
  status: string;
  licenseUrl?: string;
  isVerified: boolean;
  remarks?: string;
}

interface Doctor {
  id?: string;
  employeeId: string;
  name: string;
  email?: string;
  phone?: string;
  specialty: string;
  department: string;
  designation?: string;
  gender?: string;
  dateOfBirth?: string;
  dateOfJoining?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  experience?: number;
  consultationFee?: number;
  followUpFee?: number;
  emergencyFee?: number;
  availableSlots?: number;
  slotDuration?: number;
  bio?: string;
  languages?: string[];
  isActive: boolean;
  isOnLeave: boolean;
  qualifications?: Qualification[];
  licenses?: License[];
  qualificationDisplay?: string;
}

interface ReferenceData {
  degrees: { code: string; name: string; category: string }[];
  licenseTypes: { code: string; name: string; authority: string }[];
  designations: string[];
  specialties: string[];
}

const initialDoctor: Doctor = {
  employeeId: '',
  name: '',
  email: '',
  phone: '',
  specialty: '',
  department: '',
  designation: '',
  gender: '',
  experience: 0,
  consultationFee: 0,
  followUpFee: 0,
  emergencyFee: 0,
  availableSlots: 20,
  slotDuration: 15,
  bio: '',
  languages: [],
  isActive: true,
  isOnLeave: false,
  qualifications: [],
  licenses: [],
};

const initialQualification: Qualification = {
  degree: '',
  specialization: '',
  institution: '',
  university: '',
  yearOfPassing: new Date().getFullYear(),
  country: 'India',
  certificateNo: '',
  isVerified: false,
  isPrimary: false,
};

const initialLicense: License = {
  licenseType: 'medical_council',
  licenseNumber: '',
  issuingAuthority: '',
  issuingState: '',
  issueDate: new Date().toISOString().split('T')[0],
  expiryDate: '',
  status: 'active',
  isVerified: false,
};

export default function DoctorManagement() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showQualificationDialog, setShowQualificationDialog] = useState(false);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);

  // Form states
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [doctorForm, setDoctorForm] = useState<Doctor>(initialDoctor);
  const [qualificationForm, setQualificationForm] = useState<Qualification>(initialQualification);
  const [licenseForm, setLicenseForm] = useState<License>(initialLicense);
  const [activeTab, setActiveTab] = useState('basic');
  const [editingQualificationIndex, setEditingQualificationIndex] = useState<number | null>(null);
  const [editingLicenseIndex, setEditingLicenseIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchDoctors();
    fetchReferenceData();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/doctors-management?includeDetails=true');
      setDoctors(response.data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const response = await api.get('/api/doctors-management/reference/degrees');
      setReferenceData(response.data);
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  const handleSaveDoctor = async () => {
    try {
      if (!doctorForm.employeeId || !doctorForm.name || !doctorForm.specialty || !doctorForm.department) {
        alert('Please fill required fields: Employee ID, Name, Specialty, Department');
        return;
      }

      if (doctorForm.id) {
        await api.put(`/api/doctors-management/${doctorForm.id}`, doctorForm);
      } else {
        await api.post('/api/doctors-management', doctorForm);
      }

      setShowAddDialog(false);
      setDoctorForm(initialDoctor);
      fetchDoctors();
    } catch (error: any) {
      console.error('Error saving doctor:', error);
      alert(error.response?.data?.error || 'Failed to save doctor');
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this doctor?')) return;

    try {
      await api.delete(`/api/doctors-management/${id}`);
      fetchDoctors();
    } catch (error) {
      console.error('Error deleting doctor:', error);
    }
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setDoctorForm({
      ...doctor,
      dateOfBirth: doctor.dateOfBirth ? new Date(doctor.dateOfBirth).toISOString().split('T')[0] : '',
      dateOfJoining: doctor.dateOfJoining ? new Date(doctor.dateOfJoining).toISOString().split('T')[0] : '',
    });
    setActiveTab('basic');
    setShowAddDialog(true);
  };

  const handleViewDoctor = async (doctor: Doctor) => {
    try {
      const response = await api.get(`/api/doctors-management/${doctor.id}`);
      setSelectedDoctor(response.data);
      setShowViewDialog(true);
    } catch (error) {
      console.error('Error fetching doctor details:', error);
    }
  };

  const handleAddQualification = () => {
    setQualificationForm(initialQualification);
    setEditingQualificationIndex(null);
    setShowQualificationDialog(true);
  };

  const handleEditQualification = (index: number) => {
    const qual = doctorForm.qualifications?.[index];
    if (qual) {
      setQualificationForm(qual);
      setEditingQualificationIndex(index);
      setShowQualificationDialog(true);
    }
  };

  const handleSaveQualification = () => {
    if (!qualificationForm.degree || !qualificationForm.institution || !qualificationForm.yearOfPassing) {
      alert('Please fill required fields: Degree, Institution, Year');
      return;
    }

    const updatedQualifications = [...(doctorForm.qualifications || [])];
    if (editingQualificationIndex !== null) {
      updatedQualifications[editingQualificationIndex] = qualificationForm;
    } else {
      // First qualification is primary
      if (updatedQualifications.length === 0) {
        qualificationForm.isPrimary = true;
      }
      updatedQualifications.push(qualificationForm);
    }

    setDoctorForm({ ...doctorForm, qualifications: updatedQualifications });
    setShowQualificationDialog(false);
    setQualificationForm(initialQualification);
  };

  const handleDeleteQualification = (index: number) => {
    const updatedQualifications = doctorForm.qualifications?.filter((_, i) => i !== index) || [];
    setDoctorForm({ ...doctorForm, qualifications: updatedQualifications });
  };

  const handleAddLicense = () => {
    setLicenseForm(initialLicense);
    setEditingLicenseIndex(null);
    setShowLicenseDialog(true);
  };

  const handleEditLicense = (index: number) => {
    const lic = doctorForm.licenses?.[index];
    if (lic) {
      setLicenseForm({
        ...lic,
        issueDate: lic.issueDate ? new Date(lic.issueDate).toISOString().split('T')[0] : '',
        expiryDate: lic.expiryDate ? new Date(lic.expiryDate).toISOString().split('T')[0] : '',
      });
      setEditingLicenseIndex(index);
      setShowLicenseDialog(true);
    }
  };

  const handleSaveLicense = () => {
    if (!licenseForm.licenseNumber || !licenseForm.issuingAuthority || !licenseForm.issueDate) {
      alert('Please fill required fields: License Number, Issuing Authority, Issue Date');
      return;
    }

    const updatedLicenses = [...(doctorForm.licenses || [])];
    if (editingLicenseIndex !== null) {
      updatedLicenses[editingLicenseIndex] = licenseForm;
    } else {
      updatedLicenses.push(licenseForm);
    }

    setDoctorForm({ ...doctorForm, licenses: updatedLicenses });
    setShowLicenseDialog(false);
    setLicenseForm(initialLicense);
  };

  const handleDeleteLicense = (index: number) => {
    const updatedLicenses = doctorForm.licenses?.filter((_, i) => i !== index) || [];
    setDoctorForm({ ...doctorForm, licenses: updatedLicenses });
  };

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = !searchTerm ||
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || doctor.department === filterDepartment;
    const matchesSpecialty = !filterSpecialty || doctor.specialty === filterSpecialty;
    return matchesSearch && matchesDepartment && matchesSpecialty;
  });

  const departments = [...new Set(doctors.map(d => d.department))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Doctor Management</h1>
          <p className="text-gray-500">Manage doctors, qualifications, and licenses</p>
        </div>
        <Button onClick={() => { setDoctorForm(initialDoctor); setActiveTab('basic'); setShowAddDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Doctor
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, ID, specialty..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterDepartment || "all"} onValueChange={(v) => setFilterDepartment(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSpecialty || "all"} onValueChange={(v) => setFilterSpecialty(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {referenceData?.specialties.map(spec => (
                  <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearchTerm(''); setFilterDepartment(''); setFilterSpecialty(''); }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Doctors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Doctors ({filteredDoctors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Doctor Name</TableHead>
                <TableHead>Qualifications</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>License Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredDoctors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">No doctors found</TableCell>
                </TableRow>
              ) : (
                filteredDoctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">{doctor.employeeId}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{doctor.name}</div>
                        {doctor.designation && <div className="text-sm text-gray-500">{doctor.designation}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {doctor.qualifications?.slice(0, 3).map((q, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {q.degree}
                          </Badge>
                        ))}
                        {(doctor.qualifications?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(doctor.qualifications?.length || 0) - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{doctor.specialty}</TableCell>
                    <TableCell>{doctor.department}</TableCell>
                    <TableCell>
                      {doctor.licenses?.some(l => l.status === 'active') ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" /> Valid
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" /> No License
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {doctor.isOnLeave ? (
                        <Badge variant="outline" className="bg-yellow-50">On Leave</Badge>
                      ) : doctor.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleViewDoctor(doctor)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEditDoctor(doctor)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => doctor.id && handleDeleteDoctor(doctor.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Doctor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{doctorForm.id ? 'Edit Doctor' : 'Add New Doctor'}</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic"><User className="w-4 h-4 mr-2" /> Basic Info</TabsTrigger>
              <TabsTrigger value="professional"><Building className="w-4 h-4 mr-2" /> Professional</TabsTrigger>
              <TabsTrigger value="qualifications"><GraduationCap className="w-4 h-4 mr-2" /> Qualifications</TabsTrigger>
              <TabsTrigger value="licenses"><FileCheck className="w-4 h-4 mr-2" /> Licenses</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Employee ID *</Label>
                  <Input
                    value={doctorForm.employeeId}
                    onChange={(e) => setDoctorForm({ ...doctorForm, employeeId: e.target.value })}
                    placeholder="DOC001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={doctorForm.name}
                    onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                    placeholder="Dr. John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={doctorForm.gender || ''} onValueChange={(v) => setDoctorForm({ ...doctorForm, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={doctorForm.email || ''}
                    onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                    placeholder="doctor@hospital.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={doctorForm.phone || ''}
                    onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={doctorForm.dateOfBirth || ''}
                    onChange={(e) => setDoctorForm({ ...doctorForm, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={doctorForm.address || ''}
                    onChange={(e) => setDoctorForm({ ...doctorForm, address: e.target.value })}
                    placeholder="Street address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={doctorForm.city || ''}
                    onChange={(e) => setDoctorForm({ ...doctorForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={doctorForm.state || ''}
                    onChange={(e) => setDoctorForm({ ...doctorForm, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>PIN Code</Label>
                  <Input
                    value={doctorForm.pinCode || ''}
                    onChange={(e) => setDoctorForm({ ...doctorForm, pinCode: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="professional" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Select value={doctorForm.department} onValueChange={(v) => setDoctorForm({ ...doctorForm, department: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                    <SelectContent>
                      {referenceData?.specialties.map(spec => (
                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Specialty *</Label>
                  <Select value={doctorForm.specialty} onValueChange={(v) => setDoctorForm({ ...doctorForm, specialty: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Specialty" /></SelectTrigger>
                    <SelectContent>
                      {referenceData?.specialties.map(spec => (
                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Select value={doctorForm.designation || ''} onValueChange={(v) => setDoctorForm({ ...doctorForm, designation: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Designation" /></SelectTrigger>
                    <SelectContent>
                      {referenceData?.designations.map(des => (
                        <SelectItem key={des} value={des}>{des}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date of Joining</Label>
                  <Input
                    type="date"
                    value={doctorForm.dateOfJoining || ''}
                    onChange={(e) => setDoctorForm({ ...doctorForm, dateOfJoining: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Experience (Years)</Label>
                  <Input
                    type="number"
                    value={doctorForm.experience || ''}
                    onChange={(e) => setDoctorForm({ ...doctorForm, experience: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Available Slots/Day</Label>
                  <Input
                    type="number"
                    value={doctorForm.availableSlots || 20}
                    onChange={(e) => setDoctorForm({ ...doctorForm, availableSlots: parseInt(e.target.value) || 20 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Consultation Fee</Label>
                  <Input
                    type="number"
                    value={doctorForm.consultationFee || ''}
                    onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Follow-up Fee</Label>
                  <Input
                    type="number"
                    value={doctorForm.followUpFee || ''}
                    onChange={(e) => setDoctorForm({ ...doctorForm, followUpFee: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Fee</Label>
                  <Input
                    type="number"
                    value={doctorForm.emergencyFee || ''}
                    onChange={(e) => setDoctorForm({ ...doctorForm, emergencyFee: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>Bio / About</Label>
                  <textarea
                    className="w-full border rounded-md p-2 min-h-[100px]"
                    value={doctorForm.bio || ''}
                    onChange={(e) => setDoctorForm({ ...doctorForm, bio: e.target.value })}
                    placeholder="Brief description about the doctor..."
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="qualifications" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Qualifications / Degrees</h3>
                <Button size="sm" onClick={handleAddQualification}>
                  <Plus className="w-4 h-4 mr-2" /> Add Qualification
                </Button>
              </div>

              {(doctorForm.qualifications?.length || 0) === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  <GraduationCap className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No qualifications added yet</p>
                  <Button variant="link" onClick={handleAddQualification}>Add first qualification</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Degree</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorForm.qualifications?.map((qual, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{qual.degree}</TableCell>
                        <TableCell>{qual.specialization || '-'}</TableCell>
                        <TableCell>{qual.institution}</TableCell>
                        <TableCell>{qual.yearOfPassing}</TableCell>
                        <TableCell>
                          {qual.isPrimary && <Badge className="bg-blue-100 text-blue-800">Primary</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEditQualification(index)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteQualification(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="licenses" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Licenses & Registrations</h3>
                <Button size="sm" onClick={handleAddLicense}>
                  <Plus className="w-4 h-4 mr-2" /> Add License
                </Button>
              </div>

              {(doctorForm.licenses?.length || 0) === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  <FileCheck className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No licenses added yet</p>
                  <Button variant="link" onClick={handleAddLicense}>Add first license</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>License Type</TableHead>
                      <TableHead>License Number</TableHead>
                      <TableHead>Issuing Authority</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorForm.licenses?.map((lic, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {referenceData?.licenseTypes.find(lt => lt.code === lic.licenseType)?.name || lic.licenseType}
                        </TableCell>
                        <TableCell>{lic.licenseNumber}</TableCell>
                        <TableCell>{lic.issuingAuthority}</TableCell>
                        <TableCell>{new Date(lic.issueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {lic.expiryDate ? new Date(lic.expiryDate).toLocaleDateString() : 'Lifetime'}
                        </TableCell>
                        <TableCell>
                          <Badge className={lic.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {lic.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEditLicense(index)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteLicense(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveDoctor}>Save Doctor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Qualification Dialog */}
      <Dialog open={showQualificationDialog} onOpenChange={setShowQualificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingQualificationIndex !== null ? 'Edit' : 'Add'} Qualification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Degree *</Label>
                <Select value={qualificationForm.degree} onValueChange={(v) => setQualificationForm({ ...qualificationForm, degree: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Degree" /></SelectTrigger>
                  <SelectContent>
                    {referenceData?.degrees.map(deg => (
                      <SelectItem key={deg.code} value={deg.code}>{deg.code} - {deg.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input
                  value={qualificationForm.specialization || ''}
                  onChange={(e) => setQualificationForm({ ...qualificationForm, specialization: e.target.value })}
                  placeholder="e.g., Cardiology"
                />
              </div>
              <div className="space-y-2">
                <Label>Institution *</Label>
                <Input
                  value={qualificationForm.institution}
                  onChange={(e) => setQualificationForm({ ...qualificationForm, institution: e.target.value })}
                  placeholder="Medical College Name"
                />
              </div>
              <div className="space-y-2">
                <Label>University</Label>
                <Input
                  value={qualificationForm.university || ''}
                  onChange={(e) => setQualificationForm({ ...qualificationForm, university: e.target.value })}
                  placeholder="University Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Year of Passing *</Label>
                <Input
                  type="number"
                  value={qualificationForm.yearOfPassing}
                  onChange={(e) => setQualificationForm({ ...qualificationForm, yearOfPassing: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={qualificationForm.country}
                  onChange={(e) => setQualificationForm({ ...qualificationForm, country: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Certificate Number</Label>
                <Input
                  value={qualificationForm.certificateNo || ''}
                  onChange={(e) => setQualificationForm({ ...qualificationForm, certificateNo: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={qualificationForm.isPrimary}
                  onChange={(e) => setQualificationForm({ ...qualificationForm, isPrimary: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isPrimary">Primary Qualification</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQualificationDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveQualification}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* License Dialog */}
      <Dialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLicenseIndex !== null ? 'Edit' : 'Add'} License</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License Type *</Label>
                <Select value={licenseForm.licenseType} onValueChange={(v) => setLicenseForm({ ...licenseForm, licenseType: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent>
                    {referenceData?.licenseTypes.map(lt => (
                      <SelectItem key={lt.code} value={lt.code}>{lt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>License/Registration Number *</Label>
                <Input
                  value={licenseForm.licenseNumber}
                  onChange={(e) => setLicenseForm({ ...licenseForm, licenseNumber: e.target.value })}
                  placeholder="MCI/2020/12345"
                />
              </div>
              <div className="space-y-2">
                <Label>Issuing Authority *</Label>
                <Input
                  value={licenseForm.issuingAuthority}
                  onChange={(e) => setLicenseForm({ ...licenseForm, issuingAuthority: e.target.value })}
                  placeholder="Medical Council of India"
                />
              </div>
              <div className="space-y-2">
                <Label>Issuing State</Label>
                <Input
                  value={licenseForm.issuingState || ''}
                  onChange={(e) => setLicenseForm({ ...licenseForm, issuingState: e.target.value })}
                  placeholder="State (if applicable)"
                />
              </div>
              <div className="space-y-2">
                <Label>Issue Date *</Label>
                <Input
                  type="date"
                  value={licenseForm.issueDate}
                  onChange={(e) => setLicenseForm({ ...licenseForm, issueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={licenseForm.expiryDate || ''}
                  onChange={(e) => setLicenseForm({ ...licenseForm, expiryDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={licenseForm.status} onValueChange={(v) => setLicenseForm({ ...licenseForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Renewal Date</Label>
                <Input
                  type="date"
                  value={licenseForm.renewalDate || ''}
                  onChange={(e) => setLicenseForm({ ...licenseForm, renewalDate: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Remarks</Label>
                <Input
                  value={licenseForm.remarks || ''}
                  onChange={(e) => setLicenseForm({ ...licenseForm, remarks: e.target.value })}
                  placeholder="Any additional notes"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLicenseDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveLicense}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Doctor Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Doctor Details</DialogTitle>
          </DialogHeader>
          {selectedDoctor && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-500">Employee ID</Label>
                  <p className="font-medium">{selectedDoctor.employeeId}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Name</Label>
                  <p className="font-medium">{selectedDoctor.name}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Designation</Label>
                  <p className="font-medium">{selectedDoctor.designation || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Department</Label>
                  <p className="font-medium">{selectedDoctor.department}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Specialty</Label>
                  <p className="font-medium">{selectedDoctor.specialty}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Experience</Label>
                  <p className="font-medium">{selectedDoctor.experience ? `${selectedDoctor.experience} years` : '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Email</Label>
                  <p className="font-medium">{selectedDoctor.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Phone</Label>
                  <p className="font-medium">{selectedDoctor.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Consultation Fee</Label>
                  <p className="font-medium">{selectedDoctor.consultationFee ? `₹${selectedDoctor.consultationFee}` : '-'}</p>
                </div>
              </div>

              {/* Qualifications */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" /> Qualifications
                </h3>
                {selectedDoctor.qualifications?.length ? (
                  <div className="space-y-2">
                    {selectedDoctor.qualifications.map((qual, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {qual.degree}
                            {qual.specialization && ` (${qual.specialization})`}
                            {qual.isPrimary && <Badge className="ml-2 bg-blue-100 text-blue-800">Primary</Badge>}
                          </div>
                          <div className="text-sm text-gray-500">
                            {qual.institution}{qual.university && ` - ${qual.university}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            Year: {qual.yearOfPassing} | {qual.country}
                          </div>
                        </div>
                        {qual.isVerified && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" /> Verified
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No qualifications on record</p>
                )}
              </div>

              {/* Licenses */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileCheck className="w-5 h-5" /> Licenses & Registrations
                </h3>
                {selectedDoctor.licenses?.length ? (
                  <div className="space-y-2">
                    {selectedDoctor.licenses.map((lic, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg flex justify-between items-start">
                        <div>
                          <div className="font-medium">{lic.licenseNumber}</div>
                          <div className="text-sm text-gray-500">{lic.issuingAuthority}</div>
                          <div className="text-sm text-gray-500">
                            Issued: {new Date(lic.issueDate).toLocaleDateString()}
                            {lic.expiryDate && ` | Expires: ${new Date(lic.expiryDate).toLocaleDateString()}`}
                          </div>
                        </div>
                        <Badge className={lic.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {lic.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No licenses on record</p>
                )}
              </div>

              {/* Bio */}
              {selectedDoctor.bio && (
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-gray-600">{selectedDoctor.bio}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
            <Button onClick={() => { setShowViewDialog(false); selectedDoctor && handleEditDoctor(selectedDoctor); }}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
