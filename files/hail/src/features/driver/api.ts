import { supabase } from '@/lib/supabase';
import { DRIVER_ACTIVE_STATUSES, type Ride, type RideStatus } from '@/types/domain';

export async function setOnline(userId: string, online: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ is_online: online }).eq('id', userId);
  if (error) throw error;
}

/** RLS only returns pending rides to approved, online drivers. */
export async function fetchPendingRides(): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides').select('*').eq('status', 'pending').order('requested_at', { ascending: true }).limit(25);
  if (error) throw error;
  return data;
}

export async function fetchDriverActiveRide(userId: string): Promise<Ride | null> {
  const { data, error } = await supabase
    .from('rides').select('*').eq('driver_id', userId).in('status', DRIVER_ACTIVE_STATUSES).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function acceptRide(rideId: string): Promise<Ride> {
  const { data, error } = await supabase.rpc('accept_ride', { p_ride_id: rideId });
  if (error) throw error;
  return data;
}

export async function updateRideStatus(rideId: string, status: RideStatus, reason?: string): Promise<Ride> {
  const { data, error } = await supabase.rpc('set_ride_status', { p_ride_id: rideId, p_status: status, p_reason: reason });
  if (error) throw error;
  return data;
}

export async function fetchEarnings(days: number) {
  const { data, error } = await supabase.rpc('driver_earnings', { p_days: days });
  if (error) throw error;
  return data;
}

export async function fetchPassengerName(passengerId: string): Promise<string | null> {
  const { data, error } = await supabase.from('profiles').select('full_name').eq('id', passengerId).maybeSingle();
  if (error) throw error;
  return data?.full_name ?? null;
}
