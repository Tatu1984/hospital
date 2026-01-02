import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/Toast';
import { TwoFactorSetup } from '@/components/TwoFactorSetup';
import {
  User,
  Lock,
  Bell,
  Eye,
  EyeOff,
  Save,
  Smartphone,
  Mail,
  MapPin,
  Building,
  Loader2,
  Monitor,
  Clock,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface NotificationPrefs {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  criticalAlerts: boolean;
  appointmentReminders: boolean;
  labResults: boolean;
  billingAlerts: boolean;
}

export default function UserProfile() {
  const { token, user } = useAuth();
  const toast = useToast();
  const [saveLoading, setSaveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    criticalAlerts: true,
    appointmentReminders: true,
    labResults: true,
    billingAlerts: true,
  });

  // Active sessions
  const [sessions, setSessions] = useState<any[]>([]);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    if (user) {
      const userData = user as any;
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: userData.phone || '',
        address: userData.address || '',
      });
    }
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    // Mock sessions for now - would fetch from API
    setSessions([
      {
        id: '1',
        device: 'Chrome on Windows',
        location: 'Kampala, Uganda',
        lastActive: new Date().toISOString(),
        current: true,
      },
    ]);
  };

  const handleUpdateProfile = async () => {
    setSaveLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileForm),
      });

      if (res.ok) {
        toast.success( 'Profile updated successfully');
      } else {
        const error = await res.json();
        toast.error( error.message || 'Failed to update profile');
      }
    } catch (err) {
      toast.error( 'Failed to update profile');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error( 'Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error( 'Password must be at least 8 characters');
      return;
    }

    setSaveLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/me/password`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (res.ok) {
        toast.success( 'Password changed successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const error = await res.json();
        toast.error( error.message || 'Failed to change password');
      }
    } catch (err) {
      toast.error( 'Failed to change password');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdateNotifications = async () => {
    setSaveLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/me/notifications`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(notificationPrefs),
      });

      if (res.ok) {
        toast.success( 'Notification preferences updated');
      } else {
        toast.error( 'Failed to update preferences');
      }
    } catch (err) {
      toast.error( 'Failed to update preferences');
    } finally {
      setSaveLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const password = passwordForm.newPassword;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
          <User className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{user?.name || 'User Profile'}</h1>
          <p className="text-slate-500">{user?.email}</p>
          <div className="flex gap-2 mt-2">
            {user?.roleIds?.map((role: string) => (
              <Badge key={role} variant="outline" className="capitalize">
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Sessions
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="pl-10"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="pl-10"
                      placeholder="+256 xxx xxx xxx"
                    />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="pl-10"
                      placeholder="Your address"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>Branch: {user?.branch?.name || 'Main Branch'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Member since: {(user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleUpdateProfile} disabled={saveLoading}>
                {saveLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password regularly to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="pl-10 pr-10"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="pl-10 pr-10"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${
                              i < getPasswordStrength() ? strengthColors[getPasswordStrength() - 1] : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">
                        Strength: {strengthLabels[getPasswordStrength() - 1] || 'Very Weak'}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="pl-10"
                      placeholder="Confirm new password"
                    />
                  </div>
                  {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleChangePassword} disabled={saveLoading}>
                  {saveLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </CardFooter>
            </Card>

            <TwoFactorSetup />
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Delivery Methods</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-slate-500">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.emailNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, emailNotifications: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">SMS Notifications</p>
                      <p className="text-sm text-slate-500">Receive notifications via SMS</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.smsNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, smsNotifications: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-slate-500">Browser push notifications</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.pushNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, pushNotifications: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-medium text-slate-900">Notification Types</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Critical Alerts</p>
                      <p className="text-sm text-slate-500">Emergency and critical patient alerts</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.criticalAlerts}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, criticalAlerts: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Appointment Reminders</p>
                      <p className="text-sm text-slate-500">Upcoming appointments and schedule changes</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.appointmentReminders}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, appointmentReminders: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Lab Results</p>
                      <p className="text-sm text-slate-500">Lab test results and critical values</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.labResults}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, labResults: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Billing Alerts</p>
                      <p className="text-sm text-slate-500">Payment and billing notifications</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.billingAlerts}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, billingAlerts: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleUpdateNotifications} disabled={saveLoading}>
                {saveLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage your active sessions across devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      session.current ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg">
                        <Monitor className="h-6 w-6 text-slate-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{session.device}</p>
                          {session.current && (
                            <Badge className="bg-blue-100 text-blue-800">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{session.location}</p>
                        <p className="text-xs text-slate-400">
                          Last active: {new Date(session.lastActive).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
