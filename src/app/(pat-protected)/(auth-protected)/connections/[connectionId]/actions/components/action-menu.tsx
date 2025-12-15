'use client';

import { Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ExecuteActionModal } from './execute-action-modal';

export function ActionExecutionTrigger({ actionId }: { actionId: string }) {
  return (
    <>
      <ExecuteActionModal id={actionId}>
        <Button size='xs' variant='outline' className='border-neutral-700 hover:border-neutral-600'>
          <Play className='h-3 w-3' /> Run action
        </Button>
      </ExecuteActionModal>
    </>
  );
}
