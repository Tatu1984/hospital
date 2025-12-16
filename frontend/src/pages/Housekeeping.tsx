import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Clock, CheckCircle, Plus, Search, AlertTriangle, Trash2, Eye, Edit, RefreshCw } from 'lucide-react';
import { useToast } from '../components/Toast';
import { PermissionGate } from '../components/PermissionGate';
import api from '../services/api';

interface CleaningTask {
  id: string;
  location: string;
  area: string;
  taskType: string;
  assignedTo: string;
  assignedToName?: string;
  scheduledTime: string;
  status: string;
  priority: string;
  notes?: string;
  completedAt?: string;
  createdAt: string;
}

interface LaundryRequest {
  id: string;
  department: string;
  itemType: string;
  quantity: number;
  requestDate: string;
  status: string;
  requestedBy?: string;
  notes?: string;
  processedAt?: string;
}

interface Staff {
  id: string;
  name: string;
  department: string;
}

const TASK_TYPES = [
  'BED_CLEANING',
  'ROOM_CLEANING',
  'LINEN_CHANGE',
  'WASTE_DISPOSAL',
  'SANITIZATION',
  'GENERAL_CLEANING',
  'FLOOR_MOPPING',
  'BATHROOM_CLEANING',
  'DEEP_CLEANING'
];

const ITEM_TYPES = [
  'BED_SHEETS',
  'PILLOW_COVERS',
  'BLANKETS',
  'TOWELS',
  'PATIENT_GOWNS',
  'SURGICAL_DRAPES',
  'CURTAINS',
  'SCRUBS'
];

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const LAUNDRY_STATUSES = ['PENDING', 'COLLECTED', 'PROCESSING', 'READY', 'DELIVERED'];

