import { useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { canAccessModule, hasPermission, isAdminUser } from '@/core/permissions';
import type { PlatformModule } from '@/core/platform';

export function usePermission() {
  const { user } = useAuth();

  const can = useCallback(
    (permCode: string | string[] | null | undefined) => hasPermission(user, permCode),
    [user]
  );

  const canModule = useCallback(
    (mod: PlatformModule) => canAccessModule(user, mod),
    [user]
  );

  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  return { user, can, canModule, isAdmin, permissions: user?.permissions ?? [] };
}
