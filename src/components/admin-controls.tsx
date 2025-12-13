'use client';
import { cn } from '@/lib/utils';
import React from 'react';
import { WorkspaceSelect } from './workspace-select';
import { Button } from './ui/button';
import { useClearPat } from './nav-user';
import { LogOut, GithubIcon } from 'lucide-react';

const OFFSET_STYLES =
  'w-auto left-[calc(var(--frame-margin-around)/2)] right-[calc(var(--frame-margin-around)/2)]';

const GITHUB_REPO_URL = 'https://github.com/integration-app/playground';

export function AdminControls() {
  const { clearPat } = useClearPat();

  return (
    <div
      className={cn(
        'h-12 rounded-lg border fixed top-3 p-2 bg-sidebar flex items-center justify-between shadow-xl',
        OFFSET_STYLES,
      )}
    >
      <WorkspaceSelect />
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' asChild>
          <a href={GITHUB_REPO_URL} target='_blank' rel='noopener noreferrer'>
            <GithubIcon className='h-4 w-4' />
            View on GitHub
          </a>
        </Button>
        <Button variant='outline' size='sm' onClick={clearPat}>
          Clear PAT <LogOut />
        </Button>
      </div>
    </div>
  );
}
