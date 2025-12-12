'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useCustomer } from '../providers/customer-provider';

export function UserAuthProtectedRoute({ children }: { children: ReactNode }) {
  const { customerName } = useCustomer();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === '/auth';
  const hasNecessaryDetails = !!customerName;

  useEffect(() => {
    if (!hasNecessaryDetails && !isAuthPage && typeof window !== 'undefined') {
      router.push(`/auth?from=${encodeURIComponent(pathname)}`);
    }
  }, [hasNecessaryDetails, isAuthPage, pathname, router]);

  return hasNecessaryDetails || isAuthPage ? <>{children}</> : null;
}