export default function Housekeeping() {
  const { success, error } = useToast();
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [laundry, setLaundry] = useState<LaundryRequest[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddLaundry, setShowAddLaundry] = useState(false);
  const [showViewTask, setShowViewTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const [selectedLaundry, setSelectedLaundry] = useState<LaundryRequest | null>(null);
  const [showViewLaundry, setShowViewLaundry] = useState(false);

  // Filter states
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [laundryStatusFilter, setLaundryStatusFilter] = useState<string>('all');

  // Form states
  const [taskForm, setTaskForm] = useState({
    location: '',
    area: '',
    taskType: 'ROOM_CLEANING',
    assignedTo: '',
    scheduledTime: '',
    priority: 'NORMAL',
    notes: ''
  });

  const [laundryForm, setLaundryForm] = useState({
    department: '',
    itemType: 'BED_SHEETS',
    quantity: 1,
    notes: ''
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchTasks(), fetchLaundry(), fetchStaff()]);
    setLoading(false);
  };

  const fetchTasks = async () => {
    try {
      const response = await api.get('/api/housekeeping/tasks');
      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setTasks([]);
    }
  };

  const fetchLaundry = async () => {
    try {
      const response = await api.get('/api/housekeeping/laundry');
      setLaundry(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching laundry:', err);
      setLaundry([]);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await api.get('/api/employees?department=HOUSEKEEPING');
      setStaff(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setStaff([]);
    }
  };

  const handleAddTask = async () => {
    if (!taskForm.location || !taskForm.taskType) {
      error('Validation Error', 'Location and task type are required');
      return;
    }

    try {
      await api.post('/api/housekeeping/tasks', taskForm);
      success('Task Created', 'Cleaning task has been created successfully');
      setShowAddTask(false);
      setTaskForm({
        location: '',
        area: '',
        taskType: 'ROOM_CLEANING',
        assignedTo: '',
        scheduledTime: '',
        priority: 'NORMAL',
        notes: ''
      });
      fetchTasks();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    try {
      await api.put(`/api/housekeeping/tasks/${selectedTask.id}`, taskForm);
      success('Task Updated', 'Cleaning task has been updated successfully');
      setShowEditTask(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to update task');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await api.post(`/api/housekeeping/tasks/${taskId}/complete`);
      success('Task Completed', 'Task has been marked as completed');
      fetchTasks();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to complete task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await api.delete(`/api/housekeeping/tasks/${taskId}`);
      success('Task Deleted', 'Task has been deleted successfully');
      fetchTasks();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleAddLaundry = async () => {
    if (!laundryForm.department || laundryForm.quantity < 1) {
      error('Validation Error', 'Department and valid quantity are required');
      return;
    }

    try {
      await api.post('/api/housekeeping/laundry', laundryForm);
      success('Request Created', 'Laundry request has been created successfully');
      setShowAddLaundry(false);
      setLaundryForm({
        department: '',
        itemType: 'BED_SHEETS',
        quantity: 1,
        notes: ''
      });
      fetchLaundry();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to create laundry request');
    }
  };

  const handleUpdateLaundryStatus = async (laundryId: string, newStatus: string) => {
    try {
      await api.put(`/api/housekeeping/laundry/${laundryId}`, { status: newStatus });
      success('Status Updated', `Laundry request status updated to ${newStatus}`);
      fetchLaundry();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to update status');
    }
  };

  const openEditTask = (task: CleaningTask) => {
    setSelectedTask(task);
    setTaskForm({
      location: task.location,
      area: task.area || '',
      taskType: task.taskType,
      assignedTo: task.assignedTo || '',
      scheduledTime: task.scheduledTime || '',
      priority: task.priority,
      notes: task.notes || ''
    });
    setShowEditTask(true);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.location.toLowerCase().includes(taskSearch.toLowerCase()) ||
      task.taskType.toLowerCase().includes(taskSearch.toLowerCase()) ||
      (task.assignedToName || '').toLowerCase().includes(taskSearch.toLowerCase());
    const matchesPriority = taskPriorityFilter === 'all' || task.priority === taskPriorityFilter;
    const matchesStatus = taskStatusFilter === 'all' || task.status === taskStatusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Filter laundry
  const filteredLaundry = laundry.filter(req => {
    return laundryStatusFilter === 'all' || req.status === laundryStatusFilter;
  });

  const pendingTasks = tasks.filter(t => t.status === 'PENDING');
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
  const completedToday = tasks.filter(t => {
    if (t.status !== 'COMPLETED' || !t.completedAt) return false;
    const today = new Date().toDateString();
    return new Date(t.completedAt).toDateString() === today;
  }).length;
  const urgentTasks = tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED').length;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
        return 'default';
      case 'IN_PROGRESS':
      case 'PROCESSING':
        return 'secondary';
      case 'URGENT':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getNextLaundryStatus = (currentStatus: string): string | null => {
    const flow = ['PENDING', 'COLLECTED', 'PROCESSING', 'READY', 'DELIVERED'];
    const currentIndex = flow.indexOf(currentStatus);
    if (currentIndex < flow.length - 1) {
      return flow[currentIndex + 1];
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Housekeeping & Linen</h1>
          <p className="text-slate-600">Cleaning schedules, laundry management, and facility maintenance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <PermissionGate permission="housekeeping:create">
            <Button onClick={() => setShowAddTask(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingTasks.length}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
              <RefreshCw className="w-4 h-4" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressTasks.length}</div>
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
            <div className="text-2xl font-bold text-green-600">{completedToday}</div>
          </CardContent>
        </Card>
        <Card className={urgentTasks > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-sm font-medium flex items-center gap-2 ${urgentTasks > 0 ? 'text-red-700' : ''}`}>
              <AlertTriangle className="w-4 h-4" />
              Urgent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${urgentTasks > 0 ? 'text-red-600' : ''}`}>{urgentTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks & Laundry Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tasks">
            <TabsList>
              <TabsTrigger value="tasks">Cleaning Tasks ({filteredTasks.length})</TabsTrigger>
              <TabsTrigger value="laundry">Laundry Requests ({filteredLaundry.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-4">
              {/* Task Filters */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search tasks..."
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={taskPriorityFilter} onValueChange={setTaskPriorityFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Task Type</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No tasks found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          {task.location}
                          {task.area && <span className="text-gray-500 text-sm ml-1">({task.area})</span>}
                        </TableCell>
                        <TableCell>{task.taskType.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{task.assignedToName || task.assignedTo || 'Unassigned'}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityBadgeVariant(task.priority)}>{task.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {task.scheduledTime ? new Date(task.scheduledTime).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setSelectedTask(task); setShowViewTask(true); }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <PermissionGate permission="housekeeping:edit">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditTask(task)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </PermissionGate>
                            {task.status === 'PENDING' || task.status === 'IN_PROGRESS' ? (
                              <PermissionGate permission="housekeeping:edit">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCompleteTask(task.id)}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              </PermissionGate>
                            ) : null}
                            <PermissionGate permission="housekeeping:delete">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="laundry" className="space-y-4">
              {/* Laundry Filters */}
              <div className="flex justify-between items-center">
                <Select value={laundryStatusFilter} onValueChange={setLaundryStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {LAUNDRY_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <PermissionGate permission="housekeeping:create">
                  <Button onClick={() => setShowAddLaundry(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Laundry Request
                  </Button>
                </PermissionGate>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Item Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLaundry.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No laundry requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLaundry.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.department}</TableCell>
                        <TableCell>{req.itemType.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{req.quantity}</TableCell>
                        <TableCell>{new Date(req.requestDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(req.status)}>{req.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setSelectedLaundry(req); setShowViewLaundry(true); }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <PermissionGate permission="housekeeping:edit">
                              {getNextLaundryStatus(req.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateLaundryStatus(req.id, getNextLaundryStatus(req.status)!)}
                                >
                                  → {getNextLaundryStatus(req.status)}
                                </Button>
                              )}
                            </PermissionGate>
                          </div>
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

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Cleaning Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Location *</Label>
              <Input
                value={taskForm.location}
                onChange={(e) => setTaskForm({ ...taskForm, location: e.target.value })}
                placeholder="e.g., Ward A Room 101"
              />
            </div>
            <div>
              <Label>Area</Label>
              <Input
                value={taskForm.area}
                onChange={(e) => setTaskForm({ ...taskForm, area: e.target.value })}
                placeholder="e.g., Bathroom, Patient Area"
              />
            </div>
            <div>
              <Label>Task Type *</Label>
              <Select value={taskForm.taskType} onValueChange={(v) => setTaskForm({ ...taskForm, taskType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign To</Label>
              <Select value={taskForm.assignedTo} onValueChange={(v) => setTaskForm({ ...taskForm, assignedTo: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled Time</Label>
              <Input
                type="datetime-local"
                value={taskForm.scheduledTime}
                onChange={(e) => setTaskForm({ ...taskForm, scheduledTime: e.target.value })}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={taskForm.notes}
                onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                placeholder="Additional instructions..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
            <Button onClick={handleAddTask}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditTask} onOpenChange={setShowEditTask}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Cleaning Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Location *</Label>
              <Input
                value={taskForm.location}
                onChange={(e) => setTaskForm({ ...taskForm, location: e.target.value })}
              />
            </div>
            <div>
              <Label>Area</Label>
              <Input
                value={taskForm.area}
                onChange={(e) => setTaskForm({ ...taskForm, area: e.target.value })}
              />
            </div>
            <div>
              <Label>Task Type *</Label>
              <Select value={taskForm.taskType} onValueChange={(v) => setTaskForm({ ...taskForm, taskType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign To</Label>
              <Select value={taskForm.assignedTo} onValueChange={(v) => setTaskForm({ ...taskForm, assignedTo: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={taskForm.notes}
                onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTask(false)}>Cancel</Button>
            <Button onClick={handleUpdateTask}>Update Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Task Dialog */}
      <Dialog open={showViewTask} onOpenChange={setShowViewTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Location</Label>
                  <p className="font-medium">{selectedTask.location}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Area</Label>
                  <p className="font-medium">{selectedTask.area || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Task Type</Label>
                  <p className="font-medium">{selectedTask.taskType.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Assigned To</Label>
                  <p className="font-medium">{selectedTask.assignedToName || selectedTask.assignedTo || 'Unassigned'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Priority</Label>
                  <Badge variant={getPriorityBadgeVariant(selectedTask.priority)}>{selectedTask.priority}</Badge>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <Badge variant={getStatusBadgeVariant(selectedTask.status)}>{selectedTask.status}</Badge>
                </div>
                <div>
                  <Label className="text-gray-500">Scheduled Time</Label>
                  <p className="font-medium">
                    {selectedTask.scheduledTime ? new Date(selectedTask.scheduledTime).toLocaleString() : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Created At</Label>
                  <p className="font-medium">{new Date(selectedTask.createdAt).toLocaleString()}</p>
                </div>
                {selectedTask.completedAt && (
                  <div>
                    <Label className="text-gray-500">Completed At</Label>
                    <p className="font-medium">{new Date(selectedTask.completedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {selectedTask.notes && (
                <div>
                  <Label className="text-gray-500">Notes</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded">{selectedTask.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewTask(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Laundry Dialog */}
      <Dialog open={showAddLaundry} onOpenChange={setShowAddLaundry}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Laundry Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Department *</Label>
              <Input
                value={laundryForm.department}
                onChange={(e) => setLaundryForm({ ...laundryForm, department: e.target.value })}
                placeholder="e.g., Ward A, ICU, OT"
              />
            </div>
            <div>
              <Label>Item Type *</Label>
              <Select value={laundryForm.itemType} onValueChange={(v) => setLaundryForm({ ...laundryForm, itemType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                min={1}
                value={laundryForm.quantity}
                onChange={(e) => setLaundryForm({ ...laundryForm, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={laundryForm.notes}
                onChange={(e) => setLaundryForm({ ...laundryForm, notes: e.target.value })}
                placeholder="Special instructions..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLaundry(false)}>Cancel</Button>
            <Button onClick={handleAddLaundry}>Create Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Laundry Dialog */}
      <Dialog open={showViewLaundry} onOpenChange={setShowViewLaundry}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laundry Request Details</DialogTitle>
          </DialogHeader>
          {selectedLaundry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Department</Label>
                  <p className="font-medium">{selectedLaundry.department}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Item Type</Label>
                  <p className="font-medium">{selectedLaundry.itemType.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Quantity</Label>
                  <p className="font-medium">{selectedLaundry.quantity}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <Badge variant={getStatusBadgeVariant(selectedLaundry.status)}>{selectedLaundry.status}</Badge>
                </div>
                <div>
                  <Label className="text-gray-500">Request Date</Label>
                  <p className="font-medium">{new Date(selectedLaundry.requestDate).toLocaleString()}</p>
                </div>
                {selectedLaundry.processedAt && (
                  <div>
                    <Label className="text-gray-500">Processed At</Label>
                    <p className="font-medium">{new Date(selectedLaundry.processedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {selectedLaundry.notes && (
                <div>
                  <Label className="text-gray-500">Notes</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded">{selectedLaundry.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewLaundry(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
