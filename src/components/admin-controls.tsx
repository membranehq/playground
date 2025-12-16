'use client';
import { cn } from '@/lib/utils';
import React from 'react';
import { WorkspaceSelect } from './workspace-select';
import { Button } from './ui/button';
import { useAuth } from './providers/auth-provider';
import { useCurrentWorkspace } from './providers/workspace-provider';
import { LogOut } from 'lucide-react';

const OFFSET_STYLES =
  'w-auto left-[calc(var(--frame-margin-around)/2)] right-[calc(var(--frame-margin-around)/2)]';

export function AdminControls() {
  const { logout, authMode } = useAuth();
  const { clearWorkspace } = useCurrentWorkspace();

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
      <WorkspaceSelect />
      <Button variant='outline' size='sm' onClick={handleLogout}>
        {logoutButtonText} <LogOut />
      </Button>
    </div>
  );
}
