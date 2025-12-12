import { useAction } from '@integration-app/react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ActionConnections({ id }: { id: string }) {
  const { action, loading } = useAction(id);

  const integrations = (action?.appliedToIntegrations || [])
    .map(({ integration }) => integration)
    .filter((_, index) => index < 4);

  const hasMore =
    (action?.appliedToIntegrations?.length || 0) > integrations.length;
  const lengthDiff =
    (action?.appliedToIntegrations?.length || 0) - integrations.length;

  return (
    <div className='flex flex-row -space-x-1'>
      {integrations.map((integration) => (
        <Tooltip key={integration.id}>
          <TooltipTrigger asChild>
            <Avatar size='sm' className='ring-1 ring-border'>
              <AvatarImage src={integration.logoUri} />
              <AvatarFallback size='sm'>{integration.name[0]}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>{integration.name}</TooltipContent>
        </Tooltip>
      ))}

      {hasMore && (
        <Avatar size='sm' className='ring-1 ring-border'>
          <AvatarFallback size='sm'>+{lengthDiff}</AvatarFallback>
        </Avatar>
      )}

      {!integrations.length && !loading && (
        <Badge variant='outline'>None</Badge>
      )}
    </div>
  );
}
