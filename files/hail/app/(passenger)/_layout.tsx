import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/components/ui';

export default function PassengerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.asphalt,
        tabBarInactiveTintColor: colors.asphaltMute,
        tabBarLabelStyle: { fontFamily: 'DMSans_500Medium' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ride', tabBarIcon: ({ color, size }) => <Ionicons name="car" color={color} size={size} /> }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips', tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
    </Tabs>
  );
}
