import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Clock, CheckCircle, XCircle, Users } from 'lucide-react';
import api from '../services/api';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
  joiningDate: string;
  status: string;
  shift: string;
}

interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hoursWorked: number;
  status: string;
}

interface Leave {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: string;
}

interface EmployeeFormData {
  name: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
  joiningDate: string;
  shift: string;
  salary: string;
}

export default function HR() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [employeeFormData, setEmployeeFormData] = useState<EmployeeFormData>({
    name: '',
    designation: '',
    department: '',
    phone: '',
    email: '',
    joiningDate: '',
    shift: 'DAY',
    salary: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
    fetchLeaves();
  }, [selectedDate]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/api/hr/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await api.get(`/api/hr/attendance?date=${selectedDate}`);
      setAttendance(response.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchLeaves = async () => {
    try {
      const response = await api.get('/api/hr/leaves');
      setLeaves(response.data);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    }
  };

  const handleAddEmployee = async () => {
    setLoading(true);
    try {
      await api.post('/api/hr/employees', employeeFormData);
      await fetchEmployees();
      setIsEmployeeDialogOpen(false);
      resetEmployeeForm();
      alert('Employee added successfully');
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (employeeId: string, status: string) => {
    setLoading(true);
    try {
      await api.post('/api/hr/attendance', {
        employeeId,
        date: selectedDate,
        status,
        checkIn: new Date().toISOString()
      });
      await fetchAttendance();
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveAction = async (leaveId: string, action: 'APPROVE' | 'REJECT') => {
    setLoading(true);
    try {
      await api.post(`/api/hr/leaves/${leaveId}/${action.toLowerCase()}`);
      await fetchLeaves();
      alert(`Leave ${action.toLowerCase()}d successfully`);
    } catch (error) {
      console.error(`Error ${action.toLowerCase()}ing leave:`, error);
      alert(`Failed to ${action.toLowerCase()} leave`);
    } finally {
      setLoading(false);
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeFormData({
      name: '',
      designation: '',
      department: '',
      phone: '',
      email: '',
      joiningDate: '',
      shift: 'DAY',
      salary: ''
    });
  };

  const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
  const todayAttendance = attendance.filter(a => a.date === selectedDate);
  const presentToday = todayAttendance.filter(a => a.status === 'PRESENT').length;
  const absentToday = todayAttendance.filter(a => a.status === 'ABSENT').length;
  const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;

  const stats = {
    totalEmployees: employees.length,
    activeEmployees: activeEmployees.length,
    presentToday,
    absentToday,
    pendingLeaves
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">HR & Staff Management</h1>
          <p className="text-slate-600">Employee records, attendance tracking, and leave management</p>
        </div>
        <Button onClick={() => setIsEmployeeDialogOpen(true)} size="lg">
          <UserPlus className="w-5 h-5 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeEmployees}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
              <CheckCircle className="w-4 h-4" />
              Present Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.presentToday}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
              <XCircle className="w-4 h-4" />
              Absent Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absentToday}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <Clock className="w-4 h-4" />
              Pending Leaves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingLeaves}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>HR Management</CardTitle>
          <CardDescription>Manage employees, attendance, and leave requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="employees">
            <TabsList>
              <TabsTrigger value="employees">Employees ({stats.totalEmployees})</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="leaves">Leave Requests ({stats.pendingLeaves})</TabsTrigger>
            </TabsList>

            <TabsContent value="employees">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.employeeId}</TableCell>
                        <TableCell>{emp.name}</TableCell>
                        <TableCell>{emp.designation}</TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell>{emp.phone}</TableCell>
                        <TableCell><Badge variant="outline">{emp.shift}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={emp.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {emp.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="attendance">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label>Select Date:</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-48"
                  />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Hours Worked</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeEmployees.map((emp) => {
                      const att = todayAttendance.find(a => a.employeeId === emp.id);
                      return (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.name}</TableCell>
                          <TableCell>{att?.checkIn || '-'}</TableCell>
                          <TableCell>{att?.checkOut || '-'}</TableCell>
                          <TableCell>{att?.hoursWorked || '-'}</TableCell>
                          <TableCell>
                            {att ? (
                              <Badge variant={att.status === 'PRESENT' ? 'default' : 'destructive'}>
                                {att.status}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Not Marked</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!att && (
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleMarkAttendance(emp.id, 'PRESENT')}>
                                  Present
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleMarkAttendance(emp.id, 'ABSENT')}>
                                  Absent
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="leaves">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No leave requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">{leave.employeeName}</TableCell>
                        <TableCell><Badge variant="outline">{leave.leaveType}</Badge></TableCell>
                        <TableCell>{new Date(leave.fromDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(leave.toDate).toLocaleDateString()}</TableCell>
                        <TableCell>{leave.days}</TableCell>
                        <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              leave.status === 'APPROVED' ? 'default' :
                              leave.status === 'REJECTED' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {leave.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {leave.status === 'PENDING' && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleLeaveAction(leave.id, 'APPROVE')}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleLeaveAction(leave.id, 'REJECT')}>
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>Register a new staff member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  placeholder="Employee name"
                  value={employeeFormData.name}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Designation *</Label>
                <Input
                  placeholder="Job title"
                  value={employeeFormData.designation}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, designation: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select
                  value={employeeFormData.department}
                  onValueChange={(value) => setEmployeeFormData({ ...employeeFormData, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Medical">Medical</SelectItem>
                    <SelectItem value="Nursing">Nursing</SelectItem>
                    <SelectItem value="Administration">Administration</SelectItem>
                    <SelectItem value="Laboratory">Laboratory</SelectItem>
                    <SelectItem value="Radiology">Radiology</SelectItem>
                    <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Shift *</Label>
                <Select
                  value={employeeFormData.shift}
                  onValueChange={(value) => setEmployeeFormData({ ...employeeFormData, shift: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAY">Day Shift</SelectItem>
                    <SelectItem value="NIGHT">Night Shift</SelectItem>
                    <SelectItem value="ROTATING">Rotating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  placeholder="Contact number"
                  value={employeeFormData.phone}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={employeeFormData.email}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Joining Date *</Label>
                <Input
                  type="date"
                  value={employeeFormData.joiningDate}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, joiningDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Salary</Label>
                <Input
                  type="number"
                  placeholder="Monthly salary"
                  value={employeeFormData.salary}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, salary: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmployeeDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAddEmployee} disabled={loading}>
              {loading ? 'Adding...' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
