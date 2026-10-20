import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { LatLng } from '@/types/domain';

export type CurrentLocation = { coord: LatLng | null; status: 'loading' | 'granted' | 'denied' | 'error' };

/** One-shot foreground position, for passenger pickup defaults. */
export function useCurrentLocation(): CurrentLocation {
  const [state, setState] = useState<CurrentLocation>({ coord: null, status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setState({ coord: null, status: 'denied' });
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setState({ coord: { lat: pos.coords.latitude, lng: pos.coords.longitude }, status: 'granted' });
      } catch {
        if (!cancelled) setState({ coord: null, status: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
