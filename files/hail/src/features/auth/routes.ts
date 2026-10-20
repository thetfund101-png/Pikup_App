import type { UserRole } from '@/types/domain';

export const HOME_BY_ROLE: Record<UserRole, { group: string; path: string }> = {
  passenger: { group: '(passenger)', path: '/(passenger)' },
  driver: { group: '(driver)', path: '/(driver)' },
  admin: { group: '(admin)', path: '/(admin)' },
};
