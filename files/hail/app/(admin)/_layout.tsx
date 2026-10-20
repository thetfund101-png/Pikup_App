import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/components/ui';

type IconName = keyof typeof Ionicons.glyphMap;
const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name={icon} color={color} size={size} />,
});

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.asphalt,
        tabBarInactiveTintColor: colors.asphaltMute,
        tabBarLabelStyle: { fontFamily: 'DMSans_500Medium' },
      }}
    >
      <Tabs.Screen name="index" options={tab('Live map', 'map')} />
      <Tabs.Screen name="fleet" options={tab('Fleet', 'people')} />
      <Tabs.Screen name="documents" options={tab('Documents', 'document-text')} />
      <Tabs.Screen name="pricing" options={tab('Pricing', 'pricetag')} />
      <Tabs.Screen name="profile" options={tab('Account', 'person')} />
    </Tabs>
  );
}
