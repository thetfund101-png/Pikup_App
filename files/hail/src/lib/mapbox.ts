import type { LatLng } from '@/types/domain';

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
export const hasMapboxToken = Boolean(TOKEN);

export type Place = { id: string; name: string; address: string; coord: LatLng };
export type RouteStep = { instruction: string; distanceM: number; location: LatLng };
export type RouteResult = { distanceM: number; durationS: number; path: LatLng[]; steps: RouteStep[] };

type GeocodeResponse = {
  features: {
    geometry: { coordinates: [number, number] };
    properties: { mapbox_id: string; name: string; full_address?: string; place_formatted?: string };
  }[];
};

function toPlace(f: GeocodeResponse['features'][number]): Place {
  const [lng, lat] = f.geometry.coordinates;
  return {
    id: f.properties.mapbox_id,
    name: f.properties.name,
    address: f.properties.full_address ?? f.properties.place_formatted ?? f.properties.name,
    coord: { lat, lng },
  };
}

export async function searchPlaces(query: string, near?: LatLng, signal?: AbortSignal): Promise<Place[]> {
  if (!TOKEN || query.trim().length < 3) return [];
  const params = new URLSearchParams({ q: query.trim(), access_token: TOKEN, limit: '5', autocomplete: 'true' });
  if (near) params.set('proximity', `${near.lng},${near.lat}`);
  const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`, { signal });
  if (!res.ok) throw new Error('Place search failed. Check your connection and try again.');
  return ((await res.json()) as GeocodeResponse).features.map(toPlace);
}

export async function reverseGeocode(c: LatLng): Promise<string> {
  const fallback = `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;
  if (!TOKEN) return fallback;
  try {
    const params = new URLSearchParams({ longitude: String(c.lng), latitude: String(c.lat), access_token: TOKEN, limit: '1' });
    const res = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?${params}`);
    if (!res.ok) return fallback;
    const first = ((await res.json()) as GeocodeResponse).features[0];
    return first ? toPlace(first).address : fallback;
  } catch {
    return fallback;
  }
}

type DirectionsResponse = {
  routes: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs: { steps: { distance: number; maneuver: { instruction: string; location: [number, number] } }[] }[];
  }[];
};

export async function getRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<RouteResult> {
  if (!TOKEN) throw new Error('Add EXPO_PUBLIC_MAPBOX_TOKEN to enable routing.');
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const params = new URLSearchParams({ geometries: 'geojson', overview: 'full', steps: 'true', access_token: TOKEN });
  const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?${params}`, { signal });
  if (!res.ok) throw new Error('Could not calculate a route.');
  const route = ((await res.json()) as DirectionsResponse).routes[0];
  if (!route) throw new Error('No route found between these points.');
  return {
    distanceM: Math.round(route.distance),
    durationS: Math.round(route.duration),
    path: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    steps: route.legs.flatMap((leg) =>
      leg.steps.map((s) => ({
        instruction: s.maneuver.instruction,
        distanceM: s.distance,
        location: { lat: s.maneuver.location[1], lng: s.maneuver.location[0] },
      })),
    ),
  };
}
