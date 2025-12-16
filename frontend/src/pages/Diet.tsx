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
import { Utensils, Calendar, Plus, Search, Clock, CheckCircle, Eye, Edit, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '../components/Toast';
import { PermissionGate } from '../components/PermissionGate';
import api from '../services/api';

interface DietOrder {
  id: string;
  patientId: string;
  patientName: string;
  ward: string;
  bedNumber: string;
  dietType: string;
  mealType: string;
  status: string;
  scheduledTime: string;
  specialInstructions?: string;
  allergies?: string;
  createdAt: string;
  deliveredAt?: string;
  preparedBy?: string;
  deliveredBy?: string;
}

interface MealPlan {
  id: string;
  name: string;
  dietType: string;
  calories: number;
  description: string;
  items: string[];
  isActive: boolean;
}

interface Patient {
  id: string;
  name: string;
  ward?: string;
  bedNumber?: string;
}

const DIET_TYPES = [
  'REGULAR',
  'SOFT',
  'LIQUID',
  'DIABETIC',
  'LOW_SODIUM',
  'RENAL',
  'CARDIAC',
  'NPO',
  'CLEAR_LIQUID',
  'FULL_LIQUID',
  'HIGH_PROTEIN',
  'LOW_FAT',
  'GLUTEN_FREE',
  'VEGETARIAN',
  'CUSTOM'
];

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const ORDER_STATUSES = ['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];

export default function Diet() {
  const { success, error } = useToast();
  const [orders, setOrders] = useState<DietOrder[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showAddMealPlan, setShowAddMealPlan] = useState(false);
  const [showViewOrder, setShowViewOrder] = useState(false);
  const [showEditOrder, setShowEditOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DietOrder | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [mealFilter, setMealFilter] = useState<string>('all');
  const [dietTypeFilter, setDietTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form states
  const [orderForm, setOrderForm] = useState({
    patientId: '',
    dietType: 'REGULAR',
    mealType: 'BREAKFAST',
    scheduledTime: '',
    specialInstructions: '',
    allergies: ''
  });

  const [mealPlanForm, setMealPlanForm] = useState({
    name: '',
    dietType: 'REGULAR',
    calories: 2000,
    description: '',
    items: ''
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchOrders(), fetchMealPlans(), fetchPatients()]);
    setLoading(false);
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/diet/orders');
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching diet orders:', err);
      setOrders([]);
    }
  };

  const fetchMealPlans = async () => {
    try {
      const response = await api.get('/api/diet/meal-plans');
      setMealPlans(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching meal plans:', err);
      setMealPlans([]);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/api/patients?status=ADMITTED');
      setPatients(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setPatients([]);
    }
  };

  const handleAddOrder = async () => {
    if (!orderForm.patientId || !orderForm.dietType || !orderForm.mealType) {
      error('Validation Error', 'Patient, diet type, and meal type are required');
      return;
    }

    try {
      await api.post('/api/diet/orders', orderForm);
      success('Order Created', 'Diet order has been created successfully');
      setShowAddOrder(false);
      setOrderForm({
        patientId: '',
        dietType: 'REGULAR',
        mealType: 'BREAKFAST',
        scheduledTime: '',
        specialInstructions: '',
        allergies: ''
      });
      fetchOrders();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to create diet order');
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    try {
      await api.put(`/api/diet/orders/${selectedOrder.id}`, orderForm);
      success('Order Updated', 'Diet order has been updated successfully');
      setShowEditOrder(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to update diet order');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.put(`/api/diet/orders/${orderId}/status`, { status: newStatus });
      success('Status Updated', `Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
      await api.delete(`/api/diet/orders/${orderId}`);
      success('Order Deleted', 'Diet order has been deleted successfully');
      fetchOrders();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to delete diet order');
    }
  };

  const handleAddMealPlan = async () => {
    if (!mealPlanForm.name || !mealPlanForm.dietType) {
      error('Validation Error', 'Name and diet type are required');
      return;
    }

    try {
      const items = mealPlanForm.items.split('\n').filter(i => i.trim());
      await api.post('/api/diet/meal-plans', {
        ...mealPlanForm,
        items
      });
      success('Meal Plan Created', 'Meal plan has been created successfully');
      setShowAddMealPlan(false);
      setMealPlanForm({
        name: '',
        dietType: 'REGULAR',
        calories: 2000,
        description: '',
        items: ''
      });
      fetchMealPlans();
    } catch (err: any) {
      error('Error', err.response?.data?.message || 'Failed to create meal plan');
    }
  };

  const openEditOrder = (order: DietOrder) => {
    setSelectedOrder(order);
    setOrderForm({
      patientId: order.patientId,
      dietType: order.dietType,
      mealType: order.mealType,
      scheduledTime: order.scheduledTime || '',
      specialInstructions: order.specialInstructions || '',
      allergies: order.allergies || ''
    });
    setShowEditOrder(true);
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.ward.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMeal = mealFilter === 'all' || order.mealType === mealFilter;
    const matchesDietType = dietTypeFilter === 'all' || order.dietType === dietTypeFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesMeal && matchesDietType && matchesStatus;
  });

  // Stats
  const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
  const preparingOrders = orders.filter(o => o.status === 'PREPARING').length;
  const readyOrders = orders.filter(o => o.status === 'READY').length;
  const deliveredToday = orders.filter(o => {
    if (o.status !== 'DELIVERED' || !o.deliveredAt) return false;
    const today = new Date().toDateString();
    return new Date(o.deliveredAt).toDateString() === today;
  }).length;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'default';
      case 'READY':
        return 'secondary';
      case 'PREPARING':
        return 'outline';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const flow = ['PENDING', 'PREPARING', 'READY', 'DELIVERED'];
    const currentIndex = flow.indexOf(currentStatus);
    if (currentIndex < flow.length - 1) {
      return flow[currentIndex + 1];
    }
    return null;
  };

  const getMealIcon = (meal: string) => {
    switch (meal) {
      case 'BREAKFAST':
        return '☀️';
      case 'LUNCH':
        return '🌤️';
      case 'DINNER':
        return '🌙';
      case 'SNACK':
        return '🍎';
      default:
        return '🍽️';
    }
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
          <h1 className="text-3xl font-bold text-slate-900">Diet & Kitchen Management</h1>
          <p className="text-slate-600">Meal planning, diet orders, and kitchen operations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <PermissionGate permission="diet:create">
            <Button onClick={() => setShowAddOrder(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Today's Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <Clock className="w-4 h-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingOrders}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
              <Utensils className="w-4 h-4" />
              Preparing / Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{preparingOrders + readyOrders}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              Delivered Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{deliveredToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Diet Orders & Meal Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">Diet Orders ({filteredOrders.length})</TabsTrigger>
              <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
              <TabsTrigger value="lunch">Lunch</TabsTrigger>
              <TabsTrigger value="dinner">Dinner</TabsTrigger>
              <TabsTrigger value="meal-plans">Meal Plans</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by patient or ward..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={mealFilter} onValueChange={setMealFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Meal Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Meals</SelectItem>
                    {MEAL_TYPES.map(m => (
                      <SelectItem key={m} value={m}>{getMealIcon(m)} {m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dietTypeFilter} onValueChange={setDietTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Diet Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Diets</SelectItem>
                    {DIET_TYPES.map(d => (
                      <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ORDER_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Ward/Bed</TableHead>
                    <TableHead>Diet Type</TableHead>
                    <TableHead>Meal</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No diet orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.patientName}
                          {order.allergies && (
                            <span className="ml-2 text-red-500" title={`Allergies: ${order.allergies}`}>
                              <AlertCircle className="w-4 h-4 inline" />
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{order.ward} - {order.bedNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.dietType.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="mr-1">{getMealIcon(order.mealType)}</span>
                          {order.mealType}
                        </TableCell>
                        <TableCell>
                          {order.scheduledTime ? new Date(order.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setSelectedOrder(order); setShowViewOrder(true); }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <PermissionGate permission="diet:edit">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditOrder(order)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate permission="diet:edit">
                              {getNextStatus(order.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateOrderStatus(order.id, getNextStatus(order.status)!)}
                                >
                                  → {getNextStatus(order.status)}
                                </Button>
                              )}
                            </PermissionGate>
                            <PermissionGate permission="diet:delete">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteOrder(order.id)}
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

            {/* Meal-specific tabs */}
            {['breakfast', 'lunch', 'dinner'].map(meal => (
              <TabsContent key={meal} value={meal}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Ward/Bed</TableHead>
                      <TableHead>Diet Type</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Special Instructions</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.filter(o => o.mealType.toLowerCase() === meal).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No {meal} orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.filter(o => o.mealType.toLowerCase() === meal).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.patientName}
                            {order.allergies && (
                              <span className="ml-2 text-red-500" title={`Allergies: ${order.allergies}`}>
                                <AlertCircle className="w-4 h-4 inline" />
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{order.ward} - {order.bedNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.dietType.replace(/_/g, ' ')}</Badge>
                          </TableCell>
                          <TableCell>
                            {order.scheduledTime ? new Date(order.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {order.specialInstructions || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <PermissionGate permission="diet:edit">
                                {getNextStatus(order.status) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateOrderStatus(order.id, getNextStatus(order.status)!)}
                                  >
                                    → {getNextStatus(order.status)}
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
            ))}

            <TabsContent value="meal-plans" className="space-y-4">
              <div className="flex justify-end">
                <PermissionGate permission="diet:create">
                  <Button onClick={() => setShowAddMealPlan(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Meal Plan
                  </Button>
                </PermissionGate>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mealPlans.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No meal plans found
                  </div>
                ) : (
                  mealPlans.map((plan) => (
                    <Card key={plan.id} className={!plan.isActive ? 'opacity-60' : ''}>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-start">
                          <span>{plan.name}</span>
                          <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Diet Type:</span>
                            <Badge variant="outline">{plan.dietType.replace(/_/g, ' ')}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Calories:</span>
                            <span className="font-medium">{plan.calories} kcal</span>
                          </div>
                          {plan.description && (
                            <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
                          )}
                          {plan.items && plan.items.length > 0 && (
                            <div className="mt-2">
                              <span className="text-gray-500 text-sm">Items:</span>
                              <ul className="list-disc list-inside text-sm mt-1">
                                {plan.items.slice(0, 3).map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                                {plan.items.length > 3 && (
                                  <li className="text-gray-400">+{plan.items.length - 3} more</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Order Dialog */}
      <Dialog open={showAddOrder} onOpenChange={setShowAddOrder}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Diet Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Patient *</Label>
              <Select value={orderForm.patientId} onValueChange={(v) => setOrderForm({ ...orderForm, patientId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.ward && `(${p.ward} - ${p.bedNumber})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Diet Type *</Label>
              <Select value={orderForm.dietType} onValueChange={(v) => setOrderForm({ ...orderForm, dietType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIET_TYPES.map(d => (
                    <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meal Type *</Label>
              <Select value={orderForm.mealType} onValueChange={(v) => setOrderForm({ ...orderForm, mealType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map(m => (
                    <SelectItem key={m} value={m}>{getMealIcon(m)} {m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled Time</Label>
              <Input
                type="datetime-local"
                value={orderForm.scheduledTime}
                onChange={(e) => setOrderForm({ ...orderForm, scheduledTime: e.target.value })}
              />
            </div>
            <div>
              <Label>Allergies</Label>
              <Input
                value={orderForm.allergies}
                onChange={(e) => setOrderForm({ ...orderForm, allergies: e.target.value })}
                placeholder="e.g., Nuts, Shellfish, Dairy"
              />
            </div>
            <div>
              <Label>Special Instructions</Label>
              <Textarea
                value={orderForm.specialInstructions}
                onChange={(e) => setOrderForm({ ...orderForm, specialInstructions: e.target.value })}
                placeholder="Any special dietary requirements..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOrder(false)}>Cancel</Button>
            <Button onClick={handleAddOrder}>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={showEditOrder} onOpenChange={setShowEditOrder}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Diet Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Diet Type *</Label>
              <Select value={orderForm.dietType} onValueChange={(v) => setOrderForm({ ...orderForm, dietType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIET_TYPES.map(d => (
                    <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meal Type *</Label>
              <Select value={orderForm.mealType} onValueChange={(v) => setOrderForm({ ...orderForm, mealType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map(m => (
                    <SelectItem key={m} value={m}>{getMealIcon(m)} {m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Allergies</Label>
              <Input
                value={orderForm.allergies}
                onChange={(e) => setOrderForm({ ...orderForm, allergies: e.target.value })}
              />
            </div>
            <div>
              <Label>Special Instructions</Label>
              <Textarea
                value={orderForm.specialInstructions}
                onChange={(e) => setOrderForm({ ...orderForm, specialInstructions: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditOrder(false)}>Cancel</Button>
            <Button onClick={handleUpdateOrder}>Update Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={showViewOrder} onOpenChange={setShowViewOrder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Diet Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Patient</Label>
                  <p className="font-medium">{selectedOrder.patientName}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Ward / Bed</Label>
                  <p className="font-medium">{selectedOrder.ward} - {selectedOrder.bedNumber}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Diet Type</Label>
                  <Badge variant="outline">{selectedOrder.dietType.replace(/_/g, ' ')}</Badge>
                </div>
                <div>
                  <Label className="text-gray-500">Meal Type</Label>
                  <p className="font-medium">{getMealIcon(selectedOrder.mealType)} {selectedOrder.mealType}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <Badge variant={getStatusBadgeVariant(selectedOrder.status)}>{selectedOrder.status}</Badge>
                </div>
                <div>
                  <Label className="text-gray-500">Scheduled Time</Label>
                  <p className="font-medium">
                    {selectedOrder.scheduledTime ? new Date(selectedOrder.scheduledTime).toLocaleString() : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Created At</Label>
                  <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                </div>
                {selectedOrder.deliveredAt && (
                  <div>
                    <Label className="text-gray-500">Delivered At</Label>
                    <p className="font-medium">{new Date(selectedOrder.deliveredAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {selectedOrder.allergies && (
                <div>
                  <Label className="text-gray-500">Allergies</Label>
                  <p className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    {selectedOrder.allergies}
                  </p>
                </div>
              )}
              {selectedOrder.specialInstructions && (
                <div>
                  <Label className="text-gray-500">Special Instructions</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded">{selectedOrder.specialInstructions}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewOrder(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Meal Plan Dialog */}
      <Dialog open={showAddMealPlan} onOpenChange={setShowAddMealPlan}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Meal Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={mealPlanForm.name}
                onChange={(e) => setMealPlanForm({ ...mealPlanForm, name: e.target.value })}
                placeholder="e.g., Diabetic Breakfast Plan"
              />
            </div>
            <div>
              <Label>Diet Type *</Label>
              <Select value={mealPlanForm.dietType} onValueChange={(v) => setMealPlanForm({ ...mealPlanForm, dietType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIET_TYPES.map(d => (
                    <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Calories (kcal)</Label>
              <Input
                type="number"
                min={500}
                max={5000}
                value={mealPlanForm.calories}
                onChange={(e) => setMealPlanForm({ ...mealPlanForm, calories: parseInt(e.target.value) || 2000 })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={mealPlanForm.description}
                onChange={(e) => setMealPlanForm({ ...mealPlanForm, description: e.target.value })}
                placeholder="Brief description of the meal plan"
                rows={2}
              />
            </div>
            <div>
              <Label>Menu Items (one per line)</Label>
              <Textarea
                value={mealPlanForm.items}
                onChange={(e) => setMealPlanForm({ ...mealPlanForm, items: e.target.value })}
                placeholder="Oatmeal with berries&#10;Whole wheat toast&#10;Fresh orange juice"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMealPlan(false)}>Cancel</Button>
            <Button onClick={handleAddMealPlan}>Create Meal Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
