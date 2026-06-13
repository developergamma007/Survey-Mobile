import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

export default function TabLayout() {
  const { isAdminAuthenticated } = useAdminAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        sceneContainerStyle: { flex: 1, width: '100%' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Survey',
          href: isAdminAuthenticated ? null : undefined,
          tabBarIcon: ({ color }) => <Ionicons name="clipboard-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <Ionicons name="shield-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen name="responses" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="wards" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
