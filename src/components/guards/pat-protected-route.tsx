'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useConsoleAuth } from '@/components/providers/console-auth-provider';
import { ReactNode, useEffect } from 'react';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';

export function PatProtectedRoute({ children }: { children: ReactNode }) {
  const { hasToken } = useConsoleAuth();
  const { workspace } = useCurrentWorkspace();
  const router = useRouter();
  const pathname = usePathname();

  const isTokenPage = pathname === '/personal-token';
  const hasNecessaryDetails = !!hasToken && !!workspace;

  useEffect(() => {
    if (!hasNecessaryDetails && !isTokenPage && typeof window !== 'undefined') {
      router.push(`/personal-token?from=${encodeURIComponent(pathname)}`);
    }
  }, [hasNecessaryDetails, isTokenPage, pathname, router]);

  return hasNecessaryDetails || isTokenPage ? <>{children}</> : null;
}
