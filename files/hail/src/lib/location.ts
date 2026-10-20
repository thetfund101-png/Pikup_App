import { supabase } from './supabase';

export type PositionUpdate = { lat: number; lng: number; heading?: number | null; speed?: number | null; accuracy?: number | null };

/** Upserts the caller's single latest-position row. Postgres fills `geom` and `recorded_at`. */
export async function publishLocation(userId: string, p: PositionUpdate): Promise<void> {
  const { error } = await supabase.from('locations').upsert(
    {
      user_id: userId,
      lat: p.lat,
      lng: p.lng,
      heading: p.heading != null && p.heading >= 0 ? p.heading : null,
      speed: p.speed ?? null,
      accuracy: p.accuracy ?? null,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}
