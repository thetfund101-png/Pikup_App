import { ActivityIndicator, Text, View } from 'react-native';
import { Banner, Button, Sheet } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { RIDE_STATUS_LABEL, VEHICLE_LABEL, type LatLng, type Ride } from '@/types/domain';
import { useCancelRide, useRideDriver } from '../hooks';
import { SosButton } from './SosButton';

export function ActiveRideSheet({ ride, myPosition }: { ride: Ride; myPosition: LatLng | null }) {
  const driver = useRideDriver(ride);
  const cancel = useCancelRide();
  const canCancel = ride.status === 'pending' || ride.status === 'accepted' || ride.status === 'arrived';
  const canSos = ride.status === 'accepted' || ride.status === 'arrived' || ride.status === 'in_progress';
  const { profile, vehicle } = driver.data ?? { profile: null, vehicle: null };

  return (
    <Sheet>
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-xl text-asphalt">{RIDE_STATUS_LABEL[ride.status]}</Text>
        {ride.status === 'pending' ? <ActivityIndicator /> : null}
      </View>

      {profile ? (
        <View className="card flex-row items-center justify-between">
          <View>
            <Text className="font-heading text-base text-asphalt">{profile.full_name ?? 'Your driver'}</Text>
            <Text className="font-body text-sm text-asphalt-mute">
              {vehicle ? `${vehicle.color ?? ''} ${vehicle.make} ${vehicle.model}`.trim() : VEHICLE_LABEL[ride.vehicle_type]}
            </Text>
          </View>
          {vehicle ? <Text className="rounded-lg bg-signal px-3 py-1 font-display text-base text-asphalt">{vehicle.plate}</Text> : null}
        </View>
      ) : null}

      <View className="gap-1">
        <Text className="font-body text-sm text-asphalt-mute" numberOfLines={1}>From {ride.pickup_address}</Text>
        <Text className="font-body text-sm text-asphalt-mute" numberOfLines={1}>To {ride.dropoff_address}</Text>
        <Text className="font-heading text-lg text-asphalt">{formatMoney(ride.fare_estimate, ride.currency)}</Text>
      </View>

      {cancel.error ? <Banner tone="error">{cancel.error.message}</Banner> : null}
      {canSos ? <SosButton rideId={ride.id} at={myPosition} /> : null}
      {canCancel ? <Button title="Cancel ride" variant="ghost" loading={cancel.isPending} onPress={() => cancel.mutate(ride.id)} /> : null}
    </Sheet>
  );
}
