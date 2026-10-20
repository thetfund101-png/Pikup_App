import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistance, formatMoney } from '@/lib/format';
import { useRideHistory } from '@/features/rides/hooks';

export default function Trips() {
  const { data = [], isLoading, refetch, isRefetching } = useRideHistory();
  return (
    <SafeAreaView className="screen">
      <FlatList
        data={data}
        keyExtractor={(r) => r.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerClassName="mx-auto w-full max-w-xl gap-3 p-5"
        ListHeaderComponent={<Text className="title mb-2">Your trips</Text>}
        ListEmptyComponent={
          <Text className="subtitle">{isLoading ? 'Loading…' : 'No trips yet. Your completed rides will show up here.'}</Text>
        }
        renderItem={({ item }) => (
          <View className="card gap-1">
            <View className="flex-row justify-between">
              <Text className="font-heading text-base text-asphalt capitalize">{item.status.replace('_', ' ')}</Text>
              <Text className="font-heading text-base text-asphalt">
                {item.status === 'completed' ? formatMoney(item.fare_final ?? item.fare_estimate, item.currency) : '—'}
              </Text>
            </View>
            <Text className="font-body text-sm text-asphalt-mute" numberOfLines={1}>{item.pickup_address} to {item.dropoff_address}</Text>
            <Text className="font-body text-xs text-asphalt-mute">
              {new Date(item.requested_at).toLocaleString()} · {formatDistance(item.distance_m)}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
