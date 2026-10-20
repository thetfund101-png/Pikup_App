import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button } from '@/components/ui';
import { useFleet, useSetApproved } from '@/features/admin/hooks';

export default function Fleet() {
  const { data = [], isLoading, error, refetch, isRefetching } = useFleet();
  const setApproved = useSetApproved();

  return (
    <SafeAreaView className="screen">
      <FlatList
        data={data}
        keyExtractor={(i) => i.driver.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerClassName="mx-auto w-full max-w-2xl gap-3 p-5"
        ListHeaderComponent={
          <View className="mb-2 gap-3">
            <Text className="title">Fleet</Text>
            {error ? <Banner tone="error">{error.message}</Banner> : null}
          </View>
        }
        ListEmptyComponent={<Text className="subtitle">{isLoading ? 'Loading…' : 'No drivers have signed up yet.'}</Text>}
        renderItem={({ item: { driver, vehicles } }) => (
          <View className="card gap-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="font-heading text-base text-asphalt">{driver.full_name ?? 'Unnamed driver'}</Text>
                <Text className="font-body text-sm text-asphalt-mute">
                  {vehicles.length ? vehicles.map((v) => `${v.make} ${v.model} (${v.plate})`).join(', ') : 'No vehicle added'}
                </Text>
              </View>
              <Text className={`font-body-medium text-sm ${driver.is_online ? 'text-go' : 'text-asphalt-mute'}`}>
                {driver.is_online ? 'Online' : 'Offline'}
              </Text>
            </View>
            <Button
              title={driver.is_approved ? 'Suspend driver' : 'Approve driver'}
              variant={driver.is_approved ? 'ghost' : 'primary'}
              loading={setApproved.isPending && setApproved.variables?.id === driver.id}
              onPress={() => setApproved.mutate({ id: driver.id, approved: !driver.is_approved })}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
