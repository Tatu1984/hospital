import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/Toast';
import {
  Fingerprint, Search, Clock, Users, AlertTriangle,
  CheckCircle, XCircle, Calendar, RefreshCw, Download
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  shift: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY';
  workHours?: number;
  overtime?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  deviceId?: string;
  location?: string;
}

interface AttendanceSummary {
  employeeId: string;
  employeeName: string;
  department: string;
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  workHours: number;
  overtime: number;
}

interface BiometricDevice {
  id: string;
  name: string;
  location: string;
  ipAddress: string;
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING';
  lastSync: string;
  enrolledUsers: number;
}

const DEPARTMENTS = ['ICU', 'Emergency', 'OPD', 'Laboratory', 'Radiology', 'Pharmacy', 'Nursing', 'Administration', 'Housekeeping'];
const SHIFTS = [
  { id: 'morning', name: 'Morning', time: '06:00 - 14:00' },
  { id: 'afternoon', name: 'Afternoon', time: '14:00 - 22:00' },
  { id: 'night', name: 'Night', time: '22:00 - 06:00' },
  { id: 'general', name: 'General', time: '09:00 - 18:00' },
];

export default function BiometricAttendance() {
  const { success: showToast } = useToast();
  const [activeTab, setActiveTab] = useState('today');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary[]>([]);
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      // Mock attendance records
      const mockRecords: AttendanceRecord[] = [
        {
          id: '1',
          employeeId: 'E001',
          employeeName: 'Dr. Amit Sharma',
          employeeCode: 'DOC-001',
          department: 'OPD',
          designation: 'Senior Consultant',
          shift: 'general',
          date: selectedDate,
          checkIn: '08:55',
          checkOut: '18:30',
          status: 'PRESENT',
          workHours: 9.5,
          overtime: 0.5,
          deviceId: 'BIO-001',
          location: 'Main Entrance',
        },
        {
          id: '2',
          employeeId: 'E002',
          employeeName: 'Nurse Priya Patel',
          employeeCode: 'NUR-001',
          department: 'ICU',
          designation: 'Staff Nurse',
          shift: 'morning',
          date: selectedDate,
          checkIn: '06:15',
          checkOut: '14:10',
          status: 'LATE',
          workHours: 7.9,
          lateMinutes: 15,
          deviceId: 'BIO-002',
          location: 'ICU Entrance',
        },
        {
          id: '3',
          employeeId: 'E003',
          employeeName: 'Rajesh Kumar',
          employeeCode: 'LAB-001',
          department: 'Laboratory',
          designation: 'Lab Technician',
          shift: 'general',
          date: selectedDate,
          checkIn: '09:00',
          status: 'PRESENT',
          deviceId: 'BIO-001',
          location: 'Main Entrance',
        },
        {
          id: '4',
          employeeId: 'E004',
          employeeName: 'Meera Singh',
          employeeCode: 'NUR-002',
          department: 'Emergency',
          designation: 'Head Nurse',
          shift: 'night',
          date: selectedDate,
          status: 'ON_LEAVE',
        },
        {
          id: '5',
          employeeId: 'E005',
          employeeName: 'Suresh Verma',
          employeeCode: 'ADM-001',
          department: 'Administration',
          designation: 'Admin Officer',
          shift: 'general',
          date: selectedDate,
          status: 'ABSENT',
        },
      ];
      setRecords(mockRecords);

      // Mock summary
      setSummary([
        {
          employeeId: 'E001',
          employeeName: 'Dr. Amit Sharma',
          department: 'OPD',
          totalDays: 26,
          present: 24,
          absent: 0,
          late: 2,
          halfDay: 0,
          leave: 2,
          workHours: 210,
          overtime: 15,
        },
        {
          employeeId: 'E002',
          employeeName: 'Nurse Priya Patel',
          department: 'ICU',
          totalDays: 26,
          present: 22,
          absent: 1,
          late: 3,
          halfDay: 1,
          leave: 2,
          workHours: 195,
          overtime: 8,
        },
      ]);

      // Mock devices
      setDevices([
        {
          id: 'BIO-001',
          name: 'Main Entrance Device',
          location: 'Main Entrance',
          ipAddress: '192.168.1.101',
          status: 'ONLINE',
          lastSync: new Date().toISOString(),
          enrolledUsers: 456,
        },
        {
          id: 'BIO-002',
          name: 'ICU Entrance Device',
          location: 'ICU Block',
          ipAddress: '192.168.1.102',
          status: 'ONLINE',
          lastSync: new Date().toISOString(),
          enrolledUsers: 120,
        },
        {
          id: 'BIO-003',
          name: 'Emergency Block Device',
          location: 'Emergency',
          ipAddress: '192.168.1.103',
          status: 'OFFLINE',
          lastSync: new Date(Date.now() - 3600000).toISOString(),
          enrolledUsers: 85,
        },
      ]);
    } catch (error) {
      showToast('Failed to fetch attendance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDevices = async () => {
    showToast('Syncing all devices...', 'success');
    // In production, this would trigger actual device sync
    setTimeout(() => {
      showToast('All devices synced successfully', 'success');
      fetchData();
    }, 2000);
  };

  const handleExport = () => {
    showToast('Exporting attendance report...', 'success');
    // In production, this would download a CSV/Excel file
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch =
      r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || r.department === filterDepartment;
    const matchesShift = filterShift === 'all' || r.shift === filterShift;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesDepartment && matchesShift && matchesStatus;
  });

  const stats = {
    total: records.length,
    present: records.filter(r => r.status === 'PRESENT').length,
    late: records.filter(r => r.status === 'LATE').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    onLeave: records.filter(r => r.status === 'ON_LEAVE').length,
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PRESENT: 'bg-green-100 text-green-800',
      ABSENT: 'bg-red-100 text-red-800',
      LATE: 'bg-yellow-100 text-yellow-800',
      HALF_DAY: 'bg-orange-100 text-orange-800',
      ON_LEAVE: 'bg-blue-100 text-blue-800',
      HOLIDAY: 'bg-purple-100 text-purple-800',
    };
    return <Badge className={colors[status]}>{status.replace('_', ' ')}</Badge>;
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
          <h1 className="text-2xl font-bold text-slate-800">Biometric Attendance</h1>
          <p className="text-slate-600">Staff attendance and time tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncDevices}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Devices
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Staff</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Present</p>
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Late</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">On Leave</p>
                <p className="text-2xl font-bold text-purple-600">{stats.onLeave}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today">Today's Attendance</TabsTrigger>
          <TabsTrigger value="summary">Monthly Summary</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        {/* Today's Attendance */}
        <TabsContent value="today" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search by name or code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-[150px]"
                />
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterShift} onValueChange={setFilterShift}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    {SHIFTS.map(shift => (
                      <SelectItem key={shift.id} value={shift.id}>{shift.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="LATE">Late</SelectItem>
                    <SelectItem value="ON_LEAVE">On Leave</SelectItem>
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
                    <th className="text-left p-4">Employee</th>
                    <th className="text-left p-4">Department</th>
                    <th className="text-left p-4">Shift</th>
                    <th className="text-left p-4">Check In</th>
                    <th className="text-left p-4">Check Out</th>
                    <th className="text-left p-4">Hours</th>
                    <th className="text-left p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-t hover:bg-slate-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{record.employeeName}</p>
                          <p className="text-sm text-slate-500">{record.employeeCode}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p>{record.department}</p>
                        <p className="text-sm text-slate-500">{record.designation}</p>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {SHIFTS.find(s => s.id === record.shift)?.name || record.shift}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {record.checkIn ? (
                          <div className="flex items-center gap-2">
                            <span>{record.checkIn}</span>
                            {record.lateMinutes && record.lateMinutes > 0 && (
                              <span className="text-xs text-red-500">+{record.lateMinutes}m</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {record.checkOut || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="p-4">
                        {record.workHours ? (
                          <div>
                            <span>{record.workHours}h</span>
                            {record.overtime && record.overtime > 0 && (
                              <span className="text-xs text-green-500 ml-1">(+{record.overtime}h OT)</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4">{getStatusBadge(record.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Summary */}
        <TabsContent value="summary" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4">Employee</th>
                    <th className="text-left p-4">Department</th>
                    <th className="text-center p-4">Present</th>
                    <th className="text-center p-4">Absent</th>
                    <th className="text-center p-4">Late</th>
                    <th className="text-center p-4">Leave</th>
                    <th className="text-center p-4">Work Hours</th>
                    <th className="text-center p-4">Overtime</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s) => (
                    <tr key={s.employeeId} className="border-t">
                      <td className="p-4 font-medium">{s.employeeName}</td>
                      <td className="p-4">{s.department}</td>
                      <td className="p-4 text-center text-green-600 font-medium">{s.present}</td>
                      <td className="p-4 text-center text-red-600 font-medium">{s.absent}</td>
                      <td className="p-4 text-center text-yellow-600 font-medium">{s.late}</td>
                      <td className="p-4 text-center text-blue-600 font-medium">{s.leave}</td>
                      <td className="p-4 text-center">{s.workHours}h</td>
                      <td className="p-4 text-center text-green-600">{s.overtime}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices */}
        <TabsContent value="devices" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {devices.map((device) => (
              <Card key={device.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-6 h-6 text-blue-600" />
                      <h3 className="font-medium">{device.name}</h3>
                    </div>
                    <Badge className={
                      device.status === 'ONLINE' ? 'bg-green-500' :
                      device.status === 'SYNCING' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }>
                      {device.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Location:</span>
                      <span>{device.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">IP Address:</span>
                      <span className="font-mono">{device.ipAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Enrolled Users:</span>
                      <span>{device.enrolledUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Sync:</span>
                      <span>{new Date(device.lastSync).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Sync
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
