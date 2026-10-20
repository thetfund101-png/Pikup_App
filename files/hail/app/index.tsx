import { ActivityIndicator, View } from 'react-native';

// AuthGate in _layout.tsx redirects away from here once auth state is known.
export default function Index() {
  return (
    <View className="screen items-center justify-center">
      <ActivityIndicator />
    </View>
  );
}
