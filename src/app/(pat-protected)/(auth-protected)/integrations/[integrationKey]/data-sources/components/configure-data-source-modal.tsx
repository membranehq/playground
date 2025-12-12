'use client';

import {
  DataSourceConfig,
  IntegrationElementProvider,
  useDataSourceInstance,
  useIntegration,
} from '@integration-app/react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OpenGhButton } from '@/components/open-gh-button';
import { Skeleton } from '@/components/ui/skeleton';

export function ConfigureDataSourceModal({
  id,
  integrationId,
  children,
}: {
  id: string;
  integrationId?: string;
  children: React.ReactNode;
}) {
  const { integration } = useIntegration(integrationId);
  const {
    dataSourceInstance,
    loading: dataSourceLoading,
    error: dataSourceError,
    patch,
  } = useDataSourceInstance({
    dataSourceId: id,
    connectionId: integration?.connection?.id,
  });

  return (
    <Dialog modal>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <div className='flex flex-row justify-between pr-10 items-baseline'>
            <DialogTitle>Configure Data Source instance</DialogTitle>
            <OpenGhButton metaUrl={import.meta.url} />
          </div>
        </DialogHeader>

        <div className='flex gap-6 flex-col'>
          {!dataSourceLoading && !dataSourceError && dataSourceInstance && (
            <IntegrationElementProvider
              integrationId={integrationId}
              connectionId={integration?.connection?.id}
            >
              <DataSourceConfig
                value={dataSourceInstance}
                onChange={(value) => patch(value)}
              />
            </IntegrationElementProvider>
          )}

          {dataSourceLoading && <Skeleton className='w-full h-10' />}

          {dataSourceError && (
            <Alert className='mt-2'>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{dataSourceError.message}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
