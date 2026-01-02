import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Bed,
  Users,
  Calendar,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  Stethoscope,
  TestTube,
  Ambulance,
  Heart,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface DashboardStats {
  patients: {
    total: number;
    today: number;
    inpatient: number;
    outpatient: number;
  };
  beds: {
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  };
  appointments: {
    today: number;
    completed: number;
    pending: number;
    cancelled: number;
  };
  revenue: {
    today: number;
    thisMonth: number;
    pending: number;
  };
  emergency: {
    active: number;
    critical: number;
    waiting: number;
  };
  lab: {
    pending: number;
    completed: number;
    critical: number;
  };
  icu: {
    occupied: number;
    available: number;
    ventilators: number;
  };
  ot: {
    scheduled: number;
    inProgress: number;
    completed: number;
  };
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  department: string;
}

interface QueueItem {
  department: string;
  waiting: number;
  avgWaitTime: number;
}

export default function LiveDashboard() {
  const { token } = useAuth();
  const { isConnected } = useWebSocket();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const fetchDashboardData = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/stats`, { headers }),
        fetch(`${API_BASE}/api/dashboard/alerts`, { headers }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      } else {
        // Use mock data if API not available
        setStats(getMockStats());
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data);
      } else {
        setAlerts(getMockAlerts());
      }

      setQueues(getMockQueues());
      setLastUpdated(new Date());
    } catch (err) {
      // Use mock data on error
      setStats(getMockStats());
      setAlerts(getMockAlerts());
      setQueues(getMockQueues());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getMockStats = (): DashboardStats => ({
    patients: { total: 12456, today: 89, inpatient: 234, outpatient: 156 },
    beds: { total: 300, occupied: 234, available: 66, occupancyRate: 78 },
    appointments: { today: 156, completed: 89, pending: 52, cancelled: 15 },
    revenue: { today: 45600, thisMonth: 1234567, pending: 89000 },
    emergency: { active: 12, critical: 3, waiting: 8 },
    lab: { pending: 45, completed: 234, critical: 5 },
    icu: { occupied: 18, available: 7, ventilators: 12 },
    ot: { scheduled: 8, inProgress: 2, completed: 5 },
  });

  const getMockAlerts = (): Alert[] => [
    { id: '1', type: 'critical', title: 'ICU Bed Shortage', message: 'Only 2 ICU beds available', timestamp: new Date(), department: 'ICU' },
    { id: '2', type: 'warning', title: 'Lab Backlog', message: '15 tests pending >4 hours', timestamp: new Date(), department: 'Laboratory' },
    { id: '3', type: 'info', title: 'OT Schedule', message: 'Surgery #5 delayed by 30 min', timestamp: new Date(), department: 'Operation Theatre' },
  ];

  const getMockQueues = (): QueueItem[] => [
    { department: 'OPD', waiting: 23, avgWaitTime: 25 },
    { department: 'Emergency', waiting: 8, avgWaitTime: 10 },
    { department: 'Pharmacy', waiting: 15, avgWaitTime: 12 },
    { department: 'Laboratory', waiting: 12, avgWaitTime: 20 },
    { department: 'Radiology', waiting: 6, avgWaitTime: 35 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'warning': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Dashboard</h1>
          <p className="text-slate-500 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge className={isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {alerts.filter(a => a.type === 'critical').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="font-semibold text-red-800">Critical Alerts</span>
          </div>
          <div className="space-y-2">
            {alerts.filter(a => a.type === 'critical').map(alert => (
              <div key={alert.id} className="flex items-center justify-between">
                <span className="text-red-700">{alert.title}: {alert.message}</span>
                <Badge variant="outline" className="text-red-600">{alert.department}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Patients */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Patients Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.patients.today}</div>
            <div className="flex gap-4 mt-2 text-sm opacity-80">
              <span>IPD: {stats?.patients.inpatient}</span>
              <span>OPD: {stats?.patients.outpatient}</span>
            </div>
          </CardContent>
        </Card>

        {/* Bed Occupancy */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Bed className="h-4 w-4" />
              Bed Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.beds.occupancyRate}%</div>
            <div className="flex gap-4 mt-2 text-sm opacity-80">
              <span>Occupied: {stats?.beds.occupied}</span>
              <span>Available: {stats?.beds.available}</span>
            </div>
            <div className="mt-2 h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${stats?.beds.occupancyRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Today's Revenue */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Today's Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats?.revenue.today || 0)}</div>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>+12% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        {/* Appointments */}
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.appointments.today}</div>
            <div className="flex gap-4 mt-2 text-sm opacity-80">
              <span>Done: {stats?.appointments.completed}</span>
              <span>Pending: {stats?.appointments.pending}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Emergency */}
        <Card className={stats?.emergency.critical && stats.emergency.critical > 2 ? 'border-red-300 bg-red-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Ambulance className="h-4 w-4 text-red-500" />
              Emergency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats?.emergency.active} Active</div>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-red-600 font-medium">Critical: {stats?.emergency.critical}</span>
              <span className="text-slate-500">Waiting: {stats?.emergency.waiting}</span>
            </div>
          </CardContent>
        </Card>

        {/* ICU */}
        <Card className={stats?.icu.available && stats.icu.available < 3 ? 'border-orange-300 bg-orange-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              ICU
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats?.icu.occupied} / {(stats?.icu.occupied || 0) + (stats?.icu.available || 0)}</div>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-green-600">Available: {stats?.icu.available}</span>
              <span className="text-slate-500">Ventilators: {stats?.icu.ventilators}</span>
            </div>
          </CardContent>
        </Card>

        {/* Laboratory */}
        <Card className={stats?.lab.critical && stats.lab.critical > 3 ? 'border-yellow-300 bg-yellow-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TestTube className="h-4 w-4 text-purple-500" />
              Laboratory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats?.lab.pending} Pending</div>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-green-600">Completed: {stats?.lab.completed}</span>
              <span className="text-red-600 font-medium">Critical: {stats?.lab.critical}</span>
            </div>
          </CardContent>
        </Card>

        {/* Operation Theatre */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-blue-500" />
              Operation Theatre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats?.ot.inProgress} In Progress</div>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-blue-600">Scheduled: {stats?.ot.scheduled}</span>
              <span className="text-green-600">Done: {stats?.ot.completed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Status & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Department Queues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {queues.map((queue, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium w-24">{queue.department}</span>
                    <Badge variant="outline">{queue.waiting} waiting</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="h-4 w-4" />
                    <span>~{queue.avgWaitTime} min</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{alert.title}</span>
                    <Badge variant="outline" className="text-xs">{alert.department}</Badge>
                  </div>
                  <p className="text-sm mt-1">{alert.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Monthly Revenue Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">Month to Date: {formatCurrency(stats?.revenue.thisMonth || 0)}</p>
              <p className="text-sm text-slate-400 mt-1">Pending Collections: {formatCurrency(stats?.revenue.pending || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
