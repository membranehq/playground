'use client';
import { cn } from '@/lib/utils';
import React from 'react';
import { WorkspaceSelect } from './workspace-select';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useAuth } from './providers/auth-provider';
import { useCurrentWorkspace } from './providers/workspace-provider';
import { useSettings } from './providers/settings-provider';
import { LogOut } from 'lucide-react';

const OFFSET_STYLES = 'w-auto left-[calc(var(--frame-margin-around)/2)] right-[calc(var(--frame-margin-around)/2)]';

export function AdminControls() {
  const { logout, authMode } = useAuth();
  const { clearWorkspace } = useCurrentWorkspace();
  const { connectionUIMode, setConnectionUIMode } = useSettings();

  const handleLogout = async () => {
    clearWorkspace();
    await logout();
  };

  const logoutButtonText = authMode === 'pat' ? 'Clear PAT' : 'Log out';

  return (
    <div
      className={cn(
        'h-12 rounded-lg border fixed top-3 p-2 bg-sidebar flex items-center justify-between shadow-xl',
        OFFSET_STYLES,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground whitespace-nowrap">Playground Config</span>
        <Separator orientation="vertical" className="h-6" />
        <WorkspaceSelect />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Connection UI:</span>
          <div className="flex rounded-md border border-neutral-200 bg-neutral-50 p-0.5">
            <button
              onClick={() => setConnectionUIMode('default')}
              className={cn(
                'px-2 py-0.5 text-xs font-medium rounded transition-colors',
                connectionUIMode === 'default'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700',
              )}
            >
              Default
            </button>
            <button
              onClick={() => setConnectionUIMode('custom')}
              className={cn(
                'px-2 py-0.5 text-xs font-medium rounded transition-colors',
                connectionUIMode === 'custom'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700',
              )}
            >
              Custom
            </button>
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        {logoutButtonText} <LogOut />
      </Button>
    </div>
  );
}
