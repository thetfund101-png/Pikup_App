import { Text, View } from 'react-native';

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'error'; children: string }) {
  return (
    <View className={`rounded-xl px-4 py-3 ${tone === 'error' ? 'bg-red-50' : 'bg-signal-light'}`}>
      <Text className={`font-body text-sm ${tone === 'error' ? 'text-alert' : 'text-asphalt'}`}>{children}</Text>
    </View>
  );
}
