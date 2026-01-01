import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search, Calendar, RefreshCw, Printer, Save, X, Clock, User,
  ChevronLeft, ChevronRight, Camera, Upload
} from 'lucide-react';
import api from '../services/api';

// Interfaces
interface Patient {
  id: string;
  mrn: string;
  name: string;
  fatherName?: string;
  gender: string;
  dob?: string;
  age?: number;
  contact?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  bloodGroup?: string;
  occupation?: string;
  maritalStatus?: string;
  nationality?: string;
  identityType?: string;
  identityNumber?: string;
  isMLC?: boolean;
  hasAllergy?: boolean;
  allergies?: string;
  referralName?: string;
  referralPhone?: string;
  photo?: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  department: string;
  availableSlots?: number;
  occupiedSlots?: number;
  schedule?: string;
  photo?: string;
}

interface Department {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  code: string;
  price: number;
  department?: string;
  category?: string;
}

interface BillItem {
  id: string;
  serviceId: string;
  serviceName: string;
  amount: number;
  quantity: number;
  discount: number;
  payerAmount: number;
  patientAmount: number;
}

interface Bill {
  id: string;
  billNo: string;
  receiptNo?: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  age?: number;
  gender?: string;
  mobile?: string;
  payerId?: string;
  payerName?: string;
  doctorId?: string;
  doctorName?: string;
  referralName?: string;
  items: BillItem[];
  totalAmount: number;
  patientPayable: number;
  receivedAmount: number;
  balanceAmount: number;
  status: string;
  createdAt: string;
}

interface Tariff {
  id: string;
  serviceName: string;
  serviceCode: string;
  department: string;
  payerName: string;
  price: number;
  effectiveFrom: string;
}

interface CollectionReport {
  date: string;
  totalBills: number;
  totalAmount: number;
  cashAmount: number;
  cardAmount: number;
  insuranceAmount: number;
  refundAmount: number;
  netCollection: number;
}

