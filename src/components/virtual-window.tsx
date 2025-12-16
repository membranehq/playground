'use client';

import { useConsoleEntry } from '@/hooks/use-console-entry';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';

export const VIRTUAL_WINDOW_ID = 'virtual-window';

export function VirtualWindow({ children }: { children: React.ReactNode }) {
  const { orgs = [] } = useConsoleEntry();
  const { workspace } = useCurrentWorkspace();

  const orgName = workspace?.orgId
    ? orgs.find(org => org.id === workspace.orgId)?.name
    : null;

  return (
    <div className='w-full h-full rounded-xl shadow-2xl overflow-hidden bg-background border border-neutral-200'>
      <div className='relative flex items-center justify-center h-[var(--frame-window-header-height)] bg-neutral-100 rounded-t-xl px-3 border-b border-neutral-200'>
        <div className='absolute left-3 flex space-x-2'>
          <div className='w-3 h-3 bg-red-500 rounded-full'></div>
          <div className='w-3 h-3 bg-yellow-500 rounded-full'></div>
          <div className='w-3 h-3 bg-green-500 rounded-full'></div>
        </div>
        {orgName && (
          <span className='text-sm text-neutral-500'>
            Your App ({orgName})
          </span>
        )}
      </div>
      <div className='overflow-hidden h-[calc(100%-var(--frame-window-header-height))] relative bg-background' id={VIRTUAL_WINDOW_ID}>
        {children}
      </div>
    </div>
  );
}
