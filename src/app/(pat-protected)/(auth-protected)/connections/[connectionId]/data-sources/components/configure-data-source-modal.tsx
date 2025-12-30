'use client';

import { DataSourceConfig, IntegrationElementProvider, useDataSourceInstance, useConnection } from '@membranehq/react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export function ConfigureDataSourceModal({
  id,
  connectionId,
  children,
}: {
  id: string;
  connectionId: string;
  children: React.ReactNode;
}) {
  const { connection } = useConnection(connectionId);
  const {
    dataSourceInstance,
    loading: dataSourceLoading,
    error: dataSourceError,
    patch,
  } = useDataSourceInstance({
    dataSourceId: id,
    connectionId,
  });

  return (
    <Dialog modal>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Configure Data Source instance</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 flex-col">
          {!dataSourceLoading && !dataSourceError && dataSourceInstance && (
            <IntegrationElementProvider integrationId={connection?.integrationId} connectionId={connectionId}>
              <DataSourceConfig value={dataSourceInstance} onChange={(value) => patch(value)} />
            </IntegrationElementProvider>
          )}

          {dataSourceLoading && <Skeleton className="w-full h-10" />}

          {dataSourceError && (
            <Alert className="mt-2">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{dataSourceError.message}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
