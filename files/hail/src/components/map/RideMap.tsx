import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { fitPoints, MARKER_COLOR, type RideMapProps } from './RideMap.types';

export default function RideMap({ center, markers, path, onPressMap }: RideMapProps) {
  const ref = useRef<MapView>(null);
  const centered = useRef(false);

  useEffect(() => {
    if (!center || centered.current) return;
    centered.current = true;
    ref.current?.animateToRegion(
      { latitude: center.lat, longitude: center.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      400,
    );
  }, [center]);

  const fit = fitPoints(markers);
  const fitKey = fit.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';');
  useEffect(() => {
    if (fit.length < 2) return;
    ref.current?.fitToCoordinates(
      fit.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      { edgePadding: { top: 90, right: 60, bottom: 360, left: 60 }, animated: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return (
    <MapView
      ref={ref}
      style={{ flex: 1 }}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={
        center
          ? { latitude: center.lat, longitude: center.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }
          : { latitude: 0, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 }
      }
      onPress={(e) => {
        const c = e.nativeEvent.coordinate;
        onPressMap?.({ lat: c.latitude, lng: c.longitude });
      }}
      toolbarEnabled={false}
    >
      {path && path.length > 1 ? (
        <Polyline coordinates={path.map((p) => ({ latitude: p.lat, longitude: p.lng }))} strokeWidth={5} strokeColor="#1B2A2F" />
      ) : null}
      {markers.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.coord.lat, longitude: m.coord.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View
            style={{
              width: m.kind === 'driver' ? 22 : 18,
              height: m.kind === 'driver' ? 22 : 18,
              borderRadius: m.kind === 'dropoff' ? 4 : 11,
              backgroundColor: MARKER_COLOR[m.kind],
              borderWidth: 3,
              borderColor: '#fff',
            }}
          />
        </Marker>
      ))}
    </MapView>
  );
}
