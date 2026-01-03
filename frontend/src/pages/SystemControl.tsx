import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, FileText, Activity, Plus, Edit, Trash2, Key, Building2, Mail, Phone, Download, Lock, Database } from 'lucide-react';
import api from '../services/api';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'Admin' | 'Doctor' | 'Nurse' | 'Receptionist' | 'Pharmacist' | 'Lab Technician' | 'Accountant';
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
}

interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: string;
  description: string;
}

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'Financial' | 'Clinical' | 'Operational' | 'Inventory';
  schedule?: 'Daily' | 'Weekly' | 'Monthly' | 'None';
  format: 'PDF' | 'Excel' | 'CSV';
  recipients: string[];
  status: 'active' | 'inactive';
}

const SystemControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');

  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userFormData, setUserFormData] = useState<Partial<User>>({});
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // System Settings State
  const [hospitalInfo, setHospitalInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    registrationNumber: '',
    taxNumber: '',
  });
  const [emailConfig, setEmailConfig] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',
  });
  const [smsConfig, setSmsConfig] = useState({
    provider: '',
    apiKey: '',
    senderId: '',
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFilters, setAuditFilters] = useState({
    module: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
  });

  // Reports State
  const [reports, setReports] = useState<Report[]>([]);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [reportFormData, setReportFormData] = useState<Partial<Report>>({});

  // Fetch Users
  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Mock data for demo
      setUsers([
        {
          id: '1',
          username: 'admin',
          fullName: 'System Administrator',
          email: 'admin@hospital.com',
          phone: '9876543210',
          role: 'Admin',
          status: 'active',
          lastLogin: '2025-12-06T10:30:00',
          createdAt: '2025-01-01T00:00:00',
        },
        {
          id: '2',
          username: 'dr.sharma',
          fullName: 'Dr. Rajesh Sharma',
          email: 'rajesh@hospital.com',
          phone: '9876543211',
          role: 'Doctor',
          status: 'active',
          lastLogin: '2025-12-06T09:15:00',
          createdAt: '2025-01-15T00:00:00',
        },
      ]);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const response = await api.get('/api/audit-logs', { params: auditFilters });
      setAuditLogs(response.data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      // Mock data
      setAuditLogs([
        {
          id: '1',
          userId: '1',
          userName: 'admin',
          action: 'User Login',
          module: 'Authentication',
          details: 'Successful login',
          ipAddress: '192.168.1.100',
          timestamp: '2025-12-06T10:30:00',
        },
        {
          id: '2',
          userId: '2',
          userName: 'dr.sharma',
          action: 'Patient Created',
          module: 'OPD',
          details: 'Created new patient: John Doe (MRN: MRN001)',
          ipAddress: '192.168.1.101',
          timestamp: '2025-12-06T09:15:00',
        },
        {
          id: '3',
          userId: '1',
          userName: 'admin',
          action: 'Settings Updated',
          module: 'System Control',
          details: 'Updated hospital information',
          ipAddress: '192.168.1.100',
          timestamp: '2025-12-05T15:45:00',
        },
      ]);
    }
  };

  // Fetch Reports
  const fetchReports = async () => {
    try {
      const response = await api.get('/api/reports');
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      // Mock data
      setReports([
        {
          id: '1',
          name: 'Daily Revenue Report',
          description: 'Daily financial summary with billing and collections',
          type: 'Financial',
          schedule: 'Daily',
          format: 'PDF',
          recipients: ['accounts@hospital.com', 'admin@hospital.com'],
          status: 'active',
        },
        {
          id: '2',
          name: 'Weekly Patient Statistics',
          description: 'Weekly patient admission and discharge summary',
          type: 'Clinical',
          schedule: 'Weekly',
          format: 'Excel',
          recipients: ['admin@hospital.com'],
          status: 'active',
        },
      ]);
    }
  };

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      const settingsData = response.data;

      // Parse settings into categories
      settingsData.forEach((setting: SystemSetting) => {
        if (setting.category === 'hospital') {
          setHospitalInfo((prev) => ({ ...prev, [setting.key]: setting.value }));
        } else if (setting.category === 'email') {
          setEmailConfig((prev) => ({ ...prev, [setting.key]: setting.value }));
        } else if (setting.category === 'sms') {
          setSmsConfig((prev) => ({ ...prev, [setting.key]: setting.value }));
        }
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
    fetchReports();
    fetchSettings();
  }, []);

  // User Management Handlers
  const handleAddUser = async () => {
    try {
      await api.post('/api/users', { ...userFormData, status: 'active' });
      await fetchUsers();
      setIsUserDialogOpen(false);
      setUserFormData({});
      alert('User added successfully!');
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user');
    }
  };

  const handleEditUser = async () => {
    try {
      await api.put(`/api/users/${selectedUserId}`, userFormData);
      await fetchUsers();
      setIsUserDialogOpen(false);
      setIsEditingUser(false);
      setUserFormData({});
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/api/users/${id}`);
      await fetchUsers();
      alert('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleResetPassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    try {
      await api.post(`/api/users/${selectedUserId}/reset-password`, {
        newPassword: passwordData.newPassword,
      });
      setIsPasswordDialogOpen(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      alert('Password reset successfully!');
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password');
    }
  };

  const openEditUserDialog = (user: User) => {
    setSelectedUserId(user.id);
    setUserFormData(user);
    setIsEditingUser(true);
    setIsUserDialogOpen(true);
  };

  const openAddUserDialog = () => {
    setUserFormData({});
    setIsEditingUser(false);
    setIsUserDialogOpen(true);
  };

  const openPasswordDialog = (userId: string) => {
    setSelectedUserId(userId);
    setIsPasswordDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    try {
      await api.post('/api/users/change-password', {
        currentPassword: changePasswordData.currentPassword,
        newPassword: changePasswordData.newPassword,
      });
      setIsChangePasswordDialogOpen(false);
      setChangePasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Password changed successfully!');
    } catch (error: any) {
      console.error('Error changing password:', error);
      alert(error.response?.data?.error || 'Failed to change password');
    }
  };

  const handleExportAuditLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (auditFilters.module) params.append('module', auditFilters.module);
      if (auditFilters.dateFrom) params.append('dateFrom', auditFilters.dateFrom);
      if (auditFilters.dateTo) params.append('dateTo', auditFilters.dateTo);

      const response = await api.get(`/api/audit-logs/export?${params.toString()}`, {
        responseType: 'blob',
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      alert('Audit logs exported successfully!');
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      alert('Failed to export audit logs');
    }
  };

  // Settings Handlers
  const handleSaveHospitalInfo = async () => {
    try {
      await api.post('/api/settings/hospital', hospitalInfo);
      alert('Hospital information saved successfully!');
    } catch (error) {
      console.error('Error saving hospital info:', error);
      alert('Failed to save hospital information');
    }
  };

  const handleSaveEmailConfig = async () => {
    try {
      await api.post('/api/settings/email', emailConfig);
      alert('Email configuration saved successfully!');
    } catch (error) {
      console.error('Error saving email config:', error);
      alert('Failed to save email configuration');
    }
  };

  const handleSaveSMSConfig = async () => {
    try {
      await api.post('/api/settings/sms', smsConfig);
      alert('SMS configuration saved successfully!');
    } catch (error) {
      console.error('Error saving SMS config:', error);
      alert('Failed to save SMS configuration');
    }
  };

  // Report Handlers
  const handleAddReport = async () => {
    try {
      await api.post('/api/reports', { ...reportFormData, status: 'active' });
      await fetchReports();
      setIsReportDialogOpen(false);
      setReportFormData({});
      alert('Report configured successfully!');
    } catch (error) {
      console.error('Error adding report:', error);
      alert('Failed to configure report');
    }
  };

  const handleEditReport = async () => {
    try {
      await api.put(`/api/reports/${reportFormData.id}`, reportFormData);
      await fetchReports();
      setIsReportDialogOpen(false);
      setIsEditingReport(false);
      setReportFormData({});
      alert('Report updated successfully!');
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report');
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report configuration?')) return;

    try {
      await api.delete(`/api/reports/${id}`);
      await fetchReports();
      alert('Report deleted successfully!');
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    }
  };

  const openEditReportDialog = (report: Report) => {
    setReportFormData(report);
    setIsEditingReport(true);
    setIsReportDialogOpen(true);
  };

  const openAddReportDialog = () => {
    setReportFormData({});
    setIsEditingReport(false);
    setIsReportDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Control</h1>
        <p className="text-muted-foreground">Manage users, settings, audit logs, and reports</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            System Settings
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Activity className="mr-2 h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="mr-2 h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage system users and permissions</CardDescription>
              </div>
              <Button onClick={openAddUserDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditUserDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPasswordDialog(user.id)}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hospital Information</CardTitle>
              <CardDescription>Configure basic hospital details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hospital Name</Label>
                  <Input
                    value={hospitalInfo.name}
                    onChange={(e) =>
                      setHospitalInfo({ ...hospitalInfo, name: e.target.value })
                    }
                    placeholder="Enter hospital name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Registration Number</Label>
                  <Input
                    value={hospitalInfo.registrationNumber}
                    onChange={(e) =>
                      setHospitalInfo({ ...hospitalInfo, registrationNumber: e.target.value })
                    }
                    placeholder="Enter registration number"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Address</Label>
                  <Textarea
                    value={hospitalInfo.address}
                    onChange={(e) =>
                      setHospitalInfo({ ...hospitalInfo, address: e.target.value })
                    }
                    placeholder="Enter hospital address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={hospitalInfo.phone}
                    onChange={(e) =>
                      setHospitalInfo({ ...hospitalInfo, phone: e.target.value })
                    }
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={hospitalInfo.email}
                    onChange={(e) =>
                      setHospitalInfo({ ...hospitalInfo, email: e.target.value })
                    }
                    placeholder="Enter email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={hospitalInfo.website}
                    onChange={(e) =>
                      setHospitalInfo({ ...hospitalInfo, website: e.target.value })
                    }
                    placeholder="Enter website URL"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Number / GST</Label>
                  <Input
                    value={hospitalInfo.taxNumber}
                    onChange={(e) =>
                      setHospitalInfo({ ...hospitalInfo, taxNumber: e.target.value })
                    }
                    placeholder="Enter tax number"
                  />
                </div>
              </div>
              <Button onClick={handleSaveHospitalInfo}>
                <Building2 className="mr-2 h-4 w-4" />
                Save Hospital Information
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>Configure SMTP settings for sending emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input
                    value={emailConfig.smtpHost}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, smtpHost: e.target.value })
                    }
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input
                    value={emailConfig.smtpPort}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, smtpPort: e.target.value })
                    }
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Username</Label>
                  <Input
                    value={emailConfig.smtpUser}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, smtpUser: e.target.value })
                    }
                    placeholder="Enter SMTP username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Password</Label>
                  <Input
                    type="password"
                    value={emailConfig.smtpPassword}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, smtpPassword: e.target.value })
                    }
                    placeholder="Enter SMTP password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input
                    type="email"
                    value={emailConfig.fromEmail}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, fromEmail: e.target.value })
                    }
                    placeholder="noreply@hospital.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input
                    value={emailConfig.fromName}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, fromName: e.target.value })
                    }
                    placeholder="Hospital Name"
                  />
                </div>
              </div>
              <Button onClick={handleSaveEmailConfig}>
                <Mail className="mr-2 h-4 w-4" />
                Save Email Configuration
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SMS Configuration</CardTitle>
              <CardDescription>Configure SMS gateway for sending notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SMS Provider</Label>
                  <Select
                    value={smsConfig.provider}
                    onValueChange={(value) =>
                      setSmsConfig({ ...smsConfig, provider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="msg91">MSG91</SelectItem>
                      <SelectItem value="textlocal">TextLocal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    value={smsConfig.apiKey}
                    onChange={(e) =>
                      setSmsConfig({ ...smsConfig, apiKey: e.target.value })
                    }
                    placeholder="Enter API key"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sender ID</Label>
                  <Input
                    value={smsConfig.senderId}
                    onChange={(e) =>
                      setSmsConfig({ ...smsConfig, senderId: e.target.value })
                    }
                    placeholder="Enter sender ID"
                  />
                </div>
              </div>
              <Button onClick={handleSaveSMSConfig}>
                <Phone className="mr-2 h-4 w-4" />
                Save SMS Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Password Management</CardTitle>
              <CardDescription>Change your password or reset user passwords</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Change Your Password</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Update your account password for security purposes
                </p>
                <Button onClick={() => setIsChangePasswordDialogOpen(true)}>
                  <Key className="mr-2 h-4 w-4" />
                  Change My Password
                </Button>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Reset User Passwords</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  As an administrator, you can reset passwords for other users using the key icon in the User Management tab
                </p>
                <Button variant="outline" onClick={() => setActiveTab('users')}>
                  <Users className="mr-2 h-4 w-4" />
                  Go to User Management
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backup Configuration</CardTitle>
              <CardDescription>Configure automated system backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Backup Frequency</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Backup Time</Label>
                  <Input type="time" defaultValue="02:00" />
                </div>
                <div className="space-y-2">
                  <Label>Retention Period (Days)</Label>
                  <Input type="number" defaultValue="30" placeholder="Enter days" />
                </div>
                <div className="space-y-2">
                  <Label>Backup Location</Label>
                  <Select defaultValue="local">
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Storage</SelectItem>
                      <SelectItem value="cloud">Cloud Storage</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Last Backup</span>
                  <Badge variant="outline">2025-12-30 02:00 AM</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Backup Status</span>
                  <Badge>Success</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Backup Size</span>
                  <span className="text-sm">2.5 GB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Next Scheduled Backup</span>
                  <span className="text-sm">2025-12-31 02:00 AM</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button>
                  <Database className="mr-2 h-4 w-4" />
                  Save Backup Settings
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Run Backup Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>View system activity and user actions</CardDescription>
              </div>
              <Button onClick={handleExportAuditLogs} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Module</Label>
                  <Select
                    value={auditFilters.module || 'all'}
                    onValueChange={(value) =>
                      setAuditFilters({ ...auditFilters, module: value === 'all' ? '' : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All modules" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All modules</SelectItem>
                      <SelectItem value="Authentication">Authentication</SelectItem>
                      <SelectItem value="OPD">OPD</SelectItem>
                      <SelectItem value="IPD">IPD</SelectItem>
                      <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="Billing">Billing</SelectItem>
                      <SelectItem value="System Control">System Control</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input
                    type="date"
                    value={auditFilters.dateFrom}
                    onChange={(e) =>
                      setAuditFilters({ ...auditFilters, dateFrom: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input
                    type="date"
                    value={auditFilters.dateTo}
                    onChange={(e) =>
                      setAuditFilters({ ...auditFilters, dateTo: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button onClick={fetchAuditLogs} className="w-full">
                    Apply Filters
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.userName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.module}</Badge>
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.details}</TableCell>
                      <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Report Configuration</CardTitle>
                <CardDescription>Configure automated and scheduled reports</CardDescription>
              </div>
              <Button onClick={openAddReportDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Report
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.type}</Badge>
                      </TableCell>
                      <TableCell>{report.schedule || 'Manual'}</TableCell>
                      <TableCell>{report.format}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {report.recipients.length} recipient(s)
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.status === 'active' ? 'default' : 'secondary'}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditReportDialog(report)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteReport(report.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {isEditingUser
                ? 'Update user details and permissions'
                : 'Create a new system user'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input
                value={userFormData.username || ''}
                onChange={(e) =>
                  setUserFormData({ ...userFormData, username: e.target.value })
                }
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={userFormData.fullName || ''}
                onChange={(e) =>
                  setUserFormData({ ...userFormData, fullName: e.target.value })
                }
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={userFormData.email || ''}
                onChange={(e) =>
                  setUserFormData({ ...userFormData, email: e.target.value })
                }
                placeholder="Enter email"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={userFormData.phone || ''}
                onChange={(e) =>
                  setUserFormData({ ...userFormData, phone: e.target.value })
                }
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={userFormData.role}
                onValueChange={(value: any) =>
                  setUserFormData({ ...userFormData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Doctor">Doctor</SelectItem>
                  <SelectItem value="Nurse">Nurse</SelectItem>
                  <SelectItem value="Receptionist">Receptionist</SelectItem>
                  <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="Lab Technician">Lab Technician</SelectItem>
                  <SelectItem value="Accountant">Accountant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isEditingUser && (
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={isEditingUser ? handleEditUser : handleAddUser}>
              {isEditingUser ? 'Update User' : 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter a new password for this user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditingReport ? 'Edit Report Configuration' : 'Add Report Configuration'}
            </DialogTitle>
            <DialogDescription>
              Configure automated report generation and delivery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Report Name *</Label>
              <Input
                value={reportFormData.name || ''}
                onChange={(e) =>
                  setReportFormData({ ...reportFormData, name: e.target.value })
                }
                placeholder="Enter report name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={reportFormData.description || ''}
                onChange={(e) =>
                  setReportFormData({ ...reportFormData, description: e.target.value })
                }
                placeholder="Enter report description"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={reportFormData.type}
                  onValueChange={(value: any) =>
                    setReportFormData({ ...reportFormData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Financial">Financial</SelectItem>
                    <SelectItem value="Clinical">Clinical</SelectItem>
                    <SelectItem value="Operational">Operational</SelectItem>
                    <SelectItem value="Inventory">Inventory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Schedule</Label>
                <Select
                  value={reportFormData.schedule}
                  onValueChange={(value: any) =>
                    setReportFormData({ ...reportFormData, schedule: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None (Manual)</SelectItem>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format *</Label>
                <Select
                  value={reportFormData.format}
                  onValueChange={(value: any) =>
                    setReportFormData({ ...reportFormData, format: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="Excel">Excel</SelectItem>
                    <SelectItem value="CSV">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Recipients (comma-separated emails)</Label>
              <Textarea
                value={reportFormData.recipients?.join(', ') || ''}
                onChange={(e) =>
                  setReportFormData({
                    ...reportFormData,
                    recipients: e.target.value.split(',').map((email) => email.trim()),
                  })
                }
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={isEditingReport ? handleEditReport : handleAddReport}>
              {isEditingReport ? 'Update Report' : 'Add Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Update your account password</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={changePasswordData.currentPassword}
                onChange={(e) =>
                  setChangePasswordData({ ...changePasswordData, currentPassword: e.target.value })
                }
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={changePasswordData.newPassword}
                onChange={(e) =>
                  setChangePasswordData({ ...changePasswordData, newPassword: e.target.value })
                }
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={changePasswordData.confirmPassword}
                onChange={(e) =>
                  setChangePasswordData({ ...changePasswordData, confirmPassword: e.target.value })
                }
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangePasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemControl;
