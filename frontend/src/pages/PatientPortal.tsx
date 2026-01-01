import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  User, Calendar, FileText, Pill, TestTube, Receipt,
  Download, LogOut, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import api from '../services/api';

interface Patient {
  id: string;
  mrn: string;
  name: string;
  dob: string;
  gender: string;
  contact: string;
  email: string;
  bloodGroup: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  doctor: string;
  department: string;
  status: string;
  reason: string;
}

interface LabResult {
  id: string;
  testName: string;
  date: string;
  result: string;
  status: string;
  isCritical: boolean;
}

interface Prescription {
  id: string;
  date: string;
  doctor: string;
  drugs: { name: string; dosage: string; duration: string }[];
}

interface Bill {
  id: string;
  date: string;
  invoiceNumber: string;
  amount: number;
  paid: number;
  balance: number;
  status: string;
}

const PatientPortal = () => {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedPatient = localStorage.getItem('patientPortalUser');
    const token = localStorage.getItem('patientPortalToken');

    if (!storedPatient || !token) {
      navigate('/patient-portal/login');
      return;
    }

    setPatient(JSON.parse(storedPatient));
    fetchPatientData();
  }, [navigate]);

  const fetchPatientData = async () => {
    try {
      const token = localStorage.getItem('patientPortalToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [appointmentsRes, labRes, prescriptionsRes, billsRes] = await Promise.all([
        api.get('/api/patient-portal/appointments', config).catch(() => ({ data: [] })),
        api.get('/api/patient-portal/lab-results', config).catch(() => ({ data: [] })),
        api.get('/api/patient-portal/prescriptions', config).catch(() => ({ data: [] })),
        api.get('/api/patient-portal/bills', config).catch(() => ({ data: [] })),
      ]);

      setAppointments(appointmentsRes.data);
      setLabResults(labRes.data);
      setPrescriptions(prescriptionsRes.data);
      setBills(billsRes.data);
    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('patientPortalToken');
    localStorage.removeItem('patientPortalUser');
    navigate('/patient-portal/login');
  };

  const handleBookAppointment = () => {
    // Open appointment booking modal or navigate to booking page
    alert('Appointment booking feature coming soon!');
  };

  const handleDownloadReport = async (resultId: string) => {
    try {
      const token = localStorage.getItem('patientPortalToken');
      const response = await api.get(`/api/patient-portal/lab-results/${resultId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lab-report-${resultId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Report download not available');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Patient Portal</h1>
              <p className="text-sm text-slate-600">Welcome, {patient?.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Patient Info Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-500">MRN</p>
                <p className="font-semibold">{patient?.mrn}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Date of Birth</p>
                <p className="font-semibold">{patient?.dob ? new Date(patient.dob).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Blood Group</p>
                <p className="font-semibold">{patient?.bloodGroup || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Contact</p>
                <p className="font-semibold">{patient?.contact || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="appointments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="appointments" className="gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Appointments</span>
            </TabsTrigger>
            <TabsTrigger value="lab-results" className="gap-2">
              <TestTube className="w-4 h-4" />
              <span className="hidden sm:inline">Lab Results</span>
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="gap-2">
              <Pill className="w-4 h-4" />
              <span className="hidden sm:inline">Prescriptions</span>
            </TabsTrigger>
            <TabsTrigger value="bills" className="gap-2">
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Bills</span>
            </TabsTrigger>
          </TabsList>

          {/* Appointments Tab */}
          <TabsContent value="appointments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Appointments</CardTitle>
                <Button onClick={handleBookAppointment} className="bg-emerald-600 hover:bg-emerald-700">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No appointments found</p>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{apt.doctor}</p>
                            <p className="text-sm text-slate-500">{apt.department}</p>
                            <p className="text-sm text-slate-500">{apt.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{new Date(apt.date).toLocaleDateString()}</p>
                          <p className="text-sm text-slate-500">{apt.time}</p>
                          <Badge variant={apt.status === 'scheduled' ? 'default' : apt.status === 'completed' ? 'secondary' : 'destructive'}>
                            {apt.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lab Results Tab */}
          <TabsContent value="lab-results">
            <Card>
              <CardHeader>
                <CardTitle>Lab Results</CardTitle>
              </CardHeader>
              <CardContent>
                {labResults.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No lab results found</p>
                ) : (
                  <div className="space-y-4">
                    {labResults.map((result) => (
                      <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 ${result.isCritical ? 'bg-red-100' : 'bg-blue-100'} rounded-lg flex items-center justify-center`}>
                            <TestTube className={`w-6 h-6 ${result.isCritical ? 'text-red-600' : 'text-blue-600'}`} />
                          </div>
                          <div>
                            <p className="font-semibold">{result.testName}</p>
                            <p className="text-sm text-slate-500">{new Date(result.date).toLocaleDateString()}</p>
                            {result.isCritical && (
                              <Badge variant="destructive" className="mt-1">Critical</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={result.status === 'completed' ? 'secondary' : 'default'}>
                            {result.status}
                          </Badge>
                          {result.status === 'completed' && (
                            <Button variant="outline" size="sm" onClick={() => handleDownloadReport(result.id)}>
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions">
            <Card>
              <CardHeader>
                <CardTitle>Prescriptions</CardTitle>
              </CardHeader>
              <CardContent>
                {prescriptions.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No prescriptions found</p>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.map((rx) => (
                      <div key={rx.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold">{rx.doctor}</p>
                            <p className="text-sm text-slate-500">{new Date(rx.date).toLocaleDateString()}</p>
                          </div>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {rx.drugs.map((drug, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                              <Pill className="w-4 h-4 text-emerald-600" />
                              <span className="font-medium">{drug.name}</span>
                              <span className="text-sm text-slate-500">- {drug.dosage}</span>
                              <span className="text-sm text-slate-500">({drug.duration})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bills Tab */}
          <TabsContent value="bills">
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
              </CardHeader>
              <CardContent>
                {bills.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No bills found</p>
                ) : (
                  <div className="space-y-4">
                    {bills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 ${bill.balance > 0 ? 'bg-amber-100' : 'bg-green-100'} rounded-lg flex items-center justify-center`}>
                            {bill.balance > 0 ? (
                              <Clock className="w-6 h-6 text-amber-600" />
                            ) : (
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">Invoice #{bill.invoiceNumber}</p>
                            <p className="text-sm text-slate-500">{new Date(bill.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">Rs. {bill.amount.toLocaleString()}</p>
                          {bill.balance > 0 && (
                            <p className="text-sm text-amber-600">Balance: Rs. {bill.balance.toLocaleString()}</p>
                          )}
                          <Badge variant={bill.balance > 0 ? 'default' : 'secondary'}>
                            {bill.balance > 0 ? 'Pending' : 'Paid'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PatientPortal;
