import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Utensils, Calendar } from 'lucide-react';
import api from '../services/api';

interface DietOrder {
  id: string;
  patientName: string;
  ward: string;
  bedNumber: string;
  dietType: string;
  mealType: string;
  status: string;
  scheduledTime: string;
}

export default function Diet() {
  const [orders, setOrders] = useState<DietOrder[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/diet/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching diet orders:', error);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'PENDING');

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Diet & Kitchen Management</h1>
          <p className="text-slate-600">Meal planning, diet orders, and kitchen operations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Utensils className="w-4 h-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Diet Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="breakfast">
            <TabsList>
              <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
              <TabsTrigger value="lunch">Lunch</TabsTrigger>
              <TabsTrigger value="dinner">Dinner</TabsTrigger>
            </TabsList>

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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.filter(o => o.mealType.toLowerCase() === meal).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.patientName}</TableCell>
                        <TableCell>{order.ward} - {order.bedNumber}</TableCell>
                        <TableCell><Badge variant="outline">{order.dietType}</Badge></TableCell>
                        <TableCell>{order.scheduledTime}</TableCell>
                        <TableCell><Badge variant={order.status === 'DELIVERED' ? 'default' : 'secondary'}>{order.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
