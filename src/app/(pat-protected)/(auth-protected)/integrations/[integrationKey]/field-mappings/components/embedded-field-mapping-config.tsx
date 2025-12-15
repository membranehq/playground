import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Cog } from 'lucide-react';
import { useIntegrationApp } from '@membranehq/react';

export const EmbeddedFieldMappingConfig = ({
  integrationKey,
  fieldMappingKey,
}: {
  integrationKey: string;
  fieldMappingKey?: string;
}) => {
  const client = useIntegrationApp();

  if (!fieldMappingKey) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant='outline'
          onClick={() => {
            client
              .connection(integrationKey)
              .fieldMapping(fieldMappingKey)
              .openConfiguration();
          }}
        >
          <Cog /> Prebuilt UI
        </Button>
      </TooltipTrigger>
      <TooltipContent side='top'>Configure with prebuilt UI</TooltipContent>
    </Tooltip>
  );
};
