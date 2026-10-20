import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRoute } from '@/lib/mapbox';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { ACTIVE_RIDE_STATUSES, type LatLng, type Ride } from '@/types/domain';
import {
  cancelRide, estimateFares, fetchActiveRide, fetchNearbyDrivers, fetchRideDriver, fetchRideHistory, requestRide,
} from './api';
import { useRideDraft } from './store';

export const rideKeys = {
  active: (uid: string | undefined) => ['rides', 'active', uid] as const,
  history: (uid: string | undefined) => ['rides', 'history', uid] as const,
};

/** The passenger's live ride. Initial fetch + Realtime pushes straight into the cache. */
export function useActiveRide() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: rideKeys.active(uid),
    queryFn: () => fetchActiveRide(uid as string),
    enabled: Boolean(uid),
  });

  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`rides:passenger:${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides', filter: `passenger_id=eq.${uid}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          const ride = payload.new as Ride;
          qc.setQueryData(rideKeys.active(uid), ACTIVE_RIDE_STATUSES.includes(ride.status) ? ride : null);
          if (!ACTIVE_RIDE_STATUSES.includes(ride.status)) void qc.invalidateQueries({ queryKey: rideKeys.history(uid) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, qc]);

  return query;
}

export function useRideHistory() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({ queryKey: rideKeys.history(uid), queryFn: () => fetchRideHistory(uid as string), enabled: Boolean(uid) });
}

const round = (n: number) => n.toFixed(3); // ~110 m buckets keep route queries from refiring on GPS jitter

export function useRoute(from: LatLng | null, to: LatLng | null, refetchMs?: number) {
  return useQuery({
    queryKey: ['route', from && [round(from.lat), round(from.lng)], to && [round(to.lat), round(to.lng)]],
    queryFn: ({ signal }) => getRoute(from as LatLng, to as LatLng, signal),
    enabled: Boolean(from && to),
    staleTime: refetchMs ?? 5 * 60_000,
    retry: false,
  });
}

export function useFareOptions(distanceM: number | undefined, durationS: number | undefined) {
  return useQuery({
    queryKey: ['fares', distanceM, durationS],
    queryFn: () => estimateFares(distanceM as number, durationS as number),
    enabled: distanceM !== undefined && durationS !== undefined,
  });
}

export function useNearbyDrivers(center: LatLng | null) {
  return useQuery({
    queryKey: ['nearby-drivers', center && [round(center.lat), round(center.lng)]],
    queryFn: () => fetchNearbyDrivers(center as LatLng),
    enabled: Boolean(center),
    refetchInterval: 8000,
  });
}

export function useRideDriver(ride: Ride | null) {
  return useQuery({
    queryKey: ['ride-driver', ride?.driver_id, ride?.vehicle_id],
    queryFn: () => fetchRideDriver(ride?.driver_id as string, ride?.vehicle_id ?? null),
    enabled: Boolean(ride?.driver_id),
  });
}

export function useRequestRide() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const reset = useRideDraft((s) => s.reset);
  return useMutation({
    mutationFn: requestRide,
    onSuccess: (ride) => {
      qc.setQueryData(rideKeys.active(session?.user.id), ride);
      reset();
    },
  });
}

export function useCancelRide() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rideId: string) => cancelRide(rideId, 'Cancelled by passenger'),
    onSuccess: () => qc.setQueryData(rideKeys.active(session?.user.id), null),
  });
}
