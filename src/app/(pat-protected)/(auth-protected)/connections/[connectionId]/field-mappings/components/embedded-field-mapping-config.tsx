'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Cog } from 'lucide-react';
import { useIntegrationApp } from '@membranehq/react';

export const EmbeddedFieldMappingConfig = ({
  connectionId,
  fieldMappingKey,
}: {
  connectionId: string;
  fieldMappingKey?: string;
}) => {
  const client = useIntegrationApp();

  if (!fieldMappingKey) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant='outline'
          className='border-neutral-700 hover:border-neutral-600'
          onClick={() => {
            client
              .connection(connectionId)
              .fieldMapping(fieldMappingKey)
              .openConfiguration();
          }}
        >
          <Cog className='h-4 w-4' /> Prebuilt UI
        </Button>
      </TooltipTrigger>
      <TooltipContent side='top'>Configure with prebuilt UI</TooltipContent>
    </Tooltip>
  );
};
