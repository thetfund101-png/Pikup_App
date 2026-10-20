import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/components/ui';

export default function DriverLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.asphalt,
        tabBarInactiveTintColor: colors.asphaltMute,
        tabBarLabelStyle: { fontFamily: 'DMSans_500Medium' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Drive', tabBarIcon: ({ color, size }) => <Ionicons name="navigate" color={color} size={size} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ color, size }) => <Ionicons name="cash" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
    </Tabs>
  );
}
