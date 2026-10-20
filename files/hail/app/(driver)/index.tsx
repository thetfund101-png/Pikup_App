import { useMemo, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import RideMap from '@/components/map/RideMap';
import type { MapMarker } from '@/components/map/RideMap.types';
import { Banner, Button, colors, Sheet } from '@/components/ui';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { distanceMeters } from '@/lib/geo';
import { formatDistance, formatMoney } from '@/lib/format';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  useAcceptRide, useDriverRides, usePassengerName, useRideStatus, useSetOnline,
} from '@/features/driver/hooks';
import { useRoute } from '@/features/rides/hooks';
import type { LatLng, Ride } from '@/types/domain';

const OFFER_RADIUS_M = 6000;
const OFFER_MAX_AGE_MS = 3 * 60_000;

const DRIVER_STATUS_LABEL: Record<Ride['status'], string> = {
  pending: 'Ride requested',
  accepted: 'Head to pickup',
  arrived: 'Waiting for passenger',
  in_progress: 'Trip in progress',
  completed: 'Trip completed',
  cancelled: 'Ride cancelled',
};

const NEXT_ACTION: Partial<Record<Ride['status'], { label: string; to: 'arrived' | 'in_progress' | 'completed' }>> = {
  accepted: { label: "I've arrived", to: 'arrived' },
  arrived: { label: 'Start trip', to: 'in_progress' },
  in_progress: { label: 'Complete trip', to: 'completed' },
};

export default function DriverHome() {
  const { profile } = useAuth();
  const online = profile?.is_online ?? false;
  const approved = profile?.is_approved ?? false;

  const loc = useDriverLocation({ enabled: online });
  const setOnline = useSetOnline();
  const accept = useAcceptRide();
  const status = useRideStatus();
  const { pending, active } = useDriverRides(online);
  const [declined, setDeclined] = useState<ReadonlySet<string>>(new Set());

  const ride = active.data ?? null;
  const passengerName = usePassengerName(ride?.passenger_id).data;

  // Offers: nearest first, within range, not stale, not declined.
  const offers = useMemo(() => {
    const here = loc.coords;
    if (!here || ride) return [];
    const now = Date.now();
    return (pending.data ?? [])
      .filter((r) => !declined.has(r.id) && now - new Date(r.requested_at).getTime() < OFFER_MAX_AGE_MS)
      .map((r) => ({ ride: r, pickupM: distanceMeters(here, { lat: r.pickup_lat, lng: r.pickup_lng }) }))
      .filter((o) => o.pickupM <= OFFER_RADIUS_M)
      .sort((a, b) => a.pickupM - b.pickupM);
  }, [pending.data, loc.coords, ride, declined]);
  const offer = offers[0];

  // Turn-by-turn: route from the car to the pickup (before the trip) or the dropoff (during it).
  const target: LatLng | null = ride
    ? ride.status === 'in_progress'
      ? { lat: ride.dropoff_lat, lng: ride.dropoff_lng }
      : { lat: ride.pickup_lat, lng: ride.pickup_lng }
    : null;
  const route = useRoute(loc.coords, target, 15_000);
  // The route is re-requested from the car's current position, so step 0 is "depart" and step 1 is the next maneuver.
  const nextStep = route.data ? route.data.steps[1] ?? route.data.steps[0] : undefined;

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];
    if (loc.coords) list.push({ id: 'me', coord: loc.coords, kind: 'driver' });
    if (ride) {
      list.push({ id: 'pickup', coord: { lat: ride.pickup_lat, lng: ride.pickup_lng }, kind: 'pickup' });
      list.push({ id: 'dropoff', coord: { lat: ride.dropoff_lat, lng: ride.dropoff_lng }, kind: 'dropoff' });
    } else if (offer) {
      list.push({ id: 'pickup', coord: { lat: offer.ride.pickup_lat, lng: offer.ride.pickup_lng }, kind: 'pickup' });
    }
    return list;
  }, [loc.coords, ride, offer]);

  const action = ride ? NEXT_ACTION[ride.status] : undefined;
  const canCancel = ride?.status === 'accepted' || ride?.status === 'arrived';

  return (
    <View className="screen">
      <RideMap center={loc.coords} markers={markers} path={ride ? route.data?.path : undefined} />

      <View className="absolute inset-x-4 top-12 flex-row items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-lg md:left-auto md:w-80">
        <View>
          <Text className="font-heading text-base text-asphalt">{online ? 'You are online' : 'You are offline'}</Text>
          <Text className="font-body text-xs text-asphalt-mute">
            {!approved ? 'Waiting for account approval' : online ? 'Looking for nearby rides' : 'Go online to get rides'}
          </Text>
        </View>
        <Switch
          accessibilityLabel="Online status"
          value={online}
          disabled={!approved || setOnline.isPending || Boolean(ride)}
          onValueChange={(v) => setOnline.mutate(v)}
          trackColor={{ true: colors.go, false: colors.line }}
        />
      </View>

      {loc.error ? (
        <View className="absolute inset-x-4 top-32 md:left-auto md:w-80">
          <Banner tone="error">{loc.error}</Banner>
        </View>
      ) : null}

      {ride ? (
        <Sheet>
          <Text className="font-display text-xl text-asphalt">{DRIVER_STATUS_LABEL[ride.status]}</Text>
          {nextStep ? (
            <View className="rounded-2xl bg-asphalt p-4">
              <Text className="font-heading text-base text-paper">{nextStep.instruction}</Text>
              {loc.coords ? <Text className="font-body text-sm text-paper/70">in {formatDistance(distanceMeters(loc.coords, nextStep.location))}</Text> : null}
            </View>
          ) : null}
          <Text className="font-body text-sm text-asphalt-mute" numberOfLines={1}>
            {passengerName ?? 'Passenger'} · {ride.status === 'in_progress' ? ride.dropoff_address : ride.pickup_address}
          </Text>
          {status.error ? <Banner tone="error">{status.error.message}</Banner> : null}
          {action ? (
            <Button title={action.label} loading={status.isPending} onPress={() => status.mutate({ rideId: ride.id, status: action.to })} />
          ) : null}
          {canCancel ? (
            <Button title="Cancel ride" variant="ghost" onPress={() => status.mutate({ rideId: ride.id, status: 'cancelled', reason: 'Cancelled by driver' })} />
          ) : null}
        </Sheet>
      ) : offer ? (
        <Sheet>
          <Text className="font-display text-xl text-asphalt">New ride request</Text>
          <Text className="font-display text-3xl text-asphalt">{formatMoney(offer.ride.fare_estimate, offer.ride.currency)}</Text>
          <Text className="font-body text-sm text-asphalt-mute">
            {formatDistance(offer.pickupM)} to pickup · {formatDistance(offer.ride.distance_m)} trip
          </Text>
          <Text className="font-body text-base text-asphalt" numberOfLines={1}>{offer.ride.pickup_address}</Text>
          <Text className="font-body text-base text-asphalt-mute" numberOfLines={1}>to {offer.ride.dropoff_address}</Text>
          {accept.error ? <Banner tone="error">{accept.error.message}</Banner> : null}
          <View className="flex-row gap-3">
            <Button className="flex-1" title="Decline" variant="ghost" onPress={() => setDeclined(new Set([...declined, offer.ride.id]))} />
            <Button className="flex-1" title="Accept" loading={accept.isPending} onPress={() => accept.mutate(offer.ride.id)} />
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}
