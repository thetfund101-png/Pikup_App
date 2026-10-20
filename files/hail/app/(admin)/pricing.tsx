import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button, Field } from '@/components/ui';
import { useFareRules, useUpdateFareRule } from '@/features/admin/hooks';
import { VEHICLE_LABEL, type FareRule } from '@/types/domain';

const FIELDS = [
  ['base_fare', 'Base fare'],
  ['per_km', 'Per km'],
  ['per_minute', 'Per minute'],
  ['minimum_fare', 'Minimum fare'],
  ['surge_multiplier', 'Surge multiplier (1 = none)'],
] as const;
type FieldKey = (typeof FIELDS)[number][0];

function RuleCard({ rule }: { rule: FareRule }) {
  const update = useUpdateFareRule();
  const [values, setValues] = useState<Record<FieldKey, string>>({
    base_fare: String(rule.base_fare), per_km: String(rule.per_km), per_minute: String(rule.per_minute),
    minimum_fare: String(rule.minimum_fare), surge_multiplier: String(rule.surge_multiplier),
  });
  const [problem, setProblem] = useState<string | null>(null);

  const save = () => {
    const parsed = Object.fromEntries(FIELDS.map(([k]) => [k, Number(values[k])])) as Record<FieldKey, number>;
    if (Object.values(parsed).some((n) => !Number.isFinite(n) || n < 0)) return setProblem('Enter numbers of 0 or more.');
    if (parsed.surge_multiplier < 1) return setProblem('Surge multiplier must be at least 1.');
    setProblem(null);
    update.mutate({ id: rule.id, ...parsed });
  };

  return (
    <View className="card gap-3">
      <Text className="font-heading text-lg text-asphalt">{VEHICLE_LABEL[rule.vehicle_type]} ({rule.currency})</Text>
      {FIELDS.map(([key, label]) => (
        <Field key={key} label={label} value={values[key]} keyboardType="decimal-pad" onChangeText={(t) => setValues((v) => ({ ...v, [key]: t }))} />
      ))}
      {problem ? <Banner tone="error">{problem}</Banner> : null}
      {update.error ? <Banner tone="error">{update.error.message}</Banner> : null}
      {update.isSuccess ? <Banner>Saved. New requests use these prices.</Banner> : null}
      <Button title="Save pricing" loading={update.isPending} onPress={save} />
    </View>
  );
}

export default function Pricing() {
  const { data = [], isLoading, error } = useFareRules();
  return (
    <SafeAreaView className="screen">
      <FlatList
        data={data}
        keyExtractor={(r) => r.id}
        contentContainerClassName="mx-auto w-full max-w-xl gap-3 p-5"
        ListHeaderComponent={
          <View className="mb-2 gap-3">
            <Text className="title">Fare rules</Text>
            {error ? <Banner tone="error">{error.message}</Banner> : null}
          </View>
        }
        ListEmptyComponent={<Text className="subtitle">{isLoading ? 'Loading…' : 'No active fare rules.'}</Text>}
        renderItem={({ item }) => <RuleCard rule={item} />}
      />
    </SafeAreaView>
  );
}
