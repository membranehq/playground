'use client';

import { useIntegrationApp } from '@integration-app/react';
import { useEffect, useRef } from 'react';

const targetId = 'flow-builder-emdedding';

export const FlowBuilder = ({
  integrationKey,
  flowKey,
}: {
  integrationKey: string;
  flowKey: string;
}) => {
  const targetRef = useRef<HTMLDivElement>(null);

  const client = useIntegrationApp();

  useEffect(() => {
    client
      .flowInstance({ flowKey, integrationKey, autoCreate: true })
      .embedEditor({
        mountTargetSelector: `[data-container-id="${targetId}"]`,
      });
  }, [flowKey, integrationKey, client]);

  return (
    <div
      className='h-full w-full border rounded overflow-hidden'
      data-container-id={targetId}
      ref={targetRef}
    ></div>
  );
};
