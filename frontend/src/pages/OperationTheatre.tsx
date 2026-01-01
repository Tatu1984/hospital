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
import { Clock, CheckCircle, AlertCircle, Calendar, FileText, Plus, Activity } from 'lucide-react';
import api from '../services/api';

interface Surgery {
  id: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  age: number;
  gender: string;
  procedureName: string;
  surgeonName: string;
  otRoom: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  status: string;
  priority: string;
  anesthesiaType: string;
  preOpChecklist: boolean;
  notes: string;
  actualStartTime?: string;
  actualEndTime?: string;
  complications?: string;
  implants?: any;
}

interface OTRoom {
  id: string;
  roomNumber: string;
  status: string;
  currentSurgery?: {
    patientName: string;
    procedureName: string;
    startTime: string;
  };
}

interface SurgeryFormData {
  patientId: string;
  procedureName: string;
  surgeonId: string;
  otRoomId: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: string;
  priority: string;
  anesthesiaType: string;
  anesthetistId: string;
  notes: string;
}

interface ChecklistItem {
  id: string;
  item: string;
  completed: boolean;
}

interface PostOpData {
  postOpNotes: string;
  complications: string;
  implants: string;
}

export default function OperationTheatre() {
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [otRooms, setOTRooms] = useState<OTRoom[]>([]);
  const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [isPostOpDialogOpen, setIsPostOpDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [cancelReason, setCancelReason] = useState('');
  const [postOpData, setPostOpData] = useState<PostOpData>({
    postOpNotes: '',
    complications: '',
    implants: ''
  });

  const [surgeryFormData, setSurgeryFormData] = useState<SurgeryFormData>({
    patientId: '',
    procedureName: '',
    surgeonId: '',
    otRoomId: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: '',
    priority: 'ELECTIVE',
    anesthesiaType: '',
    anesthetistId: '',
    notes: ''
  });

  useEffect(() => {
    fetchSurgeries();
    fetchOTRooms();
    const interval = setInterval(() => {
      fetchSurgeries();
      fetchOTRooms();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSurgeries = async () => {
    try {
      const response = await api.get('/api/surgeries');
      const transformedSurgeries = response.data.map((s: any) => ({
        id: s.id,
        patientId: s.patientId,
        patientName: s.patient?.name || 'Unknown',
        patientMRN: s.patient?.mrn || 'N/A',
        age: s.patient?.age || 0,
        gender: s.patient?.gender || 'Unknown',
        procedureName: s.procedureName,
        surgeonName: s.surgeon?.name || 'Dr. ' + (s.surgeonId?.substring(0, 8) || 'Unknown'),
        otRoom: s.otRoom?.roomNumber || 'TBD',
        scheduledDate: s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString() : 'TBD',
        scheduledTime: s.scheduledTime || 'TBD',
        duration: s.estimatedDuration || 0,
        status: s.status,
        priority: s.priority,
        anesthesiaType: s.anesthesiaType,
        preOpChecklist: s.preOpChecklistComplete || false,
        notes: s.notes || '',
        actualStartTime: s.actualStartTime,
        actualEndTime: s.actualEndTime,
        complications: s.complications,
        implants: s.implants
      }));
      setSurgeries(transformedSurgeries);
    } catch (error) {
      console.error('Error fetching surgeries:', error);
    }
  };

  const fetchOTRooms = async () => {
    try {
      const response = await api.get('/api/ot-rooms');
      setOTRooms(response.data);
    } catch (error) {
      console.error('Error fetching OT rooms:', error);
    }
  };

  const handleScheduleSurgery = async () => {
    setLoading(true);
    try {
      await api.post('/api/surgeries', {
        patientId: surgeryFormData.patientId,
        procedureName: surgeryFormData.procedureName,
        surgeonId: surgeryFormData.surgeonId,
        otRoomId: surgeryFormData.otRoomId,
        scheduledDate: surgeryFormData.scheduledDate,
        scheduledTime: surgeryFormData.scheduledTime,
        estimatedDuration: parseInt(surgeryFormData.duration),
        priority: surgeryFormData.priority,
        anesthesiaType: surgeryFormData.anesthesiaType,
        anesthetistId: surgeryFormData.anesthetistId,
        notes: surgeryFormData.notes
      });

      await fetchSurgeries();
      setIsScheduleDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error scheduling surgery:', error);
      alert('Failed to schedule surgery');
    } finally {
      setLoading(false);
    }
  };

  const fetchChecklist = async (surgeryId: string) => {
    try {
      const response = await api.get(`/api/surgeries/${surgeryId}/checklist`);
      setChecklistItems(response.data.items);
      return response.data.completed;
    } catch (error) {
      console.error('Error fetching checklist:', error);
      return false;
    }
  };

  const handleStartSurgeryClick = async (surgery: Surgery) => {
    setSelectedSurgery(surgery);
    const checklistComplete = await fetchChecklist(surgery.id);

    if (!checklistComplete) {
      setIsChecklistDialogOpen(true);
    } else {
      handleStartSurgery(surgery.id);
    }
  };

  const handleChecklistComplete = async () => {
    if (!selectedSurgery) return;

    setLoading(true);
    try {
      await api.post(`/api/surgeries/${selectedSurgery.id}/checklist`, { completed: true });
      setIsChecklistDialogOpen(false);
      await handleStartSurgery(selectedSurgery.id);
    } catch (error) {
      console.error('Error completing checklist:', error);
      alert('Failed to complete checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSurgery = async (surgeryId: string) => {
    setLoading(true);
    try {
      await api.post(`/api/surgeries/${surgeryId}/start`);
      await fetchSurgeries();
      await fetchOTRooms();
      alert('Surgery started successfully');
    } catch (error) {
      console.error('Error starting surgery:', error);
      alert('Failed to start surgery');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSurgeryClick = (surgery: Surgery) => {
    setSelectedSurgery(surgery);
    setPostOpData({
      postOpNotes: '',
      complications: '',
      implants: ''
    });
    setIsPostOpDialogOpen(true);
  };

  const handlePostOpSubmit = async () => {
    if (!selectedSurgery) return;

    setLoading(true);
    try {
      await api.post(`/api/surgeries/${selectedSurgery.id}/complete`, postOpData);
      await fetchSurgeries();
      await fetchOTRooms();
      setIsPostOpDialogOpen(false);
      alert('Surgery completed successfully');
    } catch (error) {
      console.error('Error completing surgery:', error);
      alert('Failed to complete surgery');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSurgery = async (surgeryId: string) => {
    setLoading(true);
    try {
      await api.post(`/api/surgeries/${surgeryId}/complete`);
      await fetchSurgeries();
      await fetchOTRooms();
      alert('Surgery completed successfully');
    } catch (error) {
      console.error('Error completing surgery:', error);
      alert('Failed to complete surgery');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSurgeryClick = (surgery: Surgery) => {
    setSelectedSurgery(surgery);
    setCancelReason('');
    setIsCancelDialogOpen(true);
  };

  const handleCancelSurgerySubmit = async () => {
    if (!selectedSurgery) return;
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/surgeries/${selectedSurgery.id}/cancel`, { reason: cancelReason });
      await fetchSurgeries();
      setIsCancelDialogOpen(false);
      alert('Surgery cancelled');
    } catch (error) {
      console.error('Error cancelling surgery:', error);
      alert('Failed to cancel surgery');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSurgery = async (surgeryId: string) => {
    if (!confirm('Are you sure you want to cancel this surgery?')) return;

    setLoading(true);
    try {
      await api.post(`/api/surgeries/${surgeryId}/cancel`);
      await fetchSurgeries();
      alert('Surgery cancelled');
    } catch (error) {
      console.error('Error cancelling surgery:', error);
      alert('Failed to cancel surgery');
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (startTime: string | null, endTime: string | null) => {
    if (!startTime || !endTime) return null;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const resetForm = () => {
    setSurgeryFormData({
      patientId: '',
      procedureName: '',
      surgeonId: '',
      otRoomId: '',
      scheduledDate: '',
      scheduledTime: '',
      duration: '',
      priority: 'ELECTIVE',
      anesthesiaType: '',
      anesthetistId: '',
      notes: ''
    });
  };

  const openDetailsDialog = (surgery: Surgery) => {
    setSelectedSurgery(surgery);
    setIsDetailsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="secondary">{status}</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-600">{status}</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-600">{status}</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY':
        return <Badge className="bg-red-600">EMERGENCY</Badge>;
      case 'URGENT':
        return <Badge className="bg-orange-600">URGENT</Badge>;
      case 'ELECTIVE':
        return <Badge variant="outline">ELECTIVE</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getOTRoomStatus = (status: string) => {
    switch (status) {
      case 'OCCUPIED':
        return 'bg-red-100 border-red-300';
      case 'AVAILABLE':
        return 'bg-green-100 border-green-300';
      case 'CLEANING':
        return 'bg-yellow-100 border-yellow-300';
      default:
        return 'bg-slate-100 border-slate-300';
    }
  };

  const todaySurgeries = surgeries.filter(s => {
    const today = new Date().toLocaleDateString();
    return s.scheduledDate === today;
  });

  const scheduledSurgeries = surgeries.filter(s => s.status === 'SCHEDULED');
  const inProgressSurgeries = surgeries.filter(s => s.status === 'IN_PROGRESS');
  const completedToday = surgeries.filter(s => {
    const today = new Date().toLocaleDateString();
    return s.status === 'COMPLETED' && s.scheduledDate === today;
  });

  const stats = {
    totalScheduled: scheduledSurgeries.length,
    inProgress: inProgressSurgeries.length,
    completedToday: completedToday.length,
    todayTotal: todaySurgeries.length,
    emergencies: surgeries.filter(s => s.priority === 'EMERGENCY' && s.status !== 'COMPLETED').length
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Operation Theatre</h1>
          <p className="text-slate-600">Surgery scheduling, OT management, and procedure tracking</p>
        </div>
        <Button onClick={() => setIsScheduleDialogOpen(true)} size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Schedule Surgery
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Today's Surgeries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayTotal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalScheduled}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <Activity className="w-4 h-4" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedToday}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              Emergencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.emergencies}</div>
          </CardContent>
        </Card>
      </div>

      {/* OT Rooms Status */}
      <Card>
        <CardHeader>
          <CardTitle>OT Rooms Status</CardTitle>
          <CardDescription>Real-time operation theatre availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {otRooms.map((room) => (
              <Card key={room.id} className={`border-2 ${getOTRoomStatus(room.status)}`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{room.roomNumber}</CardTitle>
                    <Badge variant={room.status === 'AVAILABLE' ? 'default' : 'secondary'}>
                      {room.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {room.status === 'OCCUPIED' && room.currentSurgery ? (
                    <div className="space-y-2">
                      <div className="font-medium text-sm">{room.currentSurgery.patientName}</div>
                      <div className="text-xs text-slate-600">{room.currentSurgery.procedureName}</div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        Started: {room.currentSurgery.startTime}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">
                      {room.status === 'AVAILABLE' ? 'Ready for use' : 'Being prepared'}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Surgery Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Surgery Schedule</CardTitle>
          <CardDescription>Manage and track all surgical procedures</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="today">
            <TabsList>
              <TabsTrigger value="today">Today ({stats.todayTotal})</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled ({stats.totalScheduled})</TabsTrigger>
              <TabsTrigger value="inprogress">In Progress ({stats.inProgress})</TabsTrigger>
              <TabsTrigger value="all">All Surgeries</TabsTrigger>
            </TabsList>

            <TabsContent value="today">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Surgeon</TableHead>
                    <TableHead>OT Room</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaySurgeries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No surgeries scheduled for today
                      </TableCell>
                    </TableRow>
                  ) : (
                    todaySurgeries.map((surgery) => (
                      <TableRow key={surgery.id}>
                        <TableCell className="font-medium">{surgery.scheduledTime}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{surgery.patientName}</div>
                            <div className="text-xs text-slate-500">{surgery.patientMRN}</div>
                          </div>
                        </TableCell>
                        <TableCell>{surgery.procedureName}</TableCell>
                        <TableCell>{surgery.surgeonName}</TableCell>
                        <TableCell>{surgery.otRoom}</TableCell>
                        <TableCell>{getPriorityBadge(surgery.priority)}</TableCell>
                        <TableCell>{getStatusBadge(surgery.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {surgery.status === 'SCHEDULED' && (
                              <Button size="sm" onClick={() => handleStartSurgeryClick(surgery)}>
                                Start
                              </Button>
                            )}
                            {surgery.status === 'IN_PROGRESS' && (
                              <Button size="sm" variant="outline" onClick={() => handleCompleteSurgeryClick(surgery)}>
                                Complete
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => openDetailsDialog(surgery)}>
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="scheduled">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Surgeon</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Pre-Op</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledSurgeries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No scheduled surgeries
                      </TableCell>
                    </TableRow>
                  ) : (
                    scheduledSurgeries.map((surgery) => (
                      <TableRow key={surgery.id}>
                        <TableCell>{surgery.scheduledDate}</TableCell>
                        <TableCell>{surgery.scheduledTime}</TableCell>
                        <TableCell>{surgery.patientName}</TableCell>
                        <TableCell>{surgery.procedureName}</TableCell>
                        <TableCell>{surgery.surgeonName}</TableCell>
                        <TableCell>{getPriorityBadge(surgery.priority)}</TableCell>
                        <TableCell>
                          {surgery.preOpChecklist ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleStartSurgeryClick(surgery)}>
                              Start
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleCancelSurgeryClick(surgery)}>
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="inprogress">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OT Room</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Surgeon</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inProgressSurgeries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No surgeries in progress
                      </TableCell>
                    </TableRow>
                  ) : (
                    inProgressSurgeries.map((surgery) => (
                      <TableRow key={surgery.id} className="bg-orange-50">
                        <TableCell className="font-medium">{surgery.otRoom}</TableCell>
                        <TableCell>
                          <div className="font-medium">{surgery.patientName}</div>
                          <div className="text-xs text-slate-500">{surgery.patientMRN}</div>
                        </TableCell>
                        <TableCell>{surgery.procedureName}</TableCell>
                        <TableCell>{surgery.surgeonName}</TableCell>
                        <TableCell>{surgery.scheduledTime}</TableCell>
                        <TableCell>{surgery.duration} min</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => handleCompleteSurgeryClick(surgery)}>
                            Complete Surgery
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="all">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Surgeon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surgeries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        No surgeries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    surgeries.slice(0, 50).map((surgery) => (
                      <TableRow key={surgery.id}>
                        <TableCell>{surgery.scheduledDate}</TableCell>
                        <TableCell>{surgery.patientName}</TableCell>
                        <TableCell>{surgery.procedureName}</TableCell>
                        <TableCell>{surgery.surgeonName}</TableCell>
                        <TableCell>{getStatusBadge(surgery.status)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => openDetailsDialog(surgery)}>
                            Details
                          </Button>
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

      {/* Schedule Surgery Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Surgery</DialogTitle>
            <DialogDescription>Book an operation theatre and schedule a surgical procedure</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient ID *</Label>
                <Input
                  placeholder="Enter patient MRN or ID"
                  value={surgeryFormData.patientId}
                  onChange={(e) => setSurgeryFormData({ ...surgeryFormData, patientId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority *</Label>
                <Select
                  value={surgeryFormData.priority}
                  onValueChange={(value) => setSurgeryFormData({ ...surgeryFormData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="ELECTIVE">Elective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Procedure Name *</Label>
              <Input
                placeholder="e.g., Appendectomy, Knee Replacement"
                value={surgeryFormData.procedureName}
                onChange={(e) => setSurgeryFormData({ ...surgeryFormData, procedureName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Surgeon *</Label>
                <Input
                  placeholder="Surgeon ID or name"
                  value={surgeryFormData.surgeonId}
                  onChange={(e) => setSurgeryFormData({ ...surgeryFormData, surgeonId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>OT Room *</Label>
                <Select
                  value={surgeryFormData.otRoomId}
                  onValueChange={(value) => setSurgeryFormData({ ...surgeryFormData, otRoomId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select OT room" />
                  </SelectTrigger>
                  <SelectContent>
                    {otRooms.filter(r => r.status === 'AVAILABLE').map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.roomNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={surgeryFormData.scheduledDate}
                  onChange={(e) => setSurgeryFormData({ ...surgeryFormData, scheduledDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={surgeryFormData.scheduledTime}
                  onChange={(e) => setSurgeryFormData({ ...surgeryFormData, scheduledTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (min) *</Label>
                <Input
                  type="number"
                  placeholder="120"
                  value={surgeryFormData.duration}
                  onChange={(e) => setSurgeryFormData({ ...surgeryFormData, duration: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Anesthesia Type *</Label>
                <Select
                  value={surgeryFormData.anesthesiaType}
                  onValueChange={(value) => setSurgeryFormData({ ...surgeryFormData, anesthesiaType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General Anesthesia</SelectItem>
                    <SelectItem value="SPINAL">Spinal Anesthesia</SelectItem>
                    <SelectItem value="EPIDURAL">Epidural</SelectItem>
                    <SelectItem value="LOCAL">Local Anesthesia</SelectItem>
                    <SelectItem value="SEDATION">Sedation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Anesthetist</Label>
                <Input
                  placeholder="Anesthetist ID"
                  value={surgeryFormData.anesthetistId}
                  onChange={(e) => setSurgeryFormData({ ...surgeryFormData, anesthetistId: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="w-full min-h-[80px] p-3 border rounded-md"
                placeholder="Pre-operative notes, special requirements..."
                value={surgeryFormData.notes}
                onChange={(e) => setSurgeryFormData({ ...surgeryFormData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleScheduleSurgery} disabled={loading}>
              {loading ? 'Scheduling...' : 'Schedule Surgery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Surgery Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Surgery Details</DialogTitle>
          </DialogHeader>
          {selectedSurgery && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-slate-500">Patient</Label>
                  <div className="font-medium">{selectedSurgery.patientName}</div>
                  <div className="text-sm text-slate-500">{selectedSurgery.patientMRN}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Age / Gender</Label>
                  <div className="font-medium">{selectedSurgery.age} / {selectedSurgery.gender}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Scheduled Date & Time</Label>
                  <div className="font-medium">{selectedSurgery.scheduledDate} at {selectedSurgery.scheduledTime}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Duration</Label>
                  <div className="font-medium">{selectedSurgery.duration} minutes</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">OT Room</Label>
                  <div className="font-medium">{selectedSurgery.otRoom}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedSurgery.status)}</div>
                </div>
              </div>

              <div>
                <Label className="text-sm text-slate-500">Procedure</Label>
                <div className="font-medium">{selectedSurgery.procedureName}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-slate-500">Surgeon</Label>
                  <div className="font-medium">{selectedSurgery.surgeonName}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Anesthesia Type</Label>
                  <div className="font-medium">{selectedSurgery.anesthesiaType || 'N/A'}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Priority</Label>
                  <div className="mt-1">{getPriorityBadge(selectedSurgery.priority)}</div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Pre-Op Checklist</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedSurgery.preOpChecklist ? (
                      <><CheckCircle className="w-5 h-5 text-green-600" /> <span>Complete</span></>
                    ) : (
                      <><AlertCircle className="w-5 h-5 text-orange-600" /> <span>Pending</span></>
                    )}
                  </div>
                </div>
              </div>

              {selectedSurgery.status === 'COMPLETED' && (
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <Label className="text-sm text-slate-500">Actual Start Time</Label>
                    <div className="font-medium">
                      {selectedSurgery.actualStartTime
                        ? new Date(selectedSurgery.actualStartTime).toLocaleString()
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">Actual End Time</Label>
                    <div className="font-medium">
                      {selectedSurgery.actualEndTime
                        ? new Date(selectedSurgery.actualEndTime).toLocaleString()
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm text-slate-500">Actual Duration</Label>
                    <div className="font-medium text-lg text-blue-600">
                      {calculateDuration(selectedSurgery.actualStartTime || null, selectedSurgery.actualEndTime || null) || 'N/A'}
                    </div>
                  </div>
                </div>
              )}

              {selectedSurgery.notes && (
                <div>
                  <Label className="text-sm text-slate-500">Notes</Label>
                  <div className="mt-1 p-3 bg-slate-50 rounded-md">{selectedSurgery.notes}</div>
                </div>
              )}

              {selectedSurgery.complications && (
                <div>
                  <Label className="text-sm text-slate-500">Complications</Label>
                  <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md text-red-900">
                    {selectedSurgery.complications}
                  </div>
                </div>
              )}

              {selectedSurgery.implants && (
                <div>
                  <Label className="text-sm text-slate-500">Implants/Prosthetics</Label>
                  <div className="mt-1 p-3 bg-slate-50 rounded-md">
                    {typeof selectedSurgery.implants === 'string'
                      ? selectedSurgery.implants
                      : JSON.stringify(selectedSurgery.implants)}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pre-Op Checklist Dialog */}
      <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pre-Operative Checklist</DialogTitle>
            <DialogDescription>
              Complete all checklist items before starting surgery
            </DialogDescription>
          </DialogHeader>
          {selectedSurgery && (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="font-medium">{selectedSurgery.patientName}</div>
                <div className="text-sm text-slate-600">{selectedSurgery.procedureName}</div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-md">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="flex-1">{item.item}</span>
                  </div>
                ))}
              </div>
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-md">
                <p className="text-sm text-orange-800">
                  By confirming, you verify that all pre-operative requirements have been met and the patient is ready for surgery.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChecklistDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleChecklistComplete} disabled={loading}>
              {loading ? 'Processing...' : 'Confirm & Start Surgery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-Op Notes Dialog */}
      <Dialog open={isPostOpDialogOpen} onOpenChange={setIsPostOpDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Surgery - Post-Operative Notes</DialogTitle>
            <DialogDescription>
              Document post-operative details and complete the surgery
            </DialogDescription>
          </DialogHeader>
          {selectedSurgery && (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="font-medium">{selectedSurgery.patientName}</div>
                <div className="text-sm text-slate-600">{selectedSurgery.procedureName}</div>
              </div>
              <div className="space-y-2">
                <Label>Post-Operative Notes *</Label>
                <textarea
                  className="w-full min-h-[100px] p-3 border rounded-md"
                  placeholder="Procedure details, findings, techniques used..."
                  value={postOpData.postOpNotes}
                  onChange={(e) => setPostOpData({ ...postOpData, postOpNotes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Complications (if any)</Label>
                <textarea
                  className="w-full min-h-[80px] p-3 border rounded-md"
                  placeholder="Any complications encountered during surgery..."
                  value={postOpData.complications}
                  onChange={(e) => setPostOpData({ ...postOpData, complications: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Implants/Prosthetics Used</Label>
                <Input
                  placeholder="e.g., Hip implant, Surgical mesh, etc."
                  value={postOpData.implants}
                  onChange={(e) => setPostOpData({ ...postOpData, implants: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPostOpDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handlePostOpSubmit} disabled={loading || !postOpData.postOpNotes.trim()}>
              {loading ? 'Completing...' : 'Complete Surgery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Surgery Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Surgery</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this surgery
            </DialogDescription>
          </DialogHeader>
          {selectedSurgery && (
            <div className="space-y-4 py-4">
              <div className="bg-red-50 p-3 rounded-md">
                <div className="font-medium">{selectedSurgery.patientName}</div>
                <div className="text-sm text-slate-600">{selectedSurgery.procedureName}</div>
                <div className="text-sm text-slate-500">Scheduled: {selectedSurgery.scheduledDate} at {selectedSurgery.scheduledTime}</div>
              </div>
              <div className="space-y-2">
                <Label>Cancellation Reason *</Label>
                <textarea
                  className="w-full min-h-[100px] p-3 border rounded-md"
                  placeholder="Reason for cancellation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)} disabled={loading}>
              Close
            </Button>
            <Button variant="destructive" onClick={handleCancelSurgerySubmit} disabled={loading || !cancelReason.trim()}>
              {loading ? 'Cancelling...' : 'Cancel Surgery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
