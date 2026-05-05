// Tab navigator for the authenticated patient app surface.
import { Tabs } from 'expo-router';
import { Home, Calendar, FileText, Receipt, User } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: false,
        tabBarStyle: { borderTopWidth: 0.5, borderTopColor: '#e2e8f0' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Home color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="appointments"
        options={{ title: 'Appointments', tabBarIcon: ({ color }) => <Calendar color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{ title: 'Rx', tabBarIcon: ({ color }) => <FileText color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="bills"
        options={{ title: 'Bills', tabBarIcon: ({ color }) => <Receipt color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <User color={color} size={22} /> }}
      />
    </Tabs>
  );
}
