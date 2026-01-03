import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
// Checkbox import removed - not currently used
import { useToast } from '@/components/Toast';
import {
  HeartPulse, Search, Calendar, User, Clock,
  CheckCircle, FileText, Printer, RefreshCw, DollarSign
} from 'lucide-react';

interface HealthPackage {
  id: string;
  name: string;
  description: string;
  category: 'BASIC' | 'COMPREHENSIVE' | 'EXECUTIVE' | 'CARDIAC' | 'DIABETIC' | 'WOMENS' | 'SENIOR' | 'CORPORATE';
  price: number;
  discountedPrice?: number;
  tests: { id: string; name: string; category: string }[];
  consultations: string[];
  duration: string;
  isActive: boolean;
}

interface Booking {
  id: string;
  packageId: string;
  packageName: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'BOOKED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  amount: number;
  completedTests: number;
  totalTests: number;
  reportReady: boolean;
}

const HEALTH_PACKAGES: HealthPackage[] = [
  {
    id: 'pkg1',
    name: 'Basic Health Checkup',
    description: 'Essential tests for routine health monitoring',
    category: 'BASIC',
    price: 1999,
    discountedPrice: 1499,
    tests: [
      { id: 't1', name: 'Complete Blood Count', category: 'Hematology' },
      { id: 't2', name: 'Blood Sugar Fasting', category: 'Biochemistry' },
      { id: 't3', name: 'Lipid Profile', category: 'Biochemistry' },
      { id: 't4', name: 'Liver Function Test', category: 'Biochemistry' },
      { id: 't5', name: 'Kidney Function Test', category: 'Biochemistry' },
      { id: 't6', name: 'Urine Routine', category: 'Pathology' },
    ],
    consultations: ['General Physician'],
    duration: '2-3 hours',
    isActive: true,
  },
  {
    id: 'pkg2',
    name: 'Comprehensive Health Checkup',
    description: 'Complete health assessment with imaging',
    category: 'COMPREHENSIVE',
    price: 4999,
    discountedPrice: 3999,
    tests: [
      { id: 't1', name: 'Complete Blood Count', category: 'Hematology' },
      { id: 't2', name: 'Blood Sugar (F & PP)', category: 'Biochemistry' },
      { id: 't3', name: 'HbA1c', category: 'Biochemistry' },
      { id: 't4', name: 'Lipid Profile', category: 'Biochemistry' },
      { id: 't5', name: 'Liver Function Test', category: 'Biochemistry' },
      { id: 't6', name: 'Kidney Function Test', category: 'Biochemistry' },
      { id: 't7', name: 'Thyroid Profile', category: 'Biochemistry' },
      { id: 't8', name: 'Vitamin D', category: 'Biochemistry' },
      { id: 't9', name: 'Vitamin B12', category: 'Biochemistry' },
      { id: 't10', name: 'Chest X-Ray', category: 'Radiology' },
      { id: 't11', name: 'ECG', category: 'Cardiology' },
      { id: 't12', name: 'Ultrasound Abdomen', category: 'Radiology' },
    ],
    consultations: ['General Physician', 'Cardiologist'],
    duration: '4-5 hours',
    isActive: true,
  },
  {
    id: 'pkg3',
    name: 'Cardiac Health Package',
    description: 'Comprehensive heart health assessment',
    category: 'CARDIAC',
    price: 7999,
    discountedPrice: 5999,
    tests: [
      { id: 't1', name: 'Lipid Profile', category: 'Biochemistry' },
      { id: 't2', name: 'Apolipoprotein A & B', category: 'Biochemistry' },
      { id: 't3', name: 'Homocysteine', category: 'Biochemistry' },
      { id: 't4', name: 'hs-CRP', category: 'Biochemistry' },
      { id: 't5', name: 'Lipoprotein(a)', category: 'Biochemistry' },
      { id: 't6', name: 'NT-proBNP', category: 'Biochemistry' },
      { id: 't7', name: 'Troponin I', category: 'Biochemistry' },
      { id: 't8', name: 'ECG', category: 'Cardiology' },
      { id: 't9', name: '2D Echo', category: 'Cardiology' },
      { id: 't10', name: 'TMT (Stress Test)', category: 'Cardiology' },
    ],
    consultations: ['Cardiologist'],
    duration: '3-4 hours',
    isActive: true,
  },
  {
    id: 'pkg4',
    name: 'Diabetic Care Package',
    description: 'Complete diabetes monitoring and prevention',
    category: 'DIABETIC',
    price: 3999,
    discountedPrice: 2999,
    tests: [
      { id: 't1', name: 'Blood Sugar (F & PP)', category: 'Biochemistry' },
      { id: 't2', name: 'HbA1c', category: 'Biochemistry' },
      { id: 't3', name: 'Fructosamine', category: 'Biochemistry' },
      { id: 't4', name: 'Insulin Fasting', category: 'Biochemistry' },
      { id: 't5', name: 'C-Peptide', category: 'Biochemistry' },
      { id: 't6', name: 'Kidney Function Test', category: 'Biochemistry' },
      { id: 't7', name: 'Microalbumin', category: 'Biochemistry' },
      { id: 't8', name: 'Lipid Profile', category: 'Biochemistry' },
      { id: 't9', name: 'Fundoscopy', category: 'Ophthalmology' },
    ],
    consultations: ['Endocrinologist', 'Dietitian'],
    duration: '3-4 hours',
    isActive: true,
  },
  {
    id: 'pkg5',
    name: "Women's Wellness Package",
    description: 'Comprehensive health screening for women',
    category: 'WOMENS',
    price: 5999,
    discountedPrice: 4499,
    tests: [
      { id: 't1', name: 'Complete Blood Count', category: 'Hematology' },
      { id: 't2', name: 'Thyroid Profile', category: 'Biochemistry' },
      { id: 't3', name: 'Vitamin D & B12', category: 'Biochemistry' },
      { id: 't4', name: 'Iron Studies', category: 'Biochemistry' },
      { id: 't5', name: 'Calcium', category: 'Biochemistry' },
      { id: 't6', name: 'Pap Smear', category: 'Pathology' },
      { id: 't7', name: 'Mammography', category: 'Radiology' },
      { id: 't8', name: 'Pelvic Ultrasound', category: 'Radiology' },
      { id: 't9', name: 'Bone Density (DEXA)', category: 'Radiology' },
    ],
    consultations: ['Gynecologist', 'General Physician'],
    duration: '4-5 hours',
    isActive: true,
  },
  {
    id: 'pkg6',
    name: 'Executive Health Checkup',
    description: 'Premium comprehensive health assessment',
    category: 'EXECUTIVE',
    price: 14999,
    discountedPrice: 11999,
    tests: [
      { id: 't1', name: 'Complete Blood Count', category: 'Hematology' },
      { id: 't2', name: 'Complete Metabolic Panel', category: 'Biochemistry' },
      { id: 't3', name: 'Lipid Profile Advanced', category: 'Biochemistry' },
      { id: 't4', name: 'Thyroid Profile', category: 'Biochemistry' },
      { id: 't5', name: 'Vitamin Panel', category: 'Biochemistry' },
      { id: 't6', name: 'Tumor Markers (PSA/CA-125)', category: 'Biochemistry' },
      { id: 't7', name: 'ECG', category: 'Cardiology' },
      { id: 't8', name: '2D Echo', category: 'Cardiology' },
      { id: 't9', name: 'TMT', category: 'Cardiology' },
      { id: 't10', name: 'Chest X-Ray', category: 'Radiology' },
      { id: 't11', name: 'Ultrasound Abdomen', category: 'Radiology' },
      { id: 't12', name: 'CT Calcium Score', category: 'Radiology' },
      { id: 't13', name: 'PFT', category: 'Pulmonology' },
      { id: 't14', name: 'Audiometry', category: 'ENT' },
      { id: 't15', name: 'Eye Checkup', category: 'Ophthalmology' },
    ],
    consultations: ['General Physician', 'Cardiologist', 'Ophthalmologist', 'Dietitian'],
    duration: 'Full Day',
    isActive: true,
  },
];

