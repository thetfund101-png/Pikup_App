import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { LOCATION_TASK } from '@/lib/locationTask';
import { publishLocation } from '@/lib/location';
import { useAuth } from '@/features/auth/AuthProvider';
import type { LatLng } from '@/types/domain';

type Options = {
  enabled: boolean;
  /** Keep publishing when the app is backgrounded (native only). */
  background?: boolean;
  /** Minimum gap between writes to Supabase. */
  minIntervalMs?: number;
  distanceIntervalM?: number;
};

export type DriverLocationState = {
  coords: LatLng | null;
  heading: number | null;
  permission: 'unknown' | 'granted' | 'denied';
  backgroundActive: boolean;
  error: string | null;
};

/**
 * Watches the driver's position while `enabled`, updates local state on every fix, and
 * upserts to Supabase at most once per `minIntervalMs`. On native, also starts a background
 * task so passengers keep seeing the car when the app is minimized.
 */
export function useDriverLocation({
  enabled,
  background = true,
  minIntervalMs = 4000,
  distanceIntervalM = 10,
}: Options): DriverLocationState {
  const { session } = useAuth();
  const userId = session?.user.id;
  const lastSent = useRef(0);
  const [state, setState] = useState<DriverLocationState>({
    coords: null, heading: null, permission: 'unknown', backgroundActive: false, error: null,
  });

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    let startedBackground = false;

    (async () => {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (fg.status !== 'granted') {
        setState((s) => ({ ...s, permission: 'denied', error: 'Allow location access to go online.' }));
        return;
      }
      setState((s) => ({ ...s, permission: 'granted', error: null }));

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: minIntervalMs, distanceInterval: distanceIntervalM },
        (loc) => {
          const { latitude, longitude, heading, speed, accuracy } = loc.coords;
          setState((s) => ({ ...s, coords: { lat: latitude, lng: longitude }, heading: heading ?? null }));
          const now = Date.now();
          if (now - lastSent.current < minIntervalMs) return;
          lastSent.current = now;
          publishLocation(userId, { lat: latitude, lng: longitude, heading, speed, accuracy }).catch((e) =>
            setState((s) => ({ ...s, error: e instanceof Error ? e.message : 'Could not share your location.' })),
          );
        },
      );
      if (cancelled) subscription.remove();

      if (background && Platform.OS !== 'web') {
        const bg = await Location.requestBackgroundPermissionsAsync();
        if (cancelled || bg.status !== 'granted') return;
        await Location.startLocationUpdatesAsync(LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10_000,
          distanceInterval: 25,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'You are online',
            notificationBody: 'Hail is sharing your location so you can receive rides.',
          },
        });
        startedBackground = true;
        if (cancelled) {
          Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => undefined);
          return;
        }
        setState((s) => ({ ...s, backgroundActive: true }));
      }
    })().catch((e) => setState((s) => ({ ...s, error: e instanceof Error ? e.message : 'Location unavailable.' })));

    return () => {
      cancelled = true;
      subscription?.remove();
      if (startedBackground) Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => undefined);
      setState((s) => ({ ...s, backgroundActive: false }));
    };
  }, [enabled, userId, background, minIntervalMs, distanceIntervalM]);

  return state;
}
