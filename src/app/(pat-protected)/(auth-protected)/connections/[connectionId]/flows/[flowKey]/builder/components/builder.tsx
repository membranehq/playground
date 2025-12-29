'use client';

import { useIntegrationApp } from '@membranehq/react';
import { useEffect, useRef } from 'react';

const targetId = 'flow-builder-embedding';

export const FlowBuilder = ({ connectionId, flowKey }: { connectionId: string; flowKey: string }) => {
  const targetRef = useRef<HTMLDivElement>(null);

  const client = useIntegrationApp();

  useEffect(() => {
    client.flowInstance({ flowKey, connectionId, autoCreate: true }).embedEditor({
      mountTargetSelector: `[data-container-id="${targetId}"]`,
    });
  }, [flowKey, connectionId, client]);

  return (
    <div
      className="h-full w-full border border-neutral-200 rounded overflow-hidden"
      data-container-id={targetId}
      ref={targetRef}
    ></div>
  );
};
