'use client';

import { IntegrationProvider } from '@/components/providers/integration-provider';
import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { cn } from '@/lib/utils';
import { CONTENT_HEIGHT, CONTENT_MAX_HEIGHT } from '@/helpers/common-styles';
import { UserAuthProtectedRoute } from '@/components/guards/user-auth-protected-route';
import { FloatingPortalBoundary } from '@membranehq/react';
import { PageHeaderProvider, usePageHeader } from '@/components/page-header-context';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { headerActions } = usePageHeader();

  return (
    <SidebarInset className={cn('overflow-hidden flex flex-col', CONTENT_HEIGHT)}>
      <header className='flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
        <div className='flex items-center gap-2 px-4'>
          <SidebarTrigger className='-ml-1' />
          <Separator
            orientation='vertical'
            className='mr-2 data-[orientation=vertical]:h-4'
          />
          <Breadcrumbs />
        </div>
        {headerActions && (
          <div className='flex items-center gap-4 px-4'>
            {headerActions}
          </div>
        )}
      </header>

      <FloatingPortalBoundary className='flex-1 flex flex-col min-h-0'>
        <div className='flex flex-1 flex-col gap-4 p-4 pt-0 overflow-auto min-h-0'>
          {children}
        </div>
      </FloatingPortalBoundary>
    </SidebarInset>
  );
}

export default function UserAuthProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserAuthProtectedRoute>
      <IntegrationProvider>
        <PageHeaderProvider>
          <SidebarProvider className='min-h-auto'>
            <AppSidebar className={cn('sticky h-full', CONTENT_MAX_HEIGHT)} />
            <LayoutContent>{children}</LayoutContent>
          </SidebarProvider>
        </PageHeaderProvider>
      </IntegrationProvider>
    </UserAuthProtectedRoute>
  );
}
