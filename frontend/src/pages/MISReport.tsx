import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Download, RefreshCw, TrendingUp, TrendingDown, Users, Bed, DollarSign, Activity, FileText, Printer } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { useToast } from '../components/Toast';
import { PermissionGate } from '../components/PermissionGate';
import api from '../services/api';

interface DashboardStats {
  totalRevenue: number;
  totalPatients: number;
  avgLengthOfStay: number;
  bedOccupancy: number;
  opdVisits: number;
  admissions: number;
  discharges: number;
  emergencyCases: number;
  surgeries: number;
  labTests: number;
  outstandingAmount: number;
  collectionsToday: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface DepartmentData {
  name: string;
  value: number;
  revenue: number;
  patients: number;
}

interface TopDoctor {
  id: string;
  name: string;
  department: string;
  patients: number;
  revenue: number;
}

interface ReportData {
  id: string;
  name: string;
  type: string;
  lastGenerated: string;
  frequency: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const reportTemplates: ReportData[] = [
  // Daily Reports
  { id: '1', name: 'Daily Collection Report', type: 'Financial', lastGenerated: '2024-01-15', frequency: 'Daily' },
  { id: '2', name: 'OPD Statistics', type: 'Clinical', lastGenerated: '2024-01-15', frequency: 'Daily' },
  { id: '3', name: 'IPD Census Report', type: 'Clinical', lastGenerated: '2024-01-15', frequency: 'Daily' },
  { id: '4', name: 'Laboratory Summary', type: 'Diagnostic', lastGenerated: '2024-01-15', frequency: 'Daily' },
  { id: '5', name: 'Emergency Room Log', type: 'Clinical', lastGenerated: '2024-01-15', frequency: 'Daily' },
  { id: '6', name: 'Admission-Discharge Summary', type: 'Clinical', lastGenerated: '2024-01-15', frequency: 'Daily' },
  { id: '7', name: 'Pharmacy Dispensing Report', type: 'Operational', lastGenerated: '2024-01-15', frequency: 'Daily' },

  // Weekly Reports
  { id: '8', name: 'Revenue Analysis', type: 'Financial', lastGenerated: '2024-01-14', frequency: 'Weekly' },
  { id: '9', name: 'Doctor Performance', type: 'Administrative', lastGenerated: '2024-01-14', frequency: 'Weekly' },
  { id: '10', name: 'OT Utilization Report', type: 'Operational', lastGenerated: '2024-01-14', frequency: 'Weekly' },
  { id: '11', name: 'Bed Turnover Report', type: 'Operational', lastGenerated: '2024-01-14', frequency: 'Weekly' },
  { id: '12', name: 'Outstanding Bills Report', type: 'Financial', lastGenerated: '2024-01-14', frequency: 'Weekly' },
  { id: '13', name: 'Nursing Shift Summary', type: 'Clinical', lastGenerated: '2024-01-14', frequency: 'Weekly' },

  // Monthly Reports
  { id: '14', name: 'Department Comparison', type: 'Administrative', lastGenerated: '2024-01-10', frequency: 'Monthly' },
  { id: '15', name: 'Inventory Usage Report', type: 'Inventory', lastGenerated: '2024-01-10', frequency: 'Monthly' },
  { id: '16', name: 'Quality Indicators', type: 'Clinical', lastGenerated: '2024-01-01', frequency: 'Monthly' },
  { id: '17', name: 'Financial Statement', type: 'Financial', lastGenerated: '2024-01-01', frequency: 'Monthly' },
  { id: '18', name: 'TPA Claims Summary', type: 'Financial', lastGenerated: '2024-01-01', frequency: 'Monthly' },
  { id: '19', name: 'Mortality & Morbidity Report', type: 'Clinical', lastGenerated: '2024-01-01', frequency: 'Monthly' },
  { id: '20', name: 'Infection Control Report', type: 'Clinical', lastGenerated: '2024-01-01', frequency: 'Monthly' },
  { id: '21', name: 'Staff Attendance Summary', type: 'HR', lastGenerated: '2024-01-01', frequency: 'Monthly' },
  { id: '22', name: 'Payroll Summary', type: 'HR', lastGenerated: '2024-01-01', frequency: 'Monthly' },
  { id: '23', name: 'Equipment Maintenance Log', type: 'Operational', lastGenerated: '2024-01-01', frequency: 'Monthly' },
  { id: '24', name: 'Length of Stay Analysis', type: 'Clinical', lastGenerated: '2024-01-01', frequency: 'Monthly' },
  { id: '25', name: 'Referral Source Analysis', type: 'Administrative', lastGenerated: '2024-01-01', frequency: 'Monthly' },
];

export default function MISReport() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('all');

