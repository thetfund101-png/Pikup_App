import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { asNumber, formatMoney } from '@/lib/format';
import { useEarnings } from '@/features/driver/hooks';

const RANGES = [7, 30] as const;

export default function Earnings() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);
  const { data = [], isLoading } = useEarnings(days);

  const total = data.reduce((s, d) => s + asNumber(d.total), 0);
  const trips = data.reduce((s, d) => s + asNumber(d.trips), 0);
  const max = Math.max(1, ...data.map((d) => asNumber(d.total)));

  return (
    <SafeAreaView className="screen">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-xl gap-5 p-5">
        <Text className="title">Earnings</Text>
        <View className="flex-row gap-2">
          {RANGES.map((r) => (
            <Pressable key={r} accessibilityRole="button" onPress={() => setDays(r)} className={days === r ? 'chip-active' : 'chip'}>
              <Text className={`font-body-medium ${days === r ? 'text-paper' : 'text-asphalt'}`}>Last {r} days</Text>
            </Pressable>
          ))}
        </View>

        <View className="card gap-1">
          <Text className="label">Total</Text>
          <Text className="font-display text-4xl text-asphalt">{isLoading ? '…' : formatMoney(total)}</Text>
          <Text className="font-body text-sm text-asphalt-mute">{trips} completed {trips === 1 ? 'trip' : 'trips'}</Text>
        </View>

        <View className="card">
          <View className="h-40 flex-row items-end gap-1">
            {data.map((d) => (
              <View key={d.day} className="flex-1 items-center justify-end" accessibilityLabel={`${d.day}: ${formatMoney(d.total)}`}>
                <View className="w-full rounded-t bg-signal" style={{ height: `${Math.max(2, (asNumber(d.total) / max) * 100)}%` }} />
              </View>
            ))}
          </View>
          <View className="mt-2 flex-row justify-between">
            <Text className="font-body text-xs text-asphalt-mute">{data[0]?.day}</Text>
            <Text className="font-body text-xs text-asphalt-mute">{data[data.length - 1]?.day}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
