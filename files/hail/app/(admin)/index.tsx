import { useMemo } from 'react';
import { Text, View } from 'react-native';
import RideMap from '@/components/map/RideMap';
import type { MapMarker } from '@/components/map/RideMap.types';
import { Button, Sheet } from '@/components/ui';
import { useLiveFleet, useResolveSos } from '@/features/admin/hooks';

export default function LiveMap() {
  const { onlineDrivers, activeRides, sos } = useLiveFleet();
  const resolve = useResolveSos();

  const markers = useMemo<MapMarker[]>(
    () => [
      ...onlineDrivers.map((d) => ({ id: `driver:${d.location.user_id}`, coord: { lat: d.location.lat, lng: d.location.lng }, kind: 'driver' as const })),
      ...sos
        .filter((s) => s.lat !== null && s.lng !== null)
        .map((s) => ({ id: `sos:${s.id}`, coord: { lat: s.lat as number, lng: s.lng as number }, kind: 'sos' as const })),
    ],
    [onlineDrivers, sos],
  );

  const center = markers[0]?.coord ?? null;
  const openSos = sos[0];

  return (
    <View className="screen">
      <RideMap center={center} markers={markers} />

      <View className="absolute inset-x-4 top-12 flex-row justify-around rounded-2xl bg-white px-4 py-3 shadow-lg md:left-auto md:w-96">
        {[
          ['Drivers online', onlineDrivers.length],
          ['Active rides', activeRides.length],
          ['SOS alerts', sos.length],
        ].map(([label, value]) => (
          <View key={label} className="items-center">
            <Text className={`font-display text-2xl ${label === 'SOS alerts' && Number(value) > 0 ? 'text-alert' : 'text-asphalt'}`}>{value}</Text>
            <Text className="font-body text-xs text-asphalt-mute">{label}</Text>
          </View>
        ))}
      </View>

      {openSos ? (
        <Sheet>
          <Text className="font-display text-xl text-alert">SOS alert</Text>
          <Text className="font-body text-sm text-asphalt-mute">
            Sent {new Date(openSos.created_at).toLocaleTimeString()}
            {openSos.lat !== null ? ` · ${openSos.lat.toFixed(4)}, ${openSos.lng?.toFixed(4)}` : ' · location unavailable'}
          </Text>
          <Button title="Mark as handled" variant="secondary" loading={resolve.isPending} onPress={() => resolve.mutate(openSos.id)} />
        </Sheet>
      ) : null}
    </View>
  );
}