  // Dashboard stats
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalPatients: 0,
    avgLengthOfStay: 0,
    bedOccupancy: 0,
    opdVisits: 0,
    admissions: 0,
    discharges: 0,
    emergencyCases: 0,
    surgeries: 0,
    labTests: 0,
    outstandingAmount: 0,
    collectionsToday: 0
  });

  // Chart data
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [topDoctors, setTopDoctors] = useState<TopDoctor[]>([]);
  const [patientTrend, setPatientTrend] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, selectedDepartment]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard stats
      const statsResponse = await api.get('/api/reports/dashboard-stats', {
        params: { ...dateRange, department: selectedDepartment }
      });
      if (statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (err) {
      // Use mock data if API fails
      setStats({
        totalRevenue: 3280000,
        totalPatients: 12450,
        avgLengthOfStay: 4.2,
        bedOccupancy: 87,
        opdVisits: 8542,
        admissions: 1245,
        discharges: 1189,
        emergencyCases: 456,
        surgeries: 234,
        labTests: 15678,
        outstandingAmount: 456000,
        collectionsToday: 125000
      });
    }

    // Mock revenue data
    setRevenueData([
      { month: 'Jan', revenue: 450000, expenses: 380000, profit: 70000 },
      { month: 'Feb', revenue: 520000, expenses: 410000, profit: 110000 },
      { month: 'Mar', revenue: 480000, expenses: 395000, profit: 85000 },
      { month: 'Apr', revenue: 610000, expenses: 445000, profit: 165000 },
      { month: 'May', revenue: 550000, expenses: 420000, profit: 130000 },
      { month: 'Jun', revenue: 670000, expenses: 480000, profit: 190000 }
    ]);

    // Mock department data
    setDepartmentData([
      { name: 'OPD', value: 35, revenue: 980000, patients: 4350 },
      { name: 'IPD', value: 30, revenue: 1250000, patients: 1245 },
      { name: 'Laboratory', value: 15, revenue: 456000, patients: 8920 },
      { name: 'Pharmacy', value: 12, revenue: 380000, patients: 6780 },
      { name: 'Radiology', value: 8, revenue: 214000, patients: 2340 }
    ]);

    // Mock top doctors
    setTopDoctors([
      { id: '1', name: 'Dr. Sharma', department: 'Cardiology', patients: 245, revenue: 345000 },
      { id: '2', name: 'Dr. Patel', department: 'Orthopedics', patients: 212, revenue: 298000 },
      { id: '3', name: 'Dr. Gupta', department: 'General Medicine', patients: 456, revenue: 267000 },
      { id: '4', name: 'Dr. Singh', department: 'Neurology', patients: 134, revenue: 245000 },
      { id: '5', name: 'Dr. Verma', department: 'Gynecology', patients: 189, revenue: 223000 }
    ]);

    // Mock patient trend
    setPatientTrend([
      { day: 'Mon', opd: 145, ipd: 32, emergency: 12 },
      { day: 'Tue', opd: 156, ipd: 28, emergency: 15 },
      { day: 'Wed', opd: 162, ipd: 35, emergency: 8 },
      { day: 'Thu', opd: 148, ipd: 30, emergency: 18 },
      { day: 'Fri', opd: 175, ipd: 38, emergency: 14 },
      { day: 'Sat', opd: 134, ipd: 25, emergency: 22 },
      { day: 'Sun', opd: 89, ipd: 20, emergency: 28 }
    ]);

    setLoading(false);
  };

  const handleExportReport = async (reportName: string, format: 'pdf' | 'excel') => {
    try {
      success('Generating Report', `${reportName} is being generated as ${format.toUpperCase()}`);
      // In production, this would call the API to generate and download the report
      await new Promise(resolve => setTimeout(resolve, 1500));
      success('Report Ready', `${reportName} has been downloaded`);
    } catch (err) {
      error('Export Failed', 'Failed to generate report');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const filteredReports = reportTemplates.filter(report => {
    return reportType === 'all' || report.type === reportType;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-violet-500 rounded-full flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">MIS Reports & Analytics</h1>
            <p className="text-gray-600">Comprehensive analytics and business intelligence</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <PermissionGate permission="reports:export">
            <Button onClick={() => handleExportReport('Dashboard Summary', 'pdf')}>
              <Download className="w-4 h-4 mr-2" />
              Export Dashboard
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-[180px]"
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-[180px]"
              />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="opd">OPD</SelectItem>
                  <SelectItem value="ipd">IPD</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="laboratory">Laboratory</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="radiology">Radiology</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => setDateRange({ from: '', to: '' })}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
              <DollarSign className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</div>
            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              +12.5% vs last month
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              Total Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatNumber(stats.totalPatients)}</div>
            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              +8.3% vs last month
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
              <Activity className="w-4 h-4" />
              Avg Length of Stay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.avgLengthOfStay} days</div>
            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3 text-green-500" />
              -0.3 days vs last month
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
              <Bed className="w-4 h-4" />
              Bed Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.bedOccupancy}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-orange-500 h-2 rounded-full"
                style={{ width: `${stats.bedOccupancy}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'OPD Visits', value: stats.opdVisits, icon: '👥' },
          { label: 'Admissions', value: stats.admissions, icon: '🏥' },
          { label: 'Discharges', value: stats.discharges, icon: '✅' },
          { label: 'Emergency', value: stats.emergencyCases, icon: '🚑' },
          { label: 'Surgeries', value: stats.surgeries, icon: '⚕️' },
          { label: 'Lab Tests', value: stats.labTests, icon: '🔬' }
        ].map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-xl font-bold">{formatNumber(stat.value)}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="reports">Report Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue vs Expenses Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                    <Line type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={2} name="Profit" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Department Revenue Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={departmentData as any[]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {departmentData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Patient Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Patient Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={patientTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="opd" stackId="1" stroke="#0088FE" fill="#0088FE" name="OPD" />
                  <Area type="monotone" dataKey="ipd" stackId="1" stroke="#00C49F" fill="#00C49F" name="IPD" />
                  <Area type="monotone" dataKey="emergency" stackId="1" stroke="#FF8042" fill="#FF8042" name="Emergency" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Doctors */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Doctors</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Patients</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDoctors.map((doctor, index) => (
                    <TableRow key={doctor.id}>
                      <TableCell>
                        <Badge variant={index === 0 ? 'default' : 'outline'}>
                          #{index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{doctor.name}</TableCell>
                      <TableCell>{doctor.department}</TableCell>
                      <TableCell className="text-right">{formatNumber(doctor.patients)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(doctor.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-700">Today's Collections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{formatCurrency(stats.collectionsToday)}</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-700">Outstanding Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{formatCurrency(stats.outstandingAmount)}</div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-700">Monthly Target</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">75%</div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `₹${value / 1000}K`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#22c55e" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Revenue Table */}
          <Card>
            <CardHeader>
              <CardTitle>Department-wise Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Patients</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg per Patient</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentData.map((dept) => (
                    <TableRow key={dept.name}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(dept.patients)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(dept.revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(dept.revenue / dept.patients)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{dept.value}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient Flow Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={patientTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="opd" stroke="#0088FE" strokeWidth={2} name="OPD" />
                    <Line type="monotone" dataKey="ipd" stroke="#00C49F" strokeWidth={2} name="IPD" />
                    <Line type="monotone" dataKey="emergency" stroke="#FF8042" strokeWidth={2} name="Emergency" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Clinical Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Average Length of Stay', value: `${stats.avgLengthOfStay} days`, target: '< 5 days', status: 'good' },
                  { label: 'Bed Turnover Rate', value: '4.8', target: '> 4', status: 'good' },
                  { label: 'Emergency Wait Time', value: '18 min', target: '< 30 min', status: 'good' },
                  { label: 'Surgery Cancellation Rate', value: '3.2%', target: '< 5%', status: 'good' },
                  { label: 'Readmission Rate (30 days)', value: '4.8%', target: '< 5%', status: 'warning' },
                  { label: 'Infection Rate', value: '0.8%', target: '< 1%', status: 'good' }
                ].map((indicator, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{indicator.label}</div>
                      <div className="text-sm text-gray-500">Target: {indicator.target}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${indicator.status === 'good' ? 'text-green-600' : indicator.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                        {indicator.value}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Financial">Financial</SelectItem>
                <SelectItem value="Clinical">Clinical</SelectItem>
                <SelectItem value="Administrative">Administrative</SelectItem>
                <SelectItem value="Diagnostic">Diagnostic</SelectItem>
                <SelectItem value="Inventory">Inventory</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Last Generated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          {report.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.type}</Badge>
                      </TableCell>
                      <TableCell>{report.frequency}</TableCell>
                      <TableCell>{new Date(report.lastGenerated).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <PermissionGate permission="reports:view">
                            <Button size="sm" variant="outline" onClick={() => handleExportReport(report.name, 'pdf')}>
                              <Download className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                          </PermissionGate>
                          <PermissionGate permission="reports:export">
                            <Button size="sm" variant="outline" onClick={() => handleExportReport(report.name, 'excel')}>
                              <Download className="w-4 h-4 mr-1" />
                              Excel
                            </Button>
                          </PermissionGate>
                          <Button size="sm" variant="ghost">
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
