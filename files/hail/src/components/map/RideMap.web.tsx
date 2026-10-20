import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { fitPoints, MARKER_COLOR, type RideMapProps } from './RideMap.types';

mapboxgl.accessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

const EMPTY_LINE: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: [] },
};

function makeDot(color: string, size: number, square: boolean): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `width:${size}px;height:${size}px;background:${color};border:3px solid #fff;border-radius:${
    square ? '4px' : '50%'
  };box-shadow:0 1px 4px rgba(0,0,0,.35)`;
  return el;
}

export default function RideMap({ center, markers, path, onPressMap }: RideMapProps) {
  const host = useRef<View>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loaded = useRef(false);
  const dots = useRef(new Map<string, mapboxgl.Marker>());
  const centered = useRef(false);
  const onPress = useRef(onPressMap);
  onPress.current = onPressMap;

  const whenLoaded = (fn: (map: mapboxgl.Map) => void) => {
    const map = mapRef.current;
    if (!map) return;
    if (loaded.current) fn(map);
    else map.once('load', () => fn(map));
  };

  useEffect(() => {
    const el = host.current as unknown as HTMLElement | null;
    if (!el) return;
    const map = new mapboxgl.Map({
      container: el,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center ? [center.lng, center.lat] : [0, 20],
      zoom: center ? 13 : 1.5,
    });
    mapRef.current = map;
    map.on('load', () => {
      loaded.current = true;
      map.addSource('route', { type: 'geojson', data: EMPTY_LINE });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#1B2A2F', 'line-width': 5 },
      });
    });
    map.on('click', (e) => onPress.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    const markerStore = dots.current;
    return () => {
      map.remove();
      mapRef.current = null;
      loaded.current = false;
      markerStore.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!center || centered.current || !mapRef.current) return;
    centered.current = true;
    mapRef.current.flyTo({ center: [center.lng, center.lat], zoom: 13 });
  }, [center]);

  useEffect(() => {
    whenLoaded((map) => {
      const src = map.getSource('route') as mapboxgl.GeoJSONSource | undefined;
      src?.setData({
        ...EMPTY_LINE,
        geometry: { type: 'LineString', coordinates: (path ?? []).map((p) => [p.lng, p.lat]) },
      });
    });
  }, [path]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    for (const m of markers) {
      seen.add(m.id);
      const existing = dots.current.get(m.id);
      if (existing) existing.setLngLat([m.coord.lng, m.coord.lat]);
      else {
        const dot = new mapboxgl.Marker({
          element: makeDot(MARKER_COLOR[m.kind], m.kind === 'driver' ? 22 : 18, m.kind === 'dropoff'),
        })
          .setLngLat([m.coord.lng, m.coord.lat])
          .addTo(map);
        dots.current.set(m.id, dot);
      }
    }
    dots.current.forEach((dot, id) => {
      if (!seen.has(id)) {
        dot.remove();
        dots.current.delete(id);
      }
    });
  }, [markers]);

  const fit = fitPoints(markers);
  const fitKey = fit.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';');
  useEffect(() => {
    if (fit.length < 2) return;
    const bounds = new mapboxgl.LngLatBounds();
    fit.forEach((p) => bounds.extend([p.lng, p.lat]));
    whenLoaded((map) => map.fitBounds(bounds, { padding: { top: 90, bottom: 340, left: 60, right: 60 }, duration: 600 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return <View ref={host} style={{ flex: 1, width: '100%', height: '100%' }} />;
}
