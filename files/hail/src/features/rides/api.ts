import { supabase } from '@/lib/supabase';
import {
  ACTIVE_RIDE_STATUSES, VEHICLE_TYPES,
  type LatLng, type Profile, type Ride, type Vehicle, type VehicleType,
} from '@/types/domain';

export type PlaceRef = { coord: LatLng; address: string };

export async function fetchActiveRide(userId: string): Promise<Ride | null> {
  const { data, error } = await supabase
    .from('rides').select('*')
    .eq('passenger_id', userId).in('status', ACTIVE_RIDE_STATUSES)
    .order('requested_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchRideHistory(userId: string): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides').select('*')
    .eq('passenger_id', userId).in('status', ['completed', 'cancelled'])
    .order('requested_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data;
}

export type RideRequestInput = {
  pickup: PlaceRef; dropoff: PlaceRef; distanceM: number; durationS: number; vehicleType: VehicleType;
};

export async function requestRide(i: RideRequestInput): Promise<Ride> {
  const { data, error } = await supabase.rpc('request_ride', {
    p_pickup_lat: i.pickup.coord.lat, p_pickup_lng: i.pickup.coord.lng, p_pickup_address: i.pickup.address,
    p_dropoff_lat: i.dropoff.coord.lat, p_dropoff_lng: i.dropoff.coord.lng, p_dropoff_address: i.dropoff.address,
    p_distance_m: i.distanceM, p_duration_s: i.durationS, p_vehicle_type: i.vehicleType,
  });
  if (error) {
    // 23505 = the one-active-ride-per-passenger index
    if (error.code === '23505') throw new Error('You already have a ride in progress.');
    throw error;
  }
  return data;
}

export async function cancelRide(rideId: string, reason?: string): Promise<Ride> {
  const { data, error } = await supabase.rpc('set_ride_status', { p_ride_id: rideId, p_status: 'cancelled', p_reason: reason });
  if (error) throw error;
  return data;
}

export type FareOption = { vehicleType: VehicleType; fare: number; currency: string; surge: number };

export async function estimateFares(distanceM: number, durationS: number): Promise<FareOption[]> {
  const rows = await Promise.all(
    VEHICLE_TYPES.map(async (vehicleType): Promise<FareOption | null> => {
      const { data, error } = await supabase.rpc('estimate_fare', {
        p_distance_m: distanceM, p_duration_s: durationS, p_vehicle_type: vehicleType,
      });
      if (error) throw error;
      const r = data[0];
      return r ? { vehicleType, fare: r.fare, currency: r.currency, surge: r.surge_multiplier } : null;
    }),
  );
  return rows.filter((r): r is FareOption => r !== null);
}

export type NearbyDriver = { driver_id: string; lat: number; lng: number; heading: number | null; distance_m: number };

export async function fetchNearbyDrivers(center: LatLng): Promise<NearbyDriver[]> {
  const { data, error } = await supabase.rpc('nearby_drivers', { p_lat: center.lat, p_lng: center.lng, p_radius_m: 5000 });
  if (error) throw error;
  return data;
}

export async function fetchRideDriver(driverId: string, vehicleId: string | null): Promise<{ profile: Profile | null; vehicle: Vehicle | null }> {
  const [p, v] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', driverId).maybeSingle(),
    vehicleId ? supabase.from('vehicles').select('*').eq('id', vehicleId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (p.error) throw p.error;
  if (v.error) throw v.error;
  return { profile: p.data, vehicle: v.data };
}

export async function sendSos(userId: string, rideId: string | null, at: LatLng | null): Promise<void> {
  const { error } = await supabase.from('sos_events').insert({
    user_id: userId, ride_id: rideId, lat: at?.lat ?? null, lng: at?.lng ?? null,
  });
  if (error) throw error;
}
