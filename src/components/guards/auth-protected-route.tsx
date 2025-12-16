'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { ReactNode, useEffect, useState } from 'react';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';

export function AuthProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, login, authMode } = useAuth();
  const { workspace } = useCurrentWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const [redirecting, setRedirecting] = useState(false);

  // Pages that don't require workspace selection
  const isWorkspaceSelectionPage = pathname === '/auth';
  const isPatTokenPage = pathname === '/personal-token';

  // Check if we need workspace selection (after authentication)
  const needsWorkspaceSelection = isAuthenticated && !workspace && !isWorkspaceSelectionPage && !isPatTokenPage;

  // Check if we need to login
  const needsLogin = !isAuthenticated && !authLoading && !isPatTokenPage;

  useEffect(() => {
    if (needsLogin && !redirecting) {
      setRedirecting(true);
      login(pathname);
    }
  }, [needsLogin, redirecting, login, pathname]);

  useEffect(() => {
    if (needsWorkspaceSelection && typeof window !== 'undefined') {
      // For PAT mode, workspace selection is on the same page
      if (authMode === 'pat') {
        router.push(`/personal-token?from=${encodeURIComponent(pathname)}`);
      } else {
        router.push(`/auth?from=${encodeURIComponent(pathname)}`);
      }
    }
  }, [needsWorkspaceSelection, pathname, router, authMode]);

  // Show nothing while auth is loading or redirecting to login
  if (authLoading || redirecting || needsLogin) {
    return null;
  }

  // Show nothing if we need workspace selection
  if (needsWorkspaceSelection) {
    return null;
  }

  // Show children if authenticated and workspace selected (or on auth pages)
  return <>{children}</>;
}
