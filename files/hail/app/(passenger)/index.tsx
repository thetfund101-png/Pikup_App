import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import RideMap from '@/components/map/RideMap';
import type { MapMarker } from '@/components/map/RideMap.types';
import { Banner, Button, Sheet } from '@/components/ui';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { formatDistance, formatDuration, formatMoney } from '@/lib/format';
import { reverseGeocode } from '@/lib/mapbox';
import { ActiveRideSheet } from '@/features/rides/components/ActiveRideSheet';
import { PlaceSearch } from '@/features/rides/components/PlaceSearch';
import {
  useActiveRide, useFareOptions, useNearbyDrivers, useRequestRide, useRoute,
} from '@/features/rides/hooks';
import { useRideDraft } from '@/features/rides/store';
import { VEHICLE_LABEL, type LatLng } from '@/types/domain';

export default function PassengerHome() {
  const { coord: here } = useCurrentLocation();
  const { pickup, dropoff, vehicleType, setPickup, setDropoff, setVehicleType } = useRideDraft();
  const [editing, setEditing] = useState<'pickup' | 'dropoff' | null>(null);

  const ride = useActiveRide().data ?? null;
  const requestRide = useRequestRide();

  // Default the pickup to wherever the passenger is standing.
  useEffect(() => {
    if (!here || pickup || ride) return;
    let cancelled = false;
    reverseGeocode(here).then((address) => {
      if (!cancelled) setPickup({ coord: here, address });
    });
    return () => {
      cancelled = true;
    };
  }, [here, pickup, ride, setPickup]);

  const from: LatLng | null = ride ? { lat: ride.pickup_lat, lng: ride.pickup_lng } : pickup?.coord ?? null;
  const to: LatLng | null = ride ? { lat: ride.dropoff_lat, lng: ride.dropoff_lng } : dropoff?.coord ?? null;

  const route = useRoute(from, to);
  const fares = useFareOptions(ride ? undefined : route.data?.distanceM, ride ? undefined : route.data?.durationS);
  const nearby = useNearbyDrivers(ride ? null : pickup?.coord ?? here);
  const driverPos = useLiveLocation(ride && ride.status !== 'pending' ? ride.driver_id : null);

  const selectedFare = fares.data?.find((f) => f.vehicleType === vehicleType);

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];
    if (from) list.push({ id: 'pickup', coord: from, kind: 'pickup' });
    if (to) list.push({ id: 'dropoff', coord: to, kind: 'dropoff' });
    if (here) list.push({ id: 'me', coord: here, kind: 'me' });
    if (driverPos) list.push({ id: 'driver', coord: driverPos.coord, kind: 'driver' });
    else if (!ride) nearby.data?.forEach((d) => list.push({ id: `nearby:${d.driver_id}`, coord: { lat: d.lat, lng: d.lng }, kind: 'driver' }));
    return list;
  }, [from, to, here, driverPos, ride, nearby.data]);

  const pickOnMap = async (coord: LatLng) => {
    if (ride) return;
    const address = await reverseGeocode(coord);
    setDropoff({ coord, address });
  };

  const submit = () => {
    if (!pickup || !dropoff || !route.data) return;
    requestRide.mutate({
      pickup, dropoff, distanceM: route.data.distanceM, durationS: route.data.durationS, vehicleType,
    });
  };

  return (
    <View className="screen">
      <RideMap center={here} markers={markers} path={route.data?.path} onPressMap={pickOnMap} />

      {ride ? (
        <ActiveRideSheet ride={ride} myPosition={here} />
      ) : editing ? (
        <Sheet>
          <PlaceSearch
            label={editing === 'pickup' ? 'Pickup' : 'Where to?'}
            near={here}
            onCancel={() => setEditing(null)}
            onSelect={(p) => {
              (editing === 'pickup' ? setPickup : setDropoff)({ coord: p.coord, address: p.address });
              setEditing(null);
            }}
          />
        </Sheet>
      ) : (
        <Sheet>
          <Pressable onPress={() => setEditing('pickup')} className="card flex-row items-center gap-3 active:opacity-70">
            <View className="h-3 w-3 rounded-full bg-go" />
            <Text className="flex-1 font-body text-base text-asphalt" numberOfLines={1}>{pickup?.address ?? 'Finding your location…'}</Text>
          </Pressable>
          <Pressable onPress={() => setEditing('dropoff')} className="card flex-row items-center gap-3 active:opacity-70">
            <View className="h-3 w-3 rounded bg-asphalt" />
            <Text className={`flex-1 font-body text-base ${dropoff ? 'text-asphalt' : 'text-asphalt-mute'}`} numberOfLines={1}>
              {dropoff?.address ?? 'Where to? Search or tap the map'}
            </Text>
          </Pressable>

          {route.error ? <Banner tone="error">{route.error.message}</Banner> : null}

          {route.data && fares.data ? (
            <>
              <Text className="font-body text-sm text-asphalt-mute">
                {formatDistance(route.data.distanceM)} · {formatDuration(route.data.durationS)}
              </Text>
              <View className="flex-row gap-2">
                {fares.data.map((f) => (
                  <Pressable
                    key={f.vehicleType}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: vehicleType === f.vehicleType }}
                    onPress={() => setVehicleType(f.vehicleType)}
                    className={`flex-1 items-center gap-0.5 rounded-2xl border px-1 py-3 ${
                      vehicleType === f.vehicleType ? 'border-asphalt bg-signal-light' : 'border-line bg-white'
                    }`}
                  >
                    <Text className="font-body-medium text-sm text-asphalt">{VEHICLE_LABEL[f.vehicleType]}</Text>
                    <Text className="font-heading text-sm text-asphalt">{formatMoney(f.fare, f.currency)}</Text>
                    {f.surge > 1 ? <Text className="font-body text-xs text-alert">{f.surge}x demand</Text> : null}
                  </Pressable>
                ))}
              </View>
              {requestRide.error ? <Banner tone="error">{requestRide.error.message}</Banner> : null}
              <Button
                title={selectedFare ? `Request ${VEHICLE_LABEL[vehicleType]} · ${formatMoney(selectedFare.fare, selectedFare.currency)}` : 'Request ride'}
                loading={requestRide.isPending}
                disabled={!selectedFare}
                onPress={submit}
              />
            </>
          ) : null}
        </Sheet>
      )}
    </View>
  );
}
