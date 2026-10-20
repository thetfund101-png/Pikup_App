import type { ReactNode } from 'react';
import { View } from 'react-native';

/** Bottom sheet on phones; floating card on wide screens (web/tablet). */
export function Sheet({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View
      className={`absolute inset-x-0 bottom-0 gap-3 rounded-t-3xl bg-white px-5 pb-8 pt-3 shadow-lg md:inset-x-auto md:bottom-6 md:left-6 md:w-96 md:rounded-3xl md:pb-5 ${className}`}
    >
      <View className="mb-1 h-1 w-10 self-center rounded-full bg-line md:hidden" />
      {children}
    </View>
  );
}
