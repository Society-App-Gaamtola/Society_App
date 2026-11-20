import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { clearSession } from '@/lib/session';
import { accountApi } from '@/services/account';

/**
 * Logout used by the top bar and the Profile page: DELETE /auth/logout ends this browser's session on the backend,
 * then the local session and every cached page are cleared. Leaves even if the call fails (e.g. server down).
 */
export function useLogout() {
  const router = useRouter();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    await accountApi.logout().catch(() => undefined);
    clearSession();
    client.clear();
    router.replace('/login');
  };
  return { run, busy };
}
