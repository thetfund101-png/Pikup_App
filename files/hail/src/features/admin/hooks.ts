import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  ACTIVE_RIDE_STATUSES, type DocumentStatus, type FareRule, type LocationRow, type Profile,
} from '@/types/domain';

const STALE_MS = 2 * 60_000;

/** Online drivers' positions (Realtime), active rides, and open SOS alerts. */
export function useLiveFleet() {
  const qc = useQueryClient();
  const [locations, setLocations] = useState<ReadonlyMap<string, LocationRow>>(new Map());
  const [now, setNow] = useState(Date.now());

  const drivers = useQuery({
    queryKey: ['admin', 'drivers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'driver');
      if (error) throw error;
      return data;
    },
  });
  const rides = useQuery({
    queryKey: ['admin', 'active-rides'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rides').select('id,status').in('status', ACTIVE_RIDE_STATUSES);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });
  const sos = useQuery({
    queryKey: ['admin', 'sos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sos_events').select('*').is('resolved_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    let cancelled = false;
    supabase.from('locations').select('*').then(({ data }) => {
      if (!cancelled && data) setLocations(new Map(data.map((l) => [l.user_id, l])));
    });
    const channel = supabase
      .channel('admin:fleet')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, (payload) => {
        if (payload.eventType === 'DELETE') return;
        const row = payload.new as LocationRow;
        setLocations((prev) => new Map(prev).set(row.user_id, row));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => {
        void qc.invalidateQueries({ queryKey: ['admin', 'active-rides'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_events' }, () => {
        void qc.invalidateQueries({ queryKey: ['admin', 'sos'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        void qc.invalidateQueries({ queryKey: ['admin', 'drivers'] });
      })
      .subscribe();
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      cancelled = true;
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const onlineDrivers = useMemo(() => {
    const online = new Map<string, Profile>((drivers.data ?? []).filter((d) => d.is_online).map((d) => [d.id, d]));
    return [...locations.values()]
      .filter((l) => online.has(l.user_id) && now - new Date(l.recorded_at).getTime() < STALE_MS)
      .map((l) => ({ location: l, profile: online.get(l.user_id) as Profile }));
  }, [drivers.data, locations, now]);

  return { onlineDrivers, activeRides: rides.data ?? [], sos: sos.data ?? [] };
}

export function useResolveSos() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sos_events').update({ resolved_at: new Date().toISOString(), resolved_by: session?.user.id }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sos'] }),
  });
}

export function useFleet() {
  return useQuery({
    queryKey: ['admin', 'fleet'],
    queryFn: async () => {
      const [d, v] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'driver').order('created_at', { ascending: false }),
        supabase.from('vehicles').select('*'),
      ]);
      if (d.error) throw d.error;
      if (v.error) throw v.error;
      return d.data.map((driver) => ({ driver, vehicles: v.data.filter((x) => x.driver_id === driver.id) }));
    },
  });
}

export function useSetApproved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase.from('profiles').update({ is_approved: approved }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function usePendingDocuments() {
  return useQuery({
    queryKey: ['admin', 'documents'],
    queryFn: async () => {
      const [docs, names] = await Promise.all([
        supabase.from('driver_documents').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
        supabase.from('profiles').select('id,full_name').eq('role', 'driver'),
      ]);
      if (docs.error) throw docs.error;
      if (names.error) throw names.error;
      const byId = new Map(names.data.map((n) => [n.id, n.full_name]));
      return docs.data.map((doc) => ({ doc, driverName: byId.get(doc.driver_id) ?? 'Unnamed driver' }));
    },
  });
}

export function useReviewDocument() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: Exclude<DocumentStatus, 'pending'>; reason?: string }) => {
      const { error } = await supabase.from('driver_documents').update({
        status, rejection_reason: status === 'rejected' ? reason ?? 'Rejected by admin' : null,
        reviewed_by: session?.user.id, reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'documents'] }),
  });
}

export async function signedDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('driver-documents').createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

export function useFareRules() {
  return useQuery({
    queryKey: ['admin', 'fare-rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fare_rules').select('*').eq('is_active', true).order('vehicle_type');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateFareRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Pick<FareRule, 'id' | 'base_fare' | 'per_km' | 'per_minute' | 'minimum_fare' | 'surge_multiplier'>) => {
      const { id, ...patch } = rule;
      const { error } = await supabase.from('fare_rules').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'fare-rules'] }),
  });
}
