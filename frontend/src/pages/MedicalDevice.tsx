import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/Toast';
import {
  Activity, Wifi, WifiOff, AlertTriangle, Settings, RefreshCw,
  Monitor, Thermometer, Heart, Droplets, Wind, Zap, Battery,
  Signal, Clock, CheckCircle, XCircle, Plus, Search, Download
} from 'lucide-react';

interface MedicalDevice {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  department: string;
  ipAddress?: string;
  connectionType: 'HL7' | 'FHIR' | 'Serial' | 'Bluetooth' | 'WiFi' | 'Ethernet';
  status: 'online' | 'offline' | 'error' | 'maintenance';
  lastSync: string;
  batteryLevel?: number;
  firmwareVersion: string;
  calibrationDue?: string;
}

interface DeviceReading {
  id: string;
  deviceId: string;
  deviceName: string;
  patientId?: string;
  patientName?: string;
  readingType: string;
  value: number;
  unit: string;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical';
  acknowledged: boolean;
}

interface IntegrationConfig {
  id: string;
  name: string;
  protocol: string;
  endpoint: string;
  status: 'active' | 'inactive' | 'error';
  lastActivity: string;
  messagesProcessed: number;
}

export default function MedicalDevice() {
  const { success: toastSuccess } = useToast();
  const [activeTab, setActiveTab] = useState('devices');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<MedicalDevice | null>(null);

  const [devices, setDevices] = useState<MedicalDevice[]>([
    {
      id: 'DEV001',
      name: 'Bedside Monitor ICU-1',
      type: 'Patient Monitor',
      manufacturer: 'Philips',
      model: 'IntelliVue MX800',
      serialNumber: 'PHI-2024-001',
      location: 'ICU Bed 1',
      department: 'ICU',
      ipAddress: '192.168.10.101',
      connectionType: 'HL7',
      status: 'online',
      lastSync: '2024-01-15T10:30:00',
      firmwareVersion: '3.2.1',
      calibrationDue: '2024-06-15'
    },
    {
      id: 'DEV002',
      name: 'Ventilator ICU-2',
      type: 'Ventilator',
      manufacturer: 'Drager',
      model: 'Evita V500',
      serialNumber: 'DRG-2024-002',
      location: 'ICU Bed 2',
      department: 'ICU',
      ipAddress: '192.168.10.102',
      connectionType: 'HL7',
      status: 'online',
      lastSync: '2024-01-15T10:29:00',
      firmwareVersion: '2.8.0',
      calibrationDue: '2024-04-20'
    },
    {
      id: 'DEV003',
      name: 'Infusion Pump Ward-A',
      type: 'Infusion Pump',
      manufacturer: 'B. Braun',
      model: 'Infusomat Space',
      serialNumber: 'BBR-2024-003',
      location: 'Ward A - Room 101',
      department: 'General Ward',
      connectionType: 'WiFi',
      status: 'online',
      lastSync: '2024-01-15T10:28:00',
      batteryLevel: 85,
      firmwareVersion: '1.5.2'
    },
    {
      id: 'DEV004',
      name: 'ECG Machine OPD',
      type: 'ECG',
      manufacturer: 'GE Healthcare',
      model: 'MAC 2000',
      serialNumber: 'GE-2024-004',
      location: 'OPD Cardio Room',
      department: 'OPD',
      connectionType: 'Ethernet',
      status: 'offline',
      lastSync: '2024-01-15T08:00:00',
      firmwareVersion: '4.1.0',
      calibrationDue: '2024-02-28'
    },
    {
      id: 'DEV005',
      name: 'Pulse Oximeter ER-1',
      type: 'Pulse Oximeter',
      manufacturer: 'Masimo',
      model: 'Radical-7',
      serialNumber: 'MAS-2024-005',
      location: 'Emergency Bay 1',
      department: 'Emergency',
      connectionType: 'Bluetooth',
      status: 'online',
      lastSync: '2024-01-15T10:30:00',
      batteryLevel: 62,
      firmwareVersion: '2.0.3'
    },
    {
      id: 'DEV006',
      name: 'Blood Gas Analyzer',
      type: 'Blood Gas Analyzer',
      manufacturer: 'Radiometer',
      model: 'ABL90 FLEX',
      serialNumber: 'RAD-2024-006',
      location: 'Laboratory',
      department: 'Laboratory',
      ipAddress: '192.168.10.150',
      connectionType: 'HL7',
      status: 'error',
      lastSync: '2024-01-15T09:15:00',
      firmwareVersion: '5.2.1',
      calibrationDue: '2024-01-20'
    }
  ]);

  const [readings, setReadings] = useState<DeviceReading[]>([
    {
      id: 'RD001',
      deviceId: 'DEV001',
      deviceName: 'Bedside Monitor ICU-1',
      patientId: 'P1001',
      patientName: 'Rahul Sharma',
      readingType: 'Heart Rate',
      value: 78,
      unit: 'bpm',
      timestamp: '2024-01-15T10:30:00',
      status: 'normal',
      acknowledged: true
    },
    {
      id: 'RD002',
      deviceId: 'DEV001',
      deviceName: 'Bedside Monitor ICU-1',
      patientId: 'P1001',
      patientName: 'Rahul Sharma',
      readingType: 'SpO2',
      value: 96,
      unit: '%',
      timestamp: '2024-01-15T10:30:00',
      status: 'normal',
      acknowledged: true
    },
    {
      id: 'RD003',
      deviceId: 'DEV001',
      deviceName: 'Bedside Monitor ICU-1',
      patientId: 'P1001',
      patientName: 'Rahul Sharma',
      readingType: 'Blood Pressure',
      value: 145,
      unit: 'mmHg',
      timestamp: '2024-01-15T10:30:00',
      status: 'warning',
      acknowledged: false
    },
    {
      id: 'RD004',
      deviceId: 'DEV002',
      deviceName: 'Ventilator ICU-2',
      patientId: 'P1002',
      patientName: 'Priya Patel',
      readingType: 'Tidal Volume',
      value: 450,
      unit: 'mL',
      timestamp: '2024-01-15T10:29:00',
      status: 'normal',
      acknowledged: true
    },
    {
      id: 'RD005',
      deviceId: 'DEV005',
      deviceName: 'Pulse Oximeter ER-1',
      patientId: 'P1003',
      patientName: 'Amit Singh',
      readingType: 'SpO2',
      value: 88,
      unit: '%',
      timestamp: '2024-01-15T10:30:00',
      status: 'critical',
      acknowledged: false
    }
  ]);

  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([
    {
      id: 'INT001',
      name: 'HL7 Interface Engine',
      protocol: 'HL7 v2.5',
      endpoint: 'mllp://192.168.10.200:2575',
      status: 'active',
      lastActivity: '2024-01-15T10:30:00',
      messagesProcessed: 15420
    },
    {
      id: 'INT002',
      name: 'FHIR Server',
      protocol: 'FHIR R4',
      endpoint: 'https://fhir.hospital.local/r4',
      status: 'active',
      lastActivity: '2024-01-15T10:28:00',
      messagesProcessed: 8750
    },
    {
      id: 'INT003',
      name: 'Lab LIS Integration',
      protocol: 'HL7 v2.3',
      endpoint: 'mllp://192.168.10.201:2576',
      status: 'active',
      lastActivity: '2024-01-15T10:25:00',
      messagesProcessed: 5230
    },
    {
      id: 'INT004',
      name: 'Radiology RIS',
      protocol: 'DICOM',
      endpoint: 'dicom://192.168.10.202:4242',
      status: 'error',
      lastActivity: '2024-01-15T08:00:00',
      messagesProcessed: 2100
    }
  ]);

  const [newDevice, setNewDevice] = useState({
    name: '',
    type: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    location: '',
    department: '',
    ipAddress: '',
    connectionType: 'HL7' as const
  });

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    errors: devices.filter(d => d.status === 'error').length,
    criticalAlerts: readings.filter(r => r.status === 'critical' && !r.acknowledged).length
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'online': 'bg-green-100 text-green-800',
      'offline': 'bg-gray-100 text-gray-800',
      'error': 'bg-red-100 text-red-800',
      'maintenance': 'bg-yellow-100 text-yellow-800',
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'normal': 'bg-green-100 text-green-800',
      'warning': 'bg-yellow-100 text-yellow-800',
      'critical': 'bg-red-100 text-red-800'
    };
    return <Badge className={styles[status]}>{status.toUpperCase()}</Badge>;
  };

  const getDeviceIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'Patient Monitor': <Monitor className="h-5 w-5" />,
      'Ventilator': <Wind className="h-5 w-5" />,
      'Infusion Pump': <Droplets className="h-5 w-5" />,
      'ECG': <Heart className="h-5 w-5" />,
      'Pulse Oximeter': <Activity className="h-5 w-5" />,
      'Blood Gas Analyzer': <Thermometer className="h-5 w-5" />
    };
    return icons[type] || <Zap className="h-5 w-5" />;
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const addDevice = () => {
    const device: MedicalDevice = {
      id: `DEV${String(devices.length + 1).padStart(3, '0')}`,
      ...newDevice,
      status: 'offline',
      lastSync: new Date().toISOString(),
      firmwareVersion: '1.0.0'
    };

    setDevices(prev => [...prev, device]);
    setShowAddDialog(false);
    setNewDevice({
      name: '', type: '', manufacturer: '', model: '', serialNumber: '',
      location: '', department: '', ipAddress: '', connectionType: 'HL7'
    });

    toastSuccess('Device Added', 'Medical device registered successfully');
  };

  const syncDevice = (device: MedicalDevice) => {
    setDevices(prev => prev.map(d =>
      d.id === device.id ? { ...d, lastSync: new Date().toISOString(), status: 'online' } : d
    ));
    toastSuccess('Sync Complete', `${device.name} synchronized`);
  };

  const acknowledgeReading = (readingId: string) => {
    setReadings(prev => prev.map(r =>
      r.id === readingId ? { ...r, acknowledged: true } : r
    ));
    toastSuccess('Acknowledged', 'Alert acknowledged');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Medical Device Integration</h1>
          <p className="text-gray-600">Connected devices and real-time monitoring</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Register Medical Device</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Device Name</Label>
                  <Input
                    value={newDevice.name}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Bedside Monitor ICU-3"
                  />
                </div>
                <div>
                  <Label>Device Type</Label>
                  <Select
                    value={newDevice.type}
                    onValueChange={(v) => setNewDevice(prev => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Patient Monitor">Patient Monitor</SelectItem>
                      <SelectItem value="Ventilator">Ventilator</SelectItem>
                      <SelectItem value="Infusion Pump">Infusion Pump</SelectItem>
                      <SelectItem value="ECG">ECG Machine</SelectItem>
                      <SelectItem value="Pulse Oximeter">Pulse Oximeter</SelectItem>
                      <SelectItem value="Blood Gas Analyzer">Blood Gas Analyzer</SelectItem>
                      <SelectItem value="Defibrillator">Defibrillator</SelectItem>
                      <SelectItem value="Dialysis Machine">Dialysis Machine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Manufacturer</Label>
                  <Input
                    value={newDevice.manufacturer}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, manufacturer: e.target.value }))}
                    placeholder="e.g., Philips"
                  />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input
                    value={newDevice.model}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g., IntelliVue MX800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Serial Number</Label>
                  <Input
                    value={newDevice.serialNumber}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, serialNumber: e.target.value }))}
                    placeholder="e.g., PHI-2024-001"
                  />
                </div>
                <div>
                  <Label>Connection Type</Label>
                  <Select
                    value={newDevice.connectionType}
                    onValueChange={(v: any) => setNewDevice(prev => ({ ...prev, connectionType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HL7">HL7</SelectItem>
                      <SelectItem value="FHIR">FHIR</SelectItem>
                      <SelectItem value="Serial">Serial Port</SelectItem>
                      <SelectItem value="Bluetooth">Bluetooth</SelectItem>
                      <SelectItem value="WiFi">WiFi</SelectItem>
                      <SelectItem value="Ethernet">Ethernet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Location</Label>
                  <Input
                    value={newDevice.location}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., ICU Bed 3"
                  />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select
                    value={newDevice.department}
                    onValueChange={(v) => setNewDevice(prev => ({ ...prev, department: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ICU">ICU</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                      <SelectItem value="OPD">OPD</SelectItem>
                      <SelectItem value="General Ward">General Ward</SelectItem>
                      <SelectItem value="Laboratory">Laboratory</SelectItem>
                      <SelectItem value="OT">Operation Theatre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>IP Address (if applicable)</Label>
                <Input
                  value={newDevice.ipAddress}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, ipAddress: e.target.value }))}
                  placeholder="e.g., 192.168.10.103"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={addDevice}>Register Device</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Monitor className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-600">Total Devices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wifi className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.online}</p>
                <p className="text-sm text-gray-600">Online</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <WifiOff className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.offline}</p>
                <p className="text-sm text-gray-600">Offline</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.errors}</p>
                <p className="text-sm text-gray-600">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.criticalAlerts > 0 ? 'border-red-500 border-2' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.criticalAlerts > 0 ? 'bg-red-100 animate-pulse' : 'bg-yellow-100'}`}>
                <Activity className={`h-5 w-5 ${stats.criticalAlerts > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.criticalAlerts}</p>
                <p className="text-sm text-gray-600">Critical Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="devices">Device Registry</TabsTrigger>
          <TabsTrigger value="readings">
            Live Readings
            {stats.criticalAlerts > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{stats.criticalAlerts}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search devices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Device Grid */}
          <div className="grid grid-cols-3 gap-4">
            {filteredDevices.map((device) => (
              <Card key={device.id} className={`${device.status === 'error' ? 'border-red-300' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        device.status === 'online' ? 'bg-green-100' :
                        device.status === 'error' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {getDeviceIcon(device.type)}
                      </div>
                      <div>
                        <p className="font-semibold">{device.name}</p>
                        <p className="text-sm text-gray-500">{device.type}</p>
                      </div>
                    </div>
                    {getStatusBadge(device.status)}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location:</span>
                      <span>{device.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Serial:</span>
                      <span className="font-mono text-xs">{device.serialNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Connection:</span>
                      <Badge variant="outline">{device.connectionType}</Badge>
                    </div>
                    {device.ipAddress && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">IP:</span>
                        <span className="font-mono text-xs">{device.ipAddress}</span>
                      </div>
                    )}
                    {device.batteryLevel !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Battery:</span>
                        <div className="flex items-center gap-1">
                          <Battery className={`h-4 w-4 ${
                            device.batteryLevel > 50 ? 'text-green-500' :
                            device.batteryLevel > 20 ? 'text-yellow-500' : 'text-red-500'
                          }`} />
                          <span>{device.batteryLevel}%</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Sync:</span>
                      <span>{new Date(device.lastSync).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => syncDevice(device)}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Sync
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedDevice(device)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="readings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Device Readings</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Device</th>
                    <th className="text-left p-3">Patient</th>
                    <th className="text-left p-3">Reading</th>
                    <th className="text-left p-3">Value</th>
                    <th className="text-left p-3">Time</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((reading) => (
                    <tr key={reading.id} className={`border-b hover:bg-gray-50 ${
                      reading.status === 'critical' && !reading.acknowledged ? 'bg-red-50' : ''
                    }`}>
                      <td className="p-3">
                        <p className="font-medium">{reading.deviceName}</p>
                        <p className="text-sm text-gray-500">{reading.deviceId}</p>
                      </td>
                      <td className="p-3">
                        {reading.patientName ? (
                          <div>
                            <p>{reading.patientName}</p>
                            <p className="text-sm text-gray-500">{reading.patientId}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">{reading.readingType}</td>
                      <td className="p-3">
                        <span className={`text-lg font-bold ${
                          reading.status === 'critical' ? 'text-red-600' :
                          reading.status === 'warning' ? 'text-yellow-600' : ''
                        }`}>
                          {reading.value} {reading.unit}
                        </span>
                      </td>
                      <td className="p-3">
                        {new Date(reading.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3">{getStatusBadge(reading.status)}</td>
                      <td className="p-3">
                        {!reading.acknowledged && reading.status !== 'normal' && (
                          <Button size="sm" variant="outline" onClick={() => acknowledgeReading(reading.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                        {reading.acknowledged && (
                          <span className="text-green-600 text-sm flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Acknowledged
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-lg">{integration.name}</p>
                      <Badge variant="outline">{integration.protocol}</Badge>
                    </div>
                    {getStatusBadge(integration.status)}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Endpoint:</span>
                      <span className="font-mono text-xs">{integration.endpoint}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Activity:</span>
                      <span>{new Date(integration.lastActivity).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Messages Processed:</span>
                      <span className="font-semibold">{integration.messagesProcessed.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Settings className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Add Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Integration Name</Label>
                  <Input placeholder="e.g., New LIS System" />
                </div>
                <div>
                  <Label>Protocol</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select protocol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HL7v2">HL7 v2.x</SelectItem>
                      <SelectItem value="HL7v3">HL7 v3</SelectItem>
                      <SelectItem value="FHIR">FHIR R4</SelectItem>
                      <SelectItem value="DICOM">DICOM</SelectItem>
                      <SelectItem value="REST">REST API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Endpoint URL</Label>
                  <Input placeholder="mllp://host:port" />
                </div>
                <div className="flex items-end">
                  <Button>Add Integration</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { time: '10:30:15', level: 'INFO', message: 'HL7 ADT^A01 received from Bedside Monitor ICU-1', device: 'DEV001' },
                  { time: '10:30:14', level: 'INFO', message: 'Vitals data stored for patient P1001', device: 'DEV001' },
                  { time: '10:29:58', level: 'WARNING', message: 'High BP reading detected - 145/95 mmHg', device: 'DEV001' },
                  { time: '10:29:45', level: 'INFO', message: 'Ventilator sync completed', device: 'DEV002' },
                  { time: '10:28:30', level: 'ERROR', message: 'Connection timeout - Blood Gas Analyzer', device: 'DEV006' },
                  { time: '10:28:00', level: 'INFO', message: 'FHIR Observation resource created', device: 'System' },
                  { time: '10:25:15', level: 'CRITICAL', message: 'Low SpO2 alert - 88% - Patient P1003', device: 'DEV005' },
                  { time: '10:20:00', level: 'INFO', message: 'Infusion pump battery at 85%', device: 'DEV003' }
                ].map((log, idx) => (
                  <div key={idx} className={`flex items-start gap-4 p-2 rounded ${
                    log.level === 'ERROR' ? 'bg-red-50' :
                    log.level === 'WARNING' ? 'bg-yellow-50' :
                    log.level === 'CRITICAL' ? 'bg-red-100' : 'bg-gray-50'
                  }`}>
                    <span className="text-gray-500 font-mono text-sm w-20">{log.time}</span>
                    <Badge className={`w-20 justify-center ${
                      log.level === 'ERROR' || log.level === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      log.level === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {log.level}
                    </Badge>
                    <span className="font-mono text-sm text-gray-500">[{log.device}]</span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Device Details Dialog */}
      <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Device Configuration</DialogTitle>
          </DialogHeader>
          {selectedDevice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Device Name</Label>
                  <Input defaultValue={selectedDevice.name} />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input defaultValue={selectedDevice.location} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>IP Address</Label>
                  <Input defaultValue={selectedDevice.ipAddress} />
                </div>
                <div>
                  <Label>Connection Type</Label>
                  <Select defaultValue={selectedDevice.connectionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HL7">HL7</SelectItem>
                      <SelectItem value="FHIR">FHIR</SelectItem>
                      <SelectItem value="Serial">Serial</SelectItem>
                      <SelectItem value="WiFi">WiFi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Calibration Due</Label>
                <Input type="date" defaultValue={selectedDevice.calibrationDue} />
              </div>
              <div className="p-3 bg-gray-50 rounded space-y-1 text-sm">
                <p><strong>Manufacturer:</strong> {selectedDevice.manufacturer}</p>
                <p><strong>Model:</strong> {selectedDevice.model}</p>
                <p><strong>Serial:</strong> {selectedDevice.serialNumber}</p>
                <p><strong>Firmware:</strong> {selectedDevice.firmwareVersion}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDevice(null)}>Cancel</Button>
            <Button onClick={() => {
              setSelectedDevice(null);
              toastSuccess('Saved', 'Device configuration updated');
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
