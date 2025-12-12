'use client';

import { Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ExecuteActionModal } from './execute-action-modal';

export function ActionExecutionTrigger({ actionId }: { actionId: string }) {
  return (
    <>
      <ExecuteActionModal id={actionId}>
        <Button size='xs' variant='outline'>
          <Play /> Run action
        </Button>
      </ExecuteActionModal>
    </>
  );
}
