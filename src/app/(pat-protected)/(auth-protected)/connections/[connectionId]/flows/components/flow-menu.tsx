'use client';

import { Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ExecuteFlowModal } from './execute-flow-modal';

export function FlowExecutionTrigger({ flowId }: { flowId: string }) {
  return (
    <>
      <ExecuteFlowModal id={flowId}>
        <Button size="xs" variant="outline" className="border-neutral-300 hover:border-neutral-400">
          <Play className="h-3 w-3" /> Run flow
        </Button>
      </ExecuteFlowModal>
    </>
  );
}
