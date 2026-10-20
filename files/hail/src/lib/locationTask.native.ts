import * as TaskManager from 'expo-task-manager';
import type { LocationObject } from 'expo-location';
import { publishLocation } from './location';
import { supabase } from './supabase';

export const LOCATION_TASK = 'hail-driver-location';

// Must be defined at module scope so it's registered before the OS wakes the app in the background.
TaskManager.defineTask<{ locations: LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return;
  const last = data.locations[data.locations.length - 1];
  if (!last) return;
  try {
    await publishLocation(auth.session.user.id, {
      lat: last.coords.latitude,
      lng: last.coords.longitude,
      heading: last.coords.heading,
      speed: last.coords.speed,
      accuracy: last.coords.accuracy,
    });
  } catch (e) {
    console.warn('Background location publish failed', e);
  }
});
