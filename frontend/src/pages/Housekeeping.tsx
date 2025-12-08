import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Plus, Clock, CheckCircle } from 'lucide-react';
import api from '../services/api';

interface CleaningTask {
  id: string;
  location: string;
  area: string;
  taskType: string;
  assignedTo: string;
  scheduledTime: string;
  status: string;
  priority: string;
}

interface LaundryRequest {
  id: string;
  department: string;
  itemType: string;
  quantity: number;
  requestDate: string;
  status: string;
}

export default function Housekeeping() {
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [laundry, setLaundry] = useState<LaundryRequest[]>([]);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchLaundry();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/api/housekeeping/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchLaundry = async () => {
    try {
      const response = await api.get('/api/housekeeping/laundry');
      setLaundry(response.data);
    } catch (error) {
      console.error('Error fetching laundry:', error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await api.post(`/api/housekeeping/tasks/${taskId}/complete`);
      await fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'PENDING');
  const completedToday = tasks.filter(t => t.status === 'COMPLETED').length;

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Housekeeping & Linen</h1>
          <p className="text-slate-600">Cleaning schedules, laundry management, and facility maintenance</p>
        </div>
        <Button onClick={() => setIsTaskDialogOpen(true)} size="lg">
          <Plus className="w-5 h-5 mr-2" />
          New Task
        </Button>
      </div>

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks & Laundry</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tasks">
            <TabsList>
              <TabsTrigger value="tasks">Cleaning Tasks ({pendingTasks.length})</TabsTrigger>
              <TabsTrigger value="laundry">Laundry Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Task Type</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>{task.location}</TableCell>
                      <TableCell>{task.taskType}</TableCell>
                      <TableCell>{task.assignedTo}</TableCell>
                      <TableCell><Badge variant={task.priority === 'HIGH' ? 'destructive' : 'outline'}>{task.priority}</Badge></TableCell>
                      <TableCell><Badge variant={task.status === 'COMPLETED' ? 'default' : 'secondary'}>{task.status}</Badge></TableCell>
                      <TableCell>
                        {task.status === 'PENDING' && (
                          <Button size="sm" onClick={() => handleCompleteTask(task.id)}>Complete</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="laundry">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Item Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laundry.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.department}</TableCell>
                      <TableCell>{req.itemType}</TableCell>
                      <TableCell>{req.quantity}</TableCell>
                      <TableCell>{new Date(req.requestDate).toLocaleDateString()}</TableCell>
                      <TableCell><Badge>{req.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
