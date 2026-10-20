import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { LatLng, LocationRow } from '@/types/domain';

export type LivePosition = { coord: LatLng; heading: number | null };

/** Latest position of one user, kept fresh via Realtime. RLS decides whether you may see it. */
export function useLiveLocation(userId: string | null | undefined): LivePosition | null {
  const [pos, setPos] = useState<LivePosition | null>(null);

  useEffect(() => {
    if (!userId) {
      setPos(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('locations')
      .select('lat,lng,heading')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setPos({ coord: { lat: data.lat, lng: data.lng }, heading: data.heading });
      });

    const channel = supabase
      .channel(`location:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations', filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Partial<LocationRow>;
          if (typeof row.lat === 'number' && typeof row.lng === 'number') {
            setPos({ coord: { lat: row.lat, lng: row.lng }, heading: row.heading ?? null });
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return pos;
}