// Helper to generate calendar days
const generateCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDay = firstDay.getDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  return days;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function OPDManagement() {
  const [activeTab, setActiveTab] = useState('registration');
  const [loading, setLoading] = useState(false);

  // Patient Registration State
  const [patientForm, setPatientForm] = useState<Partial<Patient>>({
    mrn: '',
    name: '',
    fatherName: '',
    gender: '',
    dob: '',
    contact: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pinCode: '',
    bloodGroup: '',
    occupation: '',
    maritalStatus: '',
    nationality: '',
    identityType: '',
    identityNumber: '',
    isMLC: false,
    hasAllergy: false,
    allergies: '',
    referralName: '',
    referralPhone: ''
  });
  const [registrationTab, setRegistrationTab] = useState('address');

  // Assign Doctor State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<number | null>(new Date().getDate());
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [doctorTab, setDoctorTab] = useState<'department' | 'doctor'>('department');

  // Patient Search State
  const [searchParams, setSearchParams] = useState({
    mrn: '',
    name: '',
    city: '',
    mobile: ''
  });
  const [searchResults, setSearchResults] = useState<Patient[]>([]);

  // OPD Billing State
  const [billSearchType, setBillSearchType] = useState<'uhid' | 'billNo' | 'receiptNo'>('uhid');
  const [billSearchValue, setBillSearchValue] = useState('');
  const [currentBill, setCurrentBill] = useState<Partial<Bill>>({
    items: [],
    totalAmount: 0,
    patientPayable: 0,
    receivedAmount: 0,
    balanceAmount: 0
  });
  const [_services, _setServices] = useState<Service[]>([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // Refund State
  const [refundReceiptNo, setRefundReceiptNo] = useState('');
  const [refundBill, setRefundBill] = useState<Bill | null>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundRemarks, setRefundRemarks] = useState('');
  const [selectedRefundItems, setSelectedRefundItems] = useState<string[]>([]);

  // Hospital Tariff State
  const [tariffFilters, setTariffFilters] = useState({
    payer: '',
    department: '',
    serviceName: ''
  });
  const [tariffs, setTariffs] = useState<Tariff[]>([]);

  // Daily Collection Report State
  const [reportDateRange, setReportDateRange] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    company: ''
  });
  const [collectionReport, setCollectionReport] = useState<CollectionReport[]>([]);

  useEffect(() => {
    fetchDepartments();
    fetchDoctors();
    fetchServices();

    // Listen for tab change events from sidebar
    const handleTabChange = (e: CustomEvent) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('setOpdTab', handleTabChange as EventListener);
    return () => {
      window.removeEventListener('setOpdTab', handleTabChange as EventListener);
    };
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/master/departments');
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Fallback mock data
      setDepartments([
        { id: '1', name: 'General Medicine' },
        { id: '2', name: 'Cardiology' },
        { id: '3', name: 'Orthopedics' },
        { id: '4', name: 'Pediatrics' },
        { id: '5', name: 'Gynecology' }
      ]);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/api/doctors');
      setDoctors(response.data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      // Mock data
      setDoctors([
        { id: '1', name: 'Dr. Jamir', specialty: 'Physiotherapist', department: 'General Medicine', availableSlots: 10, occupiedSlots: 0, schedule: '11:00 AM - 1:00 PM' },
        { id: '2', name: 'Dr. Devi', specialty: 'Physiotherapist', department: 'General Medicine', availableSlots: 8, occupiedSlots: 0, schedule: '10:00 AM - 11:30 AM' },
        { id: '3', name: 'Dr. Ram', specialty: 'Physiotherapist', department: 'General Medicine', availableSlots: 1300, occupiedSlots: 0, schedule: '10:00 AM - 10:20 AM' }
      ]);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await api.get('/api/services');
      _setServices(response.data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  // Patient Registration Functions
  const handlePatientFormChange = (field: string, value: any) => {
    setPatientForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePatient = async () => {
    if (!patientForm.name || !patientForm.gender) {
      alert('Please fill required fields (Name, Gender)');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/patients', {
        ...patientForm,
        gender: patientForm.gender?.toUpperCase()
      });
      alert('Patient registered successfully! MRN: ' + response.data.mrn);
      handleResetPatientForm();
    } catch (error: any) {
      console.error('Error saving patient:', error);
      alert(error.response?.data?.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPatientForm = () => {
    setPatientForm({
      mrn: '',
      name: '',
      fatherName: '',
      gender: '',
      dob: '',
      contact: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: '',
      pinCode: '',
      bloodGroup: '',
      occupation: '',
      maritalStatus: '',
      nationality: '',
      identityType: '',
      identityNumber: '',
      isMLC: false,
      hasAllergy: false,
      allergies: '',
      referralName: '',
      referralPhone: ''
    });
  };

  const handleSearchByMrn = async () => {
    if (!patientForm.mrn) return;
    try {
      const response = await api.get(`/api/patients?mrn=${patientForm.mrn}`);
      if (response.data && response.data.length > 0) {
        const patient = response.data[0];
        setPatientForm({
          ...patient,
          dob: patient.dob ? patient.dob.split('T')[0] : ''
        });
      }
    } catch (error) {
      console.error('Error searching patient:', error);
    }
  };

  // Assign Doctor Functions
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const filteredDoctors = selectedDepartment
    ? doctors.filter(d => d.department === selectedDepartment)
    : doctors;

  const handleBookAppointment = async (doctorId: string) => {
    if (!selectedDate) {
      alert('Please select a date');
      return;
    }

    const appointmentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate);
    alert(`Booking appointment with doctor ID ${doctorId} for ${appointmentDate.toLocaleDateString()}`);
    // In real implementation, this would open appointment booking dialog
  };

  // Patient Search Functions
  const handlePatientSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchParams.mrn) params.append('mrn', searchParams.mrn);
      if (searchParams.name) params.append('name', searchParams.name);
      if (searchParams.city) params.append('city', searchParams.city);
      if (searchParams.mobile) params.append('contact', searchParams.mobile);

      const response = await api.get(`/api/patients?${params.toString()}`);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSearch = () => {
    setSearchParams({ mrn: '', name: '', city: '', mobile: '' });
    setSearchResults([]);
  };

  // OPD Billing Functions
  const handleBillSearch = async () => {
    if (!billSearchValue) return;

    setLoading(true);
    try {
      let endpoint = '';
      if (billSearchType === 'uhid') {
        endpoint = `/api/patients?mrn=${billSearchValue}`;
        const response = await api.get(endpoint);
        if (response.data && response.data.length > 0) {
          const patient = response.data[0];
          setCurrentBill(prev => ({
            ...prev,
            patientId: patient.id,
            patientName: patient.name,
            patientMrn: patient.mrn,
            age: patient.age,
            gender: patient.gender,
            mobile: patient.contact
          }));
        }
      } else if (billSearchType === 'billNo') {
        endpoint = `/api/invoices?billNo=${billSearchValue}`;
        const response = await api.get(endpoint);
        if (response.data) {
          setCurrentBill(response.data);
        }
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  // TODO: handleAddService for adding services to bill
  // Will be implemented when +Services button is wired up

  const handleRemoveBillItem = (itemId: string) => {
    setCurrentBill(prev => {
      const items = (prev.items || []).filter(item => item.id !== itemId);
      const totalAmount = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
      const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
      const patientPayable = totalAmount - totalDiscount;

      return {
        ...prev,
        items,
        totalAmount,
        patientPayable,
        balanceAmount: patientPayable - (prev.receivedAmount || 0)
      };
    });
  };

  const handleSaveBill = async () => {
    if (!currentBill.patientId || !currentBill.items?.length) {
      alert('Please add patient and services');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/invoices', currentBill);
      alert('Bill saved successfully!');
    } catch (error) {
      console.error('Error saving bill:', error);
      alert('Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  // Refund Functions
  const handleRefundSearch = async () => {
    if (!refundReceiptNo) return;

    setLoading(true);
    try {
      const response = await api.get(`/api/invoices?receiptNo=${refundReceiptNo}`);
      if (response.data) {
        setRefundBill(response.data);
      }
    } catch (error) {
      console.error('Error searching receipt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!refundBill || refundAmount <= 0) {
      alert('Please enter valid refund amount');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/refunds', {
        billId: refundBill.id,
        amount: refundAmount,
        remarks: refundRemarks,
        items: selectedRefundItems
      });
      alert('Refund processed successfully!');
      setRefundBill(null);
      setRefundAmount(0);
      setRefundRemarks('');
      setSelectedRefundItems([]);
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  // Hospital Tariff Functions
  const handleTariffSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tariffFilters.payer) params.append('payer', tariffFilters.payer);
      if (tariffFilters.department) params.append('department', tariffFilters.department);
      if (tariffFilters.serviceName) params.append('service', tariffFilters.serviceName);

      const response = await api.get(`/api/tariffs?${params.toString()}`);
      setTariffs(response.data || []);
    } catch (error) {
      console.error('Error fetching tariffs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Collection Report Functions
  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('fromDate', reportDateRange.fromDate);
      params.append('toDate', reportDateRange.toDate);
      if (reportDateRange.company) params.append('company', reportDateRange.company);

      const response = await api.get(`/api/reports/collection?${params.toString()}`);
      setCollectionReport(response.data || []);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = generateCalendarDays(currentDate.getFullYear(), currentDate.getMonth());

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Outpatient Management</h1>
          <p className="text-slate-600">Patient registration, billing, and OPD administration</p>
        </div>
      </div>

      {/* Main Content */}
      <div>
        {/* Patient Registration Tab */}
          {activeTab === 'registration' && (
            <Card>
              <CardHeader className="bg-slate-500 text-white py-3">
                <CardTitle className="text-lg">Patient Registration</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-12 gap-6">
                  {/* Left Column - Main Form */}
                  <div className="col-span-9 space-y-4">
                    {/* Row 1: UHID, Patient Name */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>UHID</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="CMH-"
                            value={patientForm.mrn || ''}
                            onChange={(e) => handlePatientFormChange('mrn', e.target.value)}
                            className="flex-1"
                          />
                          <Button size="icon" onClick={handleSearchByMrn}>
                            <Search className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Patient Name *</Label>
                        <Input
                          placeholder="Patient Name"
                          value={patientForm.name || ''}
                          onChange={(e) => handlePatientFormChange('name', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Row 2: Father's Name, Gender */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Select value="father" onValueChange={() => {}}>
                          <SelectTrigger>
                            <SelectValue placeholder="Father" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="father">Father</SelectItem>
                            <SelectItem value="mother">Mother</SelectItem>
                            <SelectItem value="spouse">Spouse</SelectItem>
                            <SelectItem value="guardian">Guardian</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Father/Guardian Name"
                          value={patientForm.fatherName || ''}
                          onChange={(e) => handlePatientFormChange('fatherName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender *</Label>
                        <Select value={patientForm.gender || ''} onValueChange={(v) => handlePatientFormChange('gender', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 3: Occupation, Marital Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Occupation</Label>
                        <Select value={patientForm.occupation || ''} onValueChange={(v) => handlePatientFormChange('occupation', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Occupation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employed">Employed</SelectItem>
                            <SelectItem value="self-employed">Self Employed</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                            <SelectItem value="homemaker">Homemaker</SelectItem>
                            <SelectItem value="unemployed">Unemployed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Marital Status</Label>
                        <Select value={patientForm.maritalStatus || ''} onValueChange={(v) => handlePatientFormChange('maritalStatus', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unmarried">Unmarried</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 4: DOB, Nationality */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date of Birth *</Label>
                        <Input
                          type="date"
                          value={patientForm.dob || ''}
                          onChange={(e) => handlePatientFormChange('dob', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nationality</Label>
                        <Select value={patientForm.nationality || ''} onValueChange={(v) => handlePatientFormChange('nationality', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Nationality" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="indian">Indian</SelectItem>
                            <SelectItem value="nri">NRI</SelectItem>
                            <SelectItem value="foreign">Foreign National</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 5: Age, Blood Group */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Age</Label>
                        <Input
                          type="number"
                          placeholder="Age"
                          value={patientForm.age || ''}
                          onChange={(e) => handlePatientFormChange('age', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Blood Group</Label>
                        <Select value={patientForm.bloodGroup || ''} onValueChange={(v) => handlePatientFormChange('bloodGroup', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Sub Tabs: Address, Payer Information, Allergy */}
                    <Tabs value={registrationTab} onValueChange={setRegistrationTab} className="mt-6">
                      <TabsList>
                        <TabsTrigger value="address">Address</TabsTrigger>
                        <TabsTrigger value="payer">Payer Information</TabsTrigger>
                        <TabsTrigger value="allergy">Allergy</TabsTrigger>
                      </TabsList>

                      <TabsContent value="address" className="space-y-4 mt-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Country *</Label>
                            <Select value={patientForm.country || ''} onValueChange={(v) => handlePatientFormChange('country', v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Country" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="india">India</SelectItem>
                                <SelectItem value="usa">USA</SelectItem>
                                <SelectItem value="uk">UK</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>State *</Label>
                            <Select value={patientForm.state || ''} onValueChange={(v) => handlePatientFormChange('state', v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select State" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="karnataka">Karnataka</SelectItem>
                                <SelectItem value="maharashtra">Maharashtra</SelectItem>
                                <SelectItem value="tamilnadu">Tamil Nadu</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>City *</Label>
                            <Select value={patientForm.city || ''} onValueChange={(v) => handlePatientFormChange('city', v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select City" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bangalore">Bangalore</SelectItem>
                                <SelectItem value="mumbai">Mumbai</SelectItem>
                                <SelectItem value="chennai">Chennai</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Address *</Label>
                            <Input
                              placeholder="Address"
                              value={patientForm.address || ''}
                              onChange={(e) => handlePatientFormChange('address', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Pin No. *</Label>
                            <Input
                              placeholder="Pin Number"
                              value={patientForm.pinCode || ''}
                              onChange={(e) => handlePatientFormChange('pinCode', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Mobile No. *</Label>
                            <Input
                              placeholder="Mobile Number"
                              value={patientForm.contact || ''}
                              onChange={(e) => handlePatientFormChange('contact', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Refer Name *</Label>
                            <Input
                              placeholder="Referral Name"
                              value={patientForm.referralName || ''}
                              onChange={(e) => handlePatientFormChange('referralName', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Refer No. *</Label>
                            <Input
                              placeholder="Mobile Number"
                              value={patientForm.referralPhone || ''}
                              onChange={(e) => handlePatientFormChange('referralPhone', e.target.value)}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="payer" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Identity Type</Label>
                            <Select value={patientForm.identityType || ''} onValueChange={(v) => handlePatientFormChange('identityType', v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Identity" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="aadhar">Aadhar Card</SelectItem>
                                <SelectItem value="pan">PAN Card</SelectItem>
                                <SelectItem value="passport">Passport</SelectItem>
                                <SelectItem value="voter">Voter ID</SelectItem>
                                <SelectItem value="driving">Driving License</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Identity Number</Label>
                            <Input
                              placeholder="Identity Number"
                              value={patientForm.identityNumber || ''}
                              onChange={(e) => handlePatientFormChange('identityNumber', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Email ID</Label>
                          <Input
                            type="email"
                            placeholder="Email ID"
                            value={patientForm.email || ''}
                            onChange={(e) => handlePatientFormChange('email', e.target.value)}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="allergy" className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Known Allergies</Label>
                          <textarea
                            className="w-full h-32 p-3 border rounded-md"
                            placeholder="Enter any known allergies..."
                            value={patientForm.allergies || ''}
                            onChange={(e) => handlePatientFormChange('allergies', e.target.value)}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  {/* Right Column - Photo, Checkboxes */}
                  <div className="col-span-3 space-y-4">
                    <div className="flex gap-4 justify-end">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="mlc"
                          checked={patientForm.isMLC || false}
                          onCheckedChange={(checked: boolean) => handlePatientFormChange('isMLC', checked)}
                        />
                        <Label htmlFor="mlc">MLC</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="allergy"
                          checked={patientForm.hasAllergy || false}
                          onCheckedChange={(checked: boolean) => handlePatientFormChange('hasAllergy', checked)}
                        />
                        <Label htmlFor="allergy">Allergy</Label>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 text-center">
                      <div className="w-24 h-24 mx-auto bg-slate-200 rounded-full flex items-center justify-center mb-4">
                        <User className="w-12 h-12 text-slate-400" />
                      </div>
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" size="sm">
                          <Upload className="w-4 h-4 mr-1" />
                          Browse
                        </Button>
                        <Button variant="outline" size="sm">
                          <Camera className="w-4 h-4 mr-1" />
                          Webcam
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Identity Type</Label>
                      <Select value={patientForm.identityType || ''} onValueChange={(v) => handlePatientFormChange('identityType', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Identity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aadhar">Aadhar Card</SelectItem>
                          <SelectItem value="pan">PAN Card</SelectItem>
                          <SelectItem value="passport">Passport</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Identity Number</Label>
                      <Input
                        placeholder="Identity Number"
                        value={patientForm.identityNumber || ''}
                        onChange={(e) => handlePatientFormChange('identityNumber', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email ID</Label>
                      <Input
                        type="email"
                        placeholder="Email ID"
                        value={patientForm.email || ''}
                        onChange={(e) => handlePatientFormChange('email', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                  <Button onClick={handleSavePatient} disabled={loading}>
                    <Save className="w-4 h-4 mr-1" />
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="outline" onClick={handleResetPatientForm}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assign Doctor Tab */}
          {activeTab === 'assign-doctor' && (
            <Card>
              <CardHeader className="bg-slate-500 text-white py-3">
                <CardTitle className="text-lg">Assign Doctor</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Left - Calendar */}
                  <div>
                    <div className="border rounded-lg p-4">
                      {/* Calendar Header */}
                      <div className="flex items-center justify-between mb-4">
                        <Button variant="ghost" size="icon" onClick={prevMonth}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="font-semibold">
                          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </span>
                        <Button variant="ghost" size="icon" onClick={nextMonth}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {DAYS.map(day => (
                          <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                            {day}
                          </div>
                        ))}
                        {calendarDays.map((day, idx) => (
                          <div key={idx} className="text-center py-2">
                            {day !== null && (
                              <button
                                onClick={() => setSelectedDate(day)}
                                className={`w-8 h-8 rounded-full text-sm ${
                                  selectedDate === day
                                    ? 'bg-blue-600 text-white'
                                    : 'hover:bg-slate-100'
                                } ${day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth()
                                    ? 'font-bold' : ''
                                }`}
                              >
                                {day}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Department / Doctor Tabs */}
                    <div className="mt-4">
                      <div className="flex border-b">
                        <button
                          onClick={() => setDoctorTab('department')}
                          className={`px-4 py-2 text-sm font-medium ${
                            doctorTab === 'department'
                              ? 'text-blue-600 border-b-2 border-blue-600'
                              : 'text-slate-500'
                          }`}
                        >
                          Department
                        </button>
                        <button
                          onClick={() => setDoctorTab('doctor')}
                          className={`px-4 py-2 text-sm font-medium ${
                            doctorTab === 'doctor'
                              ? 'text-blue-600 border-b-2 border-blue-600'
                              : 'text-slate-500'
                          }`}
                        >
                          Doctor
                        </button>
                      </div>
                      <div className="mt-4">
                        {doctorTab === 'department' && (
                          <div className="flex flex-wrap gap-2">
                            {departments.map(dept => (
                              <Button
                                key={dept.id}
                                variant={selectedDepartment === dept.name ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedDepartment(dept.name)}
                              >
                                {dept.name}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right - Provider List */}
                  <div>
                    <h3 className="text-lg font-medium text-blue-600 mb-4">
                      Currently showing providers
                      <span className="text-sm text-slate-500 ml-2">
                        {selectedDepartment && `- ${selectedDepartment}`}
                      </span>
                    </h3>

                    <div className="space-y-4">
                      {filteredDoctors.map(doctor => (
                        <div key={doctor.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                              <User className="w-8 h-8 text-slate-400" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-blue-600">{doctor.name}</h4>
                              <p className="text-sm text-slate-600">{doctor.specialty}</p>
                              <div className="flex items-center gap-1 text-sm text-slate-500">
                                <Clock className="w-3 h-3" />
                                From-{doctor.schedule}
                              </div>
                              <p className="text-xs text-slate-500">
                                Available Slot {doctor.availableSlots} Occupied Slot {doctor.occupiedSlots}
                              </p>
                            </div>
                          </div>
                          <Button onClick={() => handleBookAppointment(doctor.id)}>
                            Book Appointment
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="flex gap-6 mt-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-pink-200 rounded" />
                        <span>Appointment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-200 rounded" />
                        <span>Billing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-cyan-200 rounded" />
                        <span>Vital</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-200 rounded" />
                        <span>Visited</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button>Appointment</Button>
                      <Button variant="outline">Cancel Appointment</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Patient Search Tab */}
          {activeTab === 'search' && (
            <Card>
              <CardHeader className="bg-slate-500 text-white py-3">
                <CardTitle className="text-lg">Patient Search</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>UHID</Label>
                    <Input
                      placeholder="UHID"
                      value={searchParams.mrn}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, mrn: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Patient Name</Label>
                    <Input
                      placeholder="Patient Name"
                      value={searchParams.name}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Select value={searchParams.city} onValueChange={(v) => setSearchParams(prev => ({ ...prev, city: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="City" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bangalore">Bangalore</SelectItem>
                        <SelectItem value="mumbai">Mumbai</SelectItem>
                        <SelectItem value="chennai">Chennai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile No.</Label>
                    <Input
                      placeholder="Mobile Number"
                      value={searchParams.mobile}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, mobile: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-2 mb-6">
                  <Button onClick={handlePatientSearch} disabled={loading}>
                    <Search className="w-4 h-4 mr-1" />
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                  <Button variant="outline" onClick={handleResetSearch}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>UHID</TableHead>
                        <TableHead>Patient Name</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map(patient => (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium">{patient.mrn}</TableCell>
                          <TableCell>{patient.name}</TableCell>
                          <TableCell>{patient.gender}</TableCell>
                          <TableCell>{patient.age || '-'}</TableCell>
                          <TableCell>{patient.contact || '-'}</TableCell>
                          <TableCell>{patient.city || '-'}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">View</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* OPD Billing Tab */}
          {activeTab === 'billing' && (
            <Card>
              <CardHeader className="bg-slate-500 text-white py-3">
                <CardTitle className="text-lg">OPD Billing</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Search Row */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>UHID</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="UHID"
                        value={billSearchType === 'uhid' ? billSearchValue : ''}
                        onChange={(e) => { setBillSearchType('uhid'); setBillSearchValue(e.target.value); }}
                      />
                      <Button size="icon" onClick={handleBillSearch}>
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bill No.</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Bill NO"
                        value={billSearchType === 'billNo' ? billSearchValue : ''}
                        onChange={(e) => { setBillSearchType('billNo'); setBillSearchValue(e.target.value); }}
                      />
                      <Button size="icon" onClick={handleBillSearch}>
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Receipt NO.</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="RECEIPT"
                        value={billSearchType === 'receiptNo' ? billSearchValue : ''}
                        onChange={(e) => { setBillSearchType('receiptNo'); setBillSearchValue(e.target.value); }}
                      />
                      <Button size="icon" onClick={handleBillSearch}>
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Patient Info Row */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Patient Name</Label>
                    <Input value={currentBill.patientName || ''} disabled placeholder="Patient Name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Age/Sex</Label>
                    <Input value={currentBill.age ? `${currentBill.age}/${currentBill.gender}` : '/'} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile No. *</Label>
                    <Input value={currentBill.mobile || ''} disabled placeholder="Mobile No." />
                  </div>
                  <div className="space-y-2">
                    <Label>Doctor Name *</Label>
                    <Select value={currentBill.doctorId || ''} onValueChange={(v) => setCurrentBill(prev => ({ ...prev, doctorId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map(doc => (
                          <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Second Row */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Payer</Label>
                    <Input value={currentBill.payerName || ''} placeholder="Payer name" onChange={(e) => setCurrentBill(prev => ({ ...prev, payerName: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Referral Name</Label>
                    <Input value={currentBill.referralName || ''} placeholder="Referral Name" onChange={(e) => setCurrentBill(prev => ({ ...prev, referralName: e.target.value }))} />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button variant="outline">
                      <Calendar className="w-4 h-4 mr-1" />
                      +Appointment
                    </Button>
                    <Button variant="outline">+Doctor Order</Button>
                    <Button variant="outline">+Services</Button>
                  </div>
                </div>

                {/* Services Table */}
                <Table className="mb-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Name</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Payer Amount</TableHead>
                      <TableHead className="text-right">Patient Amount</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(currentBill.items || []).map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.serviceName}</TableCell>
                        <TableCell className="text-right">{item.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.discount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.payerAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.patientAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveBillItem(item.id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(currentBill.items || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                          No services added. Click "+Services" to add services.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Action Buttons and Summary */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-2">
                    <Button onClick={handleSaveBill} disabled={loading}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setIsPaymentDialogOpen(true)}>
                      Payment Details
                    </Button>
                    <Button variant="outline">Discount Auth</Button>
                    <Button variant="outline">
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Refresh
                    </Button>
                    <Button variant="outline">
                      <Printer className="w-4 h-4 mr-1" />
                      Bill Print
                    </Button>
                    <Button variant="outline" className="text-red-600 border-red-300">
                      Cancel Bill
                    </Button>
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="flex justify-between gap-8">
                      <span>Total Amount</span>
                      <Input value={currentBill.totalAmount?.toFixed(2) || '0'} disabled className="w-32 text-right" />
                    </div>
                    <div className="flex justify-between gap-8">
                      <span>Patient Payable</span>
                      <Input value={currentBill.patientPayable?.toFixed(2) || '0'} disabled className="w-32 text-right" />
                    </div>
                    <div className="flex justify-between gap-8">
                      <span>Received Amount</span>
                      <Input
                        value={currentBill.receivedAmount || ''}
                        onChange={(e) => {
                          const received = parseFloat(e.target.value) || 0;
                          setCurrentBill(prev => ({
                            ...prev,
                            receivedAmount: received,
                            balanceAmount: (prev.patientPayable || 0) - received
                          }));
                        }}
                        className="w-32 text-right"
                      />
                    </div>
                    <div className="flex justify-between gap-8">
                      <span>Balance Amount</span>
                      <Input value={currentBill.balanceAmount?.toFixed(2) || '0'} disabled className="w-32 text-right bg-yellow-50" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refund Tab */}
          {activeTab === 'refund' && (
            <Card>
              <CardHeader className="bg-slate-500 text-white py-3">
                <CardTitle className="text-lg">OPD Refund</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Receipt No</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="RECEIPT"
                          value={refundReceiptNo}
                          onChange={(e) => setRefundReceiptNo(e.target.value)}
                        />
                        <Button onClick={handleRefundSearch}>
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Patient Name</Label>
                      <Input value={refundBill?.patientName || ''} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Age/Sex</Label>
                      <Input value={refundBill ? `${refundBill.age || '-'}/${refundBill.gender || '-'}` : '/'} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Balance Amount</Label>
                      <Input value={refundBill?.balanceAmount?.toFixed(2) || ''} disabled />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>UHID</Label>
                      <Input value={refundBill?.patientMrn || ''} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Bill Amount</Label>
                      <Input value={refundBill?.totalAmount?.toFixed(2) || ''} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Received Amount</Label>
                      <Input value={refundBill?.receivedAmount?.toFixed(2) || ''} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Refunded Amount</Label>
                      <Input
                        type="number"
                        value={refundAmount || 0}
                        onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <Badge variant="outline" className="bg-slate-100">Refunded</Badge>
                  </div>
                </div>

                {/* Services Table */}
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Services</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sr. NO.</TableHead>
                        <TableHead>Service Name</TableHead>
                        <TableHead className="text-right">Payer Amount</TableHead>
                        <TableHead className="text-right">Patient Amount</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Select</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refundBill?.items?.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{item.serviceName}</TableCell>
                          <TableCell className="text-right">{item.payerAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.patientAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{(item.patientAmount - item.payerAmount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Checkbox
                              checked={selectedRefundItems.includes(item.id)}
                              onCheckedChange={(checked: boolean) => {
                                if (checked) {
                                  setSelectedRefundItems(prev => [...prev, item.id]);
                                } else {
                                  setSelectedRefundItems(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-slate-500">
                            Search for a receipt to view services
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Label>Refund Amount</Label>
                    <Input
                      type="number"
                      className="w-32"
                      value={refundAmount || ''}
                      onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Remarks</Label>
                    <Input
                      className="w-64"
                      value={refundRemarks}
                      onChange={(e) => setRefundRemarks(e.target.value)}
                    />
                  </div>
                  <div className="flex-1" />
                  <Button onClick={handleProcessRefund} disabled={loading || !refundBill}>
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button variant="outline">
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hospital Tariff Tab */}
          {activeTab === 'tariff' && (
            <Card>
              <CardHeader className="bg-slate-500 text-white py-3">
                <CardTitle className="text-lg">OPD Hospital Tariff</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex gap-4 items-end mb-6">
                  <div className="space-y-2">
                    <Label>Payer *</Label>
                    <Select
                      value={tariffFilters.payer}
                      onValueChange={(v) => setTariffFilters(prev => ({ ...prev, payer: v }))}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department Name</Label>
                    <Select
                      value={tariffFilters.department}
                      onValueChange={(v) => setTariffFilters(prev => ({ ...prev, department: v }))}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="--Select--" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Service Name</Label>
                    <Input
                      placeholder="Service Name"
                      value={tariffFilters.serviceName}
                      onChange={(e) => setTariffFilters(prev => ({ ...prev, serviceName: e.target.value }))}
                    />
                  </div>
                  <Button onClick={handleTariffSearch}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                {tariffs.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service Code</TableHead>
                        <TableHead>Service Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Payer</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead>Effective From</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tariffs.map(tariff => (
                        <TableRow key={tariff.id}>
                          <TableCell>{tariff.serviceCode}</TableCell>
                          <TableCell>{tariff.serviceName}</TableCell>
                          <TableCell>{tariff.department}</TableCell>
                          <TableCell>{tariff.payerName}</TableCell>
                          <TableCell className="text-right">{tariff.price.toFixed(2)}</TableCell>
                          <TableCell>{tariff.effectiveFrom}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Daily Collection Report Tab */}
          {activeTab === 'collection' && (
            <Card>
              <CardHeader className="bg-slate-500 text-white py-3">
                <CardTitle className="text-lg">Daily Collection Report</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex gap-4 items-end mb-6">
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Input
                      type="date"
                      value={reportDateRange.fromDate}
                      onChange={(e) => setReportDateRange(prev => ({ ...prev, fromDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Input
                      type="date"
                      value={reportDateRange.toDate}
                      onChange={(e) => setReportDateRange(prev => ({ ...prev, toDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Select
                      value={reportDateRange.company}
                      onValueChange={(v) => setReportDateRange(prev => ({ ...prev, company: v }))}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="opd">OPD</SelectItem>
                        <SelectItem value="ipd">IPD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleGenerateReport}>
                    <Search className="w-4 h-4 mr-1" />
                    Search
                  </Button>
                  <Button variant="outline">
                    <Printer className="w-4 h-4 mr-1" />
                    Print
                  </Button>
                </div>

                {collectionReport.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total Bills</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Cash</TableHead>
                        <TableHead className="text-right">Card</TableHead>
                        <TableHead className="text-right">Insurance</TableHead>
                        <TableHead className="text-right">Refund</TableHead>
                        <TableHead className="text-right">Net Collection</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collectionReport.map((report, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{report.date}</TableCell>
                          <TableCell className="text-right">{report.totalBills}</TableCell>
                          <TableCell className="text-right">{report.totalAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{report.cashAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{report.cardAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{report.insuranceAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-red-600">-{report.refundAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">{report.netCollection.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {collectionReport.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    Select date range and click Search to generate report
                  </div>
                )}
              </CardContent>
            </Card>
          )}
      </div>

      {/* Payment Details Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Enter payment information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input placeholder="Transaction reference" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsPaymentDialogOpen(false)}>Save Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
