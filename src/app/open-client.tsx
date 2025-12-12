'use client';

import { Button } from '@/components/ui/button';
import { useIntegrationApp } from '@integration-app/react';

export const OpenClient = () => {
  const client = useIntegrationApp();

  return (
    <Button
      className='my-2'
      onClick={() => {
        client.open();
      }}
    >
      Open integration app
    </Button>
  );
};
