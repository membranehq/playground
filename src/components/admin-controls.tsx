'use client';
import { cn } from '@/lib/utils';
import React from 'react';
import { WorkspaceSelect } from './workspace-select';
import { Button } from './ui/button';
import { useClearPat } from './nav-user';
import { LogOut } from 'lucide-react';

const OFFSET_STYLES =
  'w-auto left-[calc(var(--frame-margin-around)/2)] right-[calc(var(--frame-margin-around)/2)]';

export function AdminControls() {
  const { clearPat } = useClearPat();

  return (
    <div
      className={cn(
        'h-14 rounded-lg border border-gray-300 fixed top-10 p-2 bg-sidebar flex items-center justify-between shadow-xl',
        OFFSET_STYLES,
      )}
    >
      <WorkspaceSelect />
      <Button variant='outline' onClick={clearPat}>
        Clear PAT <LogOut />
      </Button>
    </div>
  );
}
