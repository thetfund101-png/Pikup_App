import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Banner, Button, Field } from '@/components/ui';
import { useDebounced } from '@/hooks/useDebounced';
import { hasMapboxToken, searchPlaces, type Place } from '@/lib/mapbox';
import type { LatLng } from '@/types/domain';

type Props = { label: string; near?: LatLng | null; onSelect: (p: Place) => void; onCancel: () => void };

export function PlaceSearch({ label, near, onSelect, onCancel }: Props) {
  const [q, setQ] = useState('');
  const debounced = useDebounced(q, 300);
  const { data = [], isFetching, error } = useQuery({
    queryKey: ['places', debounced, near && [near.lat.toFixed(2), near.lng.toFixed(2)]],
    queryFn: ({ signal }) => searchPlaces(debounced, near ?? undefined, signal),
    enabled: hasMapboxToken && debounced.trim().length >= 3,
    staleTime: 60_000,
  });

  return (
    <View className="gap-3">
      <Field label={label} value={q} onChangeText={setQ} autoFocus placeholder="Search for an address or place" />
      {!hasMapboxToken ? <Banner tone="error">Add EXPO_PUBLIC_MAPBOX_TOKEN to search places. You can still tap the map.</Banner> : null}
      {error ? <Banner tone="error">{error.message}</Banner> : null}
      {isFetching ? <Text className="font-body text-sm text-asphalt-mute">Searching…</Text> : null}
      {data.map((p) => (
        <Pressable key={p.id} accessibilityRole="button" onPress={() => onSelect(p)} className="border-b border-line py-3 active:opacity-60">
          <Text className="font-body-medium text-base text-asphalt">{p.name}</Text>
          <Text className="font-body text-sm text-asphalt-mute" numberOfLines={1}>{p.address}</Text>
        </Pressable>
      ))}
      <Button title="Cancel" variant="ghost" onPress={onCancel} />
    </View>
  );
}
