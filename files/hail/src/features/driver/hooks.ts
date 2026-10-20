import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import type { RideStatus } from '@/types/domain';
import {
  acceptRide, fetchDriverActiveRide, fetchEarnings, fetchPassengerName, fetchPendingRides, setOnline, updateRideStatus,
} from './api';

/**
 * Pending offers + the driver's current ride. One Realtime channel (RLS-filtered) triggers refetches.
 * Caveat: when another driver claims an offer, Postgres Realtime won't tell you (you lose read access
 * to the row), so we also poll every 10 s and let accept_ride() reject stale offers.
 */
export function useDriverRides(online: boolean) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();

  const pending = useQuery({
    queryKey: ['driver', 'pending'],
    queryFn: fetchPendingRides,
    enabled: online,
    refetchInterval: 10_000,
  });
  const active = useQuery({
    queryKey: ['driver', 'active', uid],
    queryFn: () => fetchDriverActiveRide(uid as string),
    enabled: Boolean(uid),
  });

  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`rides:driver:${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => {
        void qc.invalidateQueries({ queryKey: ['driver'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, qc]);

  return { pending, active };
}

export function useSetOnline() {
  const { session, refreshProfile } = useAuth();
  return useMutation({
    mutationFn: (online: boolean) => setOnline(session?.user.id as string, online),
    onSuccess: () => refreshProfile(),
  });
}

export function useAcceptRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acceptRide,
    onSettled: () => qc.invalidateQueries({ queryKey: ['driver'] }),
  });
}

export function useRideStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, status, reason }: { rideId: string; status: RideStatus; reason?: string }) =>
      updateRideStatus(rideId, status, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driver'] }),
  });
}

export function useEarnings(days: number) {
  return useQuery({ queryKey: ['driver', 'earnings', days], queryFn: () => fetchEarnings(days) });
}

export function usePassengerName(passengerId: string | undefined) {
  return useQuery({
    queryKey: ['passenger-name', passengerId],
    queryFn: () => fetchPassengerName(passengerId as string),
    enabled: Boolean(passengerId),
  });
}
