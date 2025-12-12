'use client';

import { Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ExecuteFlowModal } from './execute-flow-modal';

export function FlowExecutionTrigger({ flowId }: { flowId: string }) {
  return (
    <>
      <ExecuteFlowModal id={flowId}>
        <Button size='xs' variant='outline'>
          <Play /> Run flow
        </Button>
      </ExecuteFlowModal>
    </>
  );
}
