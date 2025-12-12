import { useActions, useIntegration } from '@integration-app/react';
import { AlertCircle, Play } from 'lucide-react';
import { useParams } from 'next/navigation';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const ActionsSection = () => {
  const { fieldMappingKey, integrationKey } = useParams<{
    fieldMappingKey: string;
    integrationKey: string;
  }>();
  const { integration } = useIntegration(integrationKey);
  const {
    actions,
    loading: actionLoading,
    error: actionsError,
  } = useActions({
    integrationId: integration?.id,
  });

  const relatedActions = actions.filter((action) => {
    if (typeof action.config === 'object') {
      return action.config.fieldMapping?.key === fieldMappingKey;
    }
    return false;
  });

  return (
    <>
      <h2 className='text-xl font-bold inline-flex gap-1 items-center'>
        <Play /> Actions
      </h2>
      <div className='grid grid-cols-2 xl:grid-cols-4 gap-4'>
        {!actionLoading && !actionsError && !relatedActions.length && (
          <p>This field mapping has no related actions.</p>
        )}

        {!actionLoading && actionsError && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to fetch related actions.
            </AlertDescription>
          </Alert>
        )}

        {relatedActions.map((action) => (
          <Card key={action.id} className='h-full'>
            <CardHeader>
              <CardTitle className='flex flex-row gap-1 items-center'>
                {action.name}
              </CardTitle>
              <CardDescription className='overflow-hidden'>
                <Badge
                  variant='secondary'
                  className='max-w-full block truncate'
                >
                  {action.key}
                </Badge>
              </CardDescription>
            </CardHeader>
          </Card>
        ))}

        {actionLoading &&
          Array.from({ length: 3 }, (_, index) => (
            <Card key={index} className='h-full'>
              <CardHeader>
                <CardTitle className='flex flex-row gap-1 items-center'>
                  <Skeleton className='w-3/4 h-4' />
                </CardTitle>
                <CardDescription>
                  <Skeleton className='w-1/5 h-2' />
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
      </div>
    </>
  );
};
