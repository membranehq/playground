'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { ReactNode, useEffect, useState } from 'react';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';

export function AuthProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, login, authMode } = useAuth();
  const { workspace, isLoading: workspaceLoading } = useCurrentWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const [redirectingToLogin, setRedirectingToLogin] = useState(false);

  // Pages that don't require workspace selection
  const isWorkspaceSelectionPage = pathname === '/auth';
  const isPatTokenPage = pathname === '/personal-token';

  // Wait for both auth and workspace to be loaded before making decisions
  const isLoading = authLoading || workspaceLoading;

  // Check if we need workspace selection (after authentication and loading is complete)
  const needsWorkspaceSelection =
    !isLoading && isAuthenticated && !workspace && !isWorkspaceSelectionPage && !isPatTokenPage;

  // Check if we need to login
  const needsLogin = !isLoading && !isAuthenticated && !isPatTokenPage;

  useEffect(() => {
    if (needsLogin && !redirectingToLogin) {
      setRedirectingToLogin(true);
      login(pathname);
    }
  }, [needsLogin, redirectingToLogin, login, pathname]);

  useEffect(() => {
    if (needsWorkspaceSelection) {
      // For PAT mode, workspace selection is on the same page
      if (authMode === 'pat') {
        router.push(`/personal-token?from=${encodeURIComponent(pathname)}`);
      } else {
        router.push(`/auth?from=${encodeURIComponent(pathname)}`);
      }
    }
  }, [needsWorkspaceSelection, pathname, router, authMode]);

  // Show nothing while loading or redirecting
  if (isLoading || redirectingToLogin || needsLogin || needsWorkspaceSelection) {
    return null;
  }

  // Show children if authenticated and workspace selected (or on auth pages)
  return <>{children}</>;
}
