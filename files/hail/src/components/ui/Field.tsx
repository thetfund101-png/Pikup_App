import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from './theme';

type Props = TextInputProps & { label: string; error?: string | null };

export function Field({ label, error, className = '', ...props }: Props) {
  return (
    <View className="gap-1.5">
      <Text className="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.asphaltMute}
        className={`h-14 rounded-2xl border bg-white px-4 font-body text-base text-asphalt ${
          error ? 'border-alert' : 'border-line'
        } ${className}`}
        {...props}
      />
      {error ? <Text className="font-body text-sm text-alert">{error}</Text> : null}
    </View>
  );
}
