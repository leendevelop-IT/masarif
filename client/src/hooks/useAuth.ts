import { prefs } from "@/lib/prefs";
import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

export type AuthUser = { id: number; name: string; email: string };

export function useAuth() {
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const afterSignIn = useCallback(
    (user: AuthUser) => {
      utils.auth.me.setData(undefined, user);
      utils.finance.dashboard.invalidate();
    },
    [utils]
  );

  const login = trpc.auth.login.useMutation({ onSuccess: afterSignIn });
  const register = trpc.auth.register.useMutation({ onSuccess: afterSignIn });
  const logoutMutation = trpc.auth.logout.useMutation();

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      prefs.setPinUnlocked(false);
      utils.auth.me.setData(undefined, null);
      utils.finance.dashboard.reset();
    }
  }, [logoutMutation, utils]);

  return {
    user: me.data ?? null,
    loading: me.isLoading,
    error: me.error,
    refresh: () => me.refetch(),
    login,
    register,
    logout,
    loggingOut: logoutMutation.isPending,
  };
}
