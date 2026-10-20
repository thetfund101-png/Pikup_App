import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const container: Record<Variant, string> = {
  primary: 'bg-signal',
  secondary: 'bg-asphalt',
  danger: 'bg-alert',
  ghost: 'border border-line bg-white',
};
const label: Record<Variant, string> = {
  primary: 'text-asphalt',
  secondary: 'text-paper',
  danger: 'text-white',
  ghost: 'text-asphalt',
};

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  className?: string;
};

export function Button({ title, variant = 'primary', loading, disabled, className = '', ...rest }: Props) {
  const inactive = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      className={`h-14 items-center justify-center rounded-2xl px-5 active:opacity-80 ${container[variant]} ${
        inactive ? 'opacity-50' : ''
      } ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'ghost' ? '#1B2A2F' : '#fff'} />
      ) : (
        <Text className={`font-heading text-base ${label[variant]}`}>{title}</Text>
      )}
    </Pressable>
  );
}