export default function HealthCheckup() {
  const { success: showToast } = useToast();
  const [activeTab, setActiveTab] = useState('packages');
  const [packages, _setPackages] = useState<HealthPackage[]>(HEALTH_PACKAGES);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [_loading, _setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<HealthPackage | null>(null);

  // Booking form state
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    // Mock bookings
    setBookings([
      {
        id: 'b1',
        packageId: 'pkg2',
        packageName: 'Comprehensive Health Checkup',
        patientId: 'P001',
        patientName: 'Amit Sharma',
        patientPhone: '+91 9876543210',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '09:00',
        status: 'IN_PROGRESS',
        paymentStatus: 'PAID',
        amount: 3999,
        completedTests: 8,
        totalTests: 12,
        reportReady: false,
      },
      {
        id: 'b2',
        packageId: 'pkg1',
        packageName: 'Basic Health Checkup',
        patientId: 'P002',
        patientName: 'Priya Patel',
        patientPhone: '+91 9876543211',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '10:30',
        status: 'BOOKED',
        paymentStatus: 'PAID',
        amount: 1499,
        completedTests: 0,
        totalTests: 6,
        reportReady: false,
      },
      {
        id: 'b3',
        packageId: 'pkg3',
        packageName: 'Cardiac Health Package',
        patientId: 'P003',
        patientName: 'Rajesh Kumar',
        patientPhone: '+91 9876543212',
        scheduledDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        scheduledTime: '08:00',
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        amount: 5999,
        completedTests: 10,
        totalTests: 10,
        reportReady: true,
      },
    ]);
  };

  const handleBookPackage = async () => {
    if (!selectedPackage || !patientName || !patientPhone || !scheduledDate || !scheduledTime) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    const newBooking: Booking = {
      id: `b${Date.now()}`,
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      patientId: `P${Date.now()}`,
      patientName,
      patientPhone,
      patientEmail,
      scheduledDate,
      scheduledTime,
      status: 'BOOKED',
      paymentStatus: 'PENDING',
      amount: selectedPackage.discountedPrice || selectedPackage.price,
      completedTests: 0,
      totalTests: selectedPackage.tests.length,
      reportReady: false,
    };

    setBookings(prev => [newBooking, ...prev]);
    showToast('Package booked successfully', 'success');
    setShowBookDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setPatientName('');
    setPatientPhone('');
    setPatientEmail('');
    setScheduledDate('');
    setScheduledTime('');
    setSelectedPackage(null);
  };

  const updateBookingStatus = (bookingId: string, status: Booking['status']) => {
    setBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, status } : b
    ));
    showToast(`Booking ${status.toLowerCase()}`, 'success');
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || pkg.category === filterCategory;
    return matchesSearch && matchesCategory && pkg.isActive;
  });

  const todayBookings = bookings.filter(b => b.scheduledDate === new Date().toISOString().split('T')[0]);

  const stats = {
    todayBookings: todayBookings.length,
    inProgress: todayBookings.filter(b => b.status === 'IN_PROGRESS').length,
    completed: bookings.filter(b => b.status === 'COMPLETED').length,
    revenue: bookings.filter(b => b.paymentStatus === 'PAID').reduce((sum, b) => sum + b.amount, 0),
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      BASIC: 'bg-green-100 text-green-800',
      COMPREHENSIVE: 'bg-blue-100 text-blue-800',
      EXECUTIVE: 'bg-purple-100 text-purple-800',
      CARDIAC: 'bg-red-100 text-red-800',
      DIABETIC: 'bg-orange-100 text-orange-800',
      WOMENS: 'bg-pink-100 text-pink-800',
      SENIOR: 'bg-slate-100 text-slate-800',
      CORPORATE: 'bg-cyan-100 text-cyan-800',
    };
    return colors[category] || 'bg-slate-100 text-slate-800';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      BOOKED: 'bg-blue-100 text-blue-800',
      CHECKED_IN: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[status]}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Health Checkup Packages</h1>
          <p className="text-slate-600">Preventive health checkup programs</p>
        </div>
        <Button onClick={fetchBookings}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Today's Bookings</p>
                <p className="text-2xl font-bold text-blue-600">{stats.todayBookings}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">In Progress</p>
                <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Revenue</p>
                <p className="text-2xl font-bold text-purple-600">₹{stats.revenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="packages">Packages ({packages.filter(p => p.isActive).length})</TabsTrigger>
          <TabsTrigger value="bookings">Today's Bookings ({todayBookings.length})</TabsTrigger>
          <TabsTrigger value="all-bookings">All Bookings</TabsTrigger>
        </TabsList>

        {/* Packages Tab */}
        <TabsContent value="packages" className="mt-4">
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search packages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="BASIC">Basic</SelectItem>
                    <SelectItem value="COMPREHENSIVE">Comprehensive</SelectItem>
                    <SelectItem value="EXECUTIVE">Executive</SelectItem>
                    <SelectItem value="CARDIAC">Cardiac</SelectItem>
                    <SelectItem value="DIABETIC">Diabetic</SelectItem>
                    <SelectItem value="WOMENS">Women's</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPackages.map((pkg) => (
              <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      <Badge className={getCategoryColor(pkg.category)}>{pkg.category}</Badge>
                    </div>
                    <HeartPulse className="w-6 h-6 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-4">{pkg.description}</p>

                  <div className="space-y-2 text-sm">
                    <p><strong>Tests:</strong> {pkg.tests.length} investigations</p>
                    <p><strong>Consultations:</strong> {pkg.consultations.join(', ')}</p>
                    <p><strong>Duration:</strong> {pkg.duration}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      {pkg.discountedPrice ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-green-600">₹{pkg.discountedPrice}</span>
                          <span className="text-sm text-slate-400 line-through">₹{pkg.price}</span>
                        </div>
                      ) : (
                        <span className="text-xl font-bold">₹{pkg.price}</span>
                      )}
                    </div>
                    <Button onClick={() => {
                      setSelectedPackage(pkg);
                      setShowBookDialog(true);
                    }}>
                      Book Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Today's Bookings Tab */}
        <TabsContent value="bookings" className="mt-4">
          <div className="space-y-4">
            {todayBookings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No bookings for today</p>
                </CardContent>
              </Card>
            ) : (
              todayBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{booking.patientName}</h3>
                          {getStatusBadge(booking.status)}
                        </div>
                        <p className="text-sm text-slate-600">{booking.packageName}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {booking.scheduledTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {booking.patientPhone}
                          </span>
                        </div>
                        {booking.status === 'IN_PROGRESS' && (
                          <div className="mt-2">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{booking.completedTests}/{booking.totalTests} tests</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(booking.completedTests / booking.totalTests) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {booking.status === 'BOOKED' && (
                          <Button size="sm" onClick={() => updateBookingStatus(booking.id, 'CHECKED_IN')}>
                            Check In
                          </Button>
                        )}
                        {booking.status === 'CHECKED_IN' && (
                          <Button size="sm" onClick={() => updateBookingStatus(booking.id, 'IN_PROGRESS')}>
                            Start Tests
                          </Button>
                        )}
                        {booking.status === 'COMPLETED' && booking.reportReady && (
                          <Button size="sm" variant="outline">
                            <FileText className="w-4 h-4 mr-1" />
                            View Report
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* All Bookings Tab */}
        <TabsContent value="all-bookings" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4">Patient</th>
                    <th className="text-left p-4">Package</th>
                    <th className="text-left p-4">Date & Time</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Amount</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-t">
                      <td className="p-4">
                        <p className="font-medium">{booking.patientName}</p>
                        <p className="text-sm text-slate-500">{booking.patientPhone}</p>
                      </td>
                      <td className="p-4">{booking.packageName}</td>
                      <td className="p-4">
                        <p>{booking.scheduledDate}</p>
                        <p className="text-sm text-slate-500">{booking.scheduledTime}</p>
                      </td>
                      <td className="p-4">{getStatusBadge(booking.status)}</td>
                      <td className="p-4">₹{booking.amount.toLocaleString()}</td>
                      <td className="p-4">
                        {booking.reportReady && (
                          <Button size="sm" variant="outline">
                            <Printer className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Book Package Dialog */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book Health Package</DialogTitle>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold">{selectedPackage.name}</h3>
                <p className="text-sm text-slate-600">{selectedPackage.tests.length} tests included</p>
                <p className="text-lg font-bold text-blue-600 mt-2">
                  ₹{selectedPackage.discountedPrice || selectedPackage.price}
                </p>
              </div>

              <div>
                <Label>Patient Name *</Label>
                <Input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter patient name"
                />
              </div>

              <div>
                <Label>Phone Number *</Label>
                <Input
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>

              <div>
                <Label>Email (Optional)</Label>
                <Input
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label>Time *</Label>
                  <Select value={scheduledTime} onValueChange={setScheduledTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="07:00">07:00 AM</SelectItem>
                      <SelectItem value="08:00">08:00 AM</SelectItem>
                      <SelectItem value="09:00">09:00 AM</SelectItem>
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                      <SelectItem value="11:00">11:00 AM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBookPackage}>
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
