import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Plus, Clock, Bell, AlertTriangle, CheckCircle } from 'lucide-react';

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  doctorId?: string;
  department: string;
  date: string;
  time: string;
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-Show';
  type: 'In-Person' | 'Teleconsultation';
}

interface TimeSlot {
  start: string;
  end: string;
  isBooked: boolean;
  isAvailable: boolean;
}

interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts?: Array<{
    appointmentId: string;
    patientName: string;
    time: string;
  }>;
  nextAvailableSlot?: string;
  message: string;
}

export default function Appointment() {
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: '1',
      patientName: 'John Doe',
      doctorName: 'Dr. Sarah Smith',
      doctorId: 'doc-1',
      department: 'Cardiology',
      date: '2025-12-06',
      time: '10:00',
      status: 'Confirmed',
      type: 'In-Person'
    },
    {
      id: '2',
      patientName: 'Jane Wilson',
      doctorName: 'Dr. Michael Johnson',
      doctorId: 'doc-2',
      department: 'Orthopedics',
      date: '2025-12-06',
      time: '11:30',
      status: 'Scheduled',
      type: 'Teleconsultation'
    }
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [conflictWarning, setConflictWarning] = useState<ConflictCheckResult | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({
    patientName: '',
    patientPhone: '',
    doctorName: '',
    doctorId: '',
    department: '',
    date: '',
    time: '',
    type: 'In-Person' as const,
    reason: '',
    priority: 'Normal'
  });

  // Fetch available slots when doctor and date are selected
  useEffect(() => {
    if (formData.doctorId && formData.date) {
      fetchAvailableSlots(formData.doctorId, formData.date);
    } else {
      setAvailableSlots([]);
    }
  }, [formData.doctorId, formData.date]);

  // Check for conflicts when time is selected
  useEffect(() => {
    if (formData.doctorId && formData.date && formData.time) {
      checkConflict(formData.doctorId, formData.date, formData.time);
    } else {
      setConflictWarning(null);
    }
  }, [formData.doctorId, formData.date, formData.time]);

  const fetchAvailableSlots = async (_doctorId: string, _date: string) => {
    setLoadingSlots(true);
    try {
      // Mock API call - replace with actual API
      // const response = await fetch(`/api/doctors/${doctorId}/availability?date=${date}`);
      // const data = await response.json();

      // Simulating API response
      const mockSlots: TimeSlot[] = [
        { start: '09:00', end: '09:30', isBooked: false, isAvailable: true },
        { start: '09:30', end: '10:00', isBooked: true, isAvailable: false },
        { start: '10:00', end: '10:30', isBooked: true, isAvailable: false },
        { start: '10:30', end: '11:00', isBooked: false, isAvailable: true },
        { start: '11:00', end: '11:30', isBooked: false, isAvailable: true },
        { start: '11:30', end: '12:00', isBooked: true, isAvailable: false },
        { start: '14:00', end: '14:30', isBooked: false, isAvailable: true },
        { start: '14:30', end: '15:00', isBooked: false, isAvailable: true },
        { start: '15:00', end: '15:30', isBooked: false, isAvailable: true },
        { start: '15:30', end: '16:00', isBooked: false, isAvailable: true },
      ];

      setAvailableSlots(mockSlots);
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const checkConflict = async (_doctorId: string, _date: string, time: string) => {
    try {
      // Mock API call - replace with actual API
      // const response = await fetch('/api/appointments/check-conflict', {
      //   method: 'POST',
      //   body: JSON.stringify({ doctorId, appointmentDate: date, appointmentTime: time })
      // });
      // const data = await response.json();

      // Check if the selected slot is booked
      const selectedSlot = availableSlots.find(slot => slot.start === time);
      if (selectedSlot && !selectedSlot.isAvailable) {
        setConflictWarning({
          hasConflict: true,
          message: 'This time slot is already booked',
          nextAvailableSlot: availableSlots.find(s => s.isAvailable)?.start,
          conflicts: [{ appointmentId: 'mock-1', patientName: 'John Doe', time }]
        });
      } else {
        setConflictWarning({ hasConflict: false, message: 'Slot is available' });
      }
    } catch (error) {
      console.error('Error checking conflict:', error);
    }
  };

  const handleSubmit = () => {
    if (conflictWarning?.hasConflict) {
      alert('Please select an available time slot');
      return;
    }

    const newAppointment: Appointment = {
      id: String(appointments.length + 1),
      patientName: formData.patientName,
      doctorName: formData.doctorName,
      doctorId: formData.doctorId,
      department: formData.department,
      date: formData.date,
      time: formData.time,
      status: 'Scheduled',
      type: formData.type
    };

    setAppointments([...appointments, newAppointment]);
    setIsDialogOpen(false);
    setFormData({
      patientName: '', patientPhone: '', doctorName: '', doctorId: '', department: '',
      date: '', time: '', type: 'In-Person', reason: '', priority: 'Normal'
    });
    setConflictWarning(null);
    setAvailableSlots([]);
  };

  const handleConfirmAppointment = (appointment: Appointment) => {
    setAppointments(appointments.map(apt =>
      apt.id === appointment.id ? { ...apt, status: 'Confirmed' } : apt
    ));
  };

  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setFormData({
      ...formData,
      date: appointment.date,
      time: appointment.time
    });
    setIsRescheduleDialogOpen(true);
  };

  const handleRescheduleSubmit = () => {
    if (!selectedAppointment) return;
    setAppointments(appointments.map(apt =>
      apt.id === selectedAppointment.id
        ? { ...apt, date: formData.date, time: formData.time, status: 'Scheduled' }
        : apt
    ));
    setIsRescheduleDialogOpen(false);
    setSelectedAppointment(null);
  };

  const handleCancelAppointment = (appointment: Appointment) => {
    if (confirm(`Are you sure you want to cancel the appointment for ${appointment.patientName}?`)) {
      setAppointments(appointments.map(apt =>
        apt.id === appointment.id ? { ...apt, status: 'Cancelled' } : apt
      ));
    }
  };

  const handleSendReminder = async (appointment: Appointment) => {
    try {
      // Mock API call - replace with actual API
      // await fetch(`/api/appointments/${appointment.id}/send-reminder`, { method: 'POST' });

      alert(`Reminder sent successfully to ${appointment.patientName}`);
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Failed to send reminder');
    }
  };

  const getStatusColor = (status: Appointment['status']) => {
    const colors = {
      'Scheduled': 'secondary',
      'Confirmed': 'default',
      'Completed': 'default',
      'Cancelled': 'destructive',
      'No-Show': 'destructive'
    };
    return colors[status] as any;
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Appointment Management</h1>
          <p className="text-slate-600">Schedule and manage patient appointments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Schedule Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
              <DialogDescription>
                Book an appointment for a patient with a doctor
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Patient Name *</Label>
                <Input id="patientName" value={formData.patientName} onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patientPhone">Patient Phone *</Label>
                <Input id="patientPhone" value={formData.patientPhone} onChange={(e) => setFormData(prev => ({ ...prev, patientPhone: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                    <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                    <SelectItem value="Neurology">Neurology</SelectItem>
                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="Dermatology">Dermatology</SelectItem>
                    <SelectItem value="ENT">ENT</SelectItem>
                    <SelectItem value="General Medicine">General Medicine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctorName">Doctor *</Label>
                <Select
                  value={formData.doctorName}
                  onValueChange={(value) => {
                    const doctorMap: Record<string, string> = {
                      'Dr. Sarah Smith': 'doc-1',
                      'Dr. Michael Johnson': 'doc-2',
                      'Dr. Emily Davis': 'doc-3',
                      'Dr. Robert Brown': 'doc-4',
                    };
                    setFormData(prev => ({
                      ...prev,
                      doctorName: value,
                      doctorId: doctorMap[value] || ''
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr. Sarah Smith">Dr. Sarah Smith</SelectItem>
                    <SelectItem value="Dr. Michael Johnson">Dr. Michael Johnson</SelectItem>
                    <SelectItem value="Dr. Emily Davis">Dr. Emily Davis</SelectItem>
                    <SelectItem value="Dr. Robert Brown">Dr. Robert Brown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Appointment Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              {/* Available Slots Section */}
              {formData.doctorId && formData.date && (
                <div className="col-span-2 space-y-2">
                  <Label>Available Time Slots</Label>
                  {loadingSlots ? (
                    <div className="text-sm text-gray-500">Loading slots...</div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border rounded">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.start}
                          type="button"
                          variant={formData.time === slot.start ? "default" : "outline"}
                          className={`text-sm ${
                            slot.isBooked
                              ? 'bg-red-50 text-red-500 cursor-not-allowed'
                              : slot.isAvailable && formData.time === slot.start
                              ? 'bg-blue-500 text-white'
                              : 'hover:bg-blue-50'
                          }`}
                          disabled={slot.isBooked}
                          onClick={() => setFormData(prev => ({ ...prev, time: slot.start }))}
                        >
                          {slot.start}
                          {slot.isBooked && ' ✗'}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Select a doctor and date to view available slots</div>
                  )}
                </div>
              )}

              {/* Conflict Warning */}
              {conflictWarning && conflictWarning.hasConflict && (
                <div className="col-span-2">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {conflictWarning.message}
                      {conflictWarning.nextAvailableSlot && (
                        <div className="mt-2">
                          Next available: {conflictWarning.nextAvailableSlot}
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-2"
                            onClick={() => setFormData(prev => ({ ...prev, time: conflictWarning.nextAvailableSlot! }))}
                          >
                            Select
                          </Button>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {conflictWarning && !conflictWarning.hasConflict && formData.time && (
                <div className="col-span-2">
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-600">
                      Time slot is available!
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="type">Appointment Type *</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In-Person">In-Person</SelectItem>
                    <SelectItem value="Teleconsultation">Teleconsultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="reason">Reason for Visit</Label>
                <Input id="reason" value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))} placeholder="Brief description" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>Schedule Appointment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">18</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">6</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">No-Shows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">2</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Schedule</CardTitle>
          <CardDescription>View and manage all appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="font-medium">{appointment.patientName}</TableCell>
                  <TableCell>{appointment.doctorName}</TableCell>
                  <TableCell>{appointment.department}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {appointment.date}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {appointment.time}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{appointment.type}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfirmAppointment(appointment)}
                        disabled={appointment.status === 'Confirmed' || appointment.status === 'Cancelled' || appointment.status === 'Completed'}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReschedule(appointment)}
                        disabled={appointment.status === 'Cancelled' || appointment.status === 'Completed'}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleSendReminder(appointment)}
                        disabled={appointment.status === 'Cancelled' || appointment.status === 'Completed'}
                      >
                        <Bell className="w-3 h-3" />
                        Reminder
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelAppointment(appointment)}
                        disabled={appointment.status === 'Cancelled' || appointment.status === 'Completed'}
                      >
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              {selectedAppointment && `Reschedule appointment for ${selectedAppointment.patientName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">New Date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">New Time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRescheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRescheduleSubmit}>Confirm Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
