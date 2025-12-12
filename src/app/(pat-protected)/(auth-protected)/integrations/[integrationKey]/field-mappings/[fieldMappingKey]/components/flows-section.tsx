import { useFlows, useIntegration } from '@integration-app/react';
import { AlertCircle, Workflow } from 'lucide-react';
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

export const FlowsSection = () => {
  const { fieldMappingKey, integrationKey } = useParams<{
    fieldMappingKey: string;
    integrationKey: string;
  }>();
  const { integration } = useIntegration(integrationKey);
  const {
    flows,
    loading: flowsLoading,
    error: flowsError,
  } = useFlows({
    integrationId: integration?.id,
  });

  const relatedFlows = flows.filter((flow) => {
    const config = Object.values(flow.nodes || {}).find((node) => {
      if (!node.config || typeof node.config !== 'object') {
        return false;
      }

      return node.config.fieldMapping?.key === fieldMappingKey;
    });
    return !!config;
  });

  return (
    <>
      <h2 className='text-xl font-bold inline-flex gap-1 items-center'>
        <Workflow /> Flows
      </h2>
      <div className='grid grid-cols-2 xl:grid-cols-4 gap-4'>
        {!flowsLoading && !flowsError && !relatedFlows.length && (
          <p>This field mapping has no related flows.</p>
        )}

        {!flowsLoading && flowsError && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to fetch related flows.</AlertDescription>
          </Alert>
        )}

        {relatedFlows.map((flow) => (
          <Card key={flow.id} className='h-full'>
            <CardHeader>
              <CardTitle className='flex flex-row gap-1 items-center'>
                {flow.name}
              </CardTitle>
              <CardDescription className='overflow-hidden'>
                <Badge
                  variant='secondary'
                  className='max-w-full block truncate'
                >
                  {flow.key}
                </Badge>
              </CardDescription>
            </CardHeader>
          </Card>
        ))}

        {flowsLoading &&
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
