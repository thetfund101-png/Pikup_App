import type { LatLng } from '@/types/domain';

export type MapMarkerKind = 'pickup' | 'dropoff' | 'driver' | 'me' | 'sos';
export type MapMarker = { id: string; coord: LatLng; kind: MapMarkerKind };

export type RideMapProps = {
  /** Initial focus. The map recenters once when this first becomes available. */
  center: LatLng | null;
  markers: MapMarker[];
  path?: LatLng[];
  onPressMap?: (coord: LatLng) => void;
};

export const MARKER_COLOR: Record<MapMarkerKind, string> = {
  pickup: '#1F9D6B',
  dropoff: '#1B2A2F',
  driver: '#F5B700',
  me: '#2F6BFF',
  sos: '#D64545',
};

/** Pickup/dropoff points drive auto-fit. Moving markers (drivers) must not. */
export function fitPoints(markers: MapMarker[]): LatLng[] {
  return markers.filter((m) => m.kind === 'pickup' || m.kind === 'dropoff').map((m) => m.coord);
}
