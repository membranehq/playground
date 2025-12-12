'use client';

import {
  useDataSources,
  useIntegration,
  useIntegrationApp,
} from '@integration-app/react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DataSourceConfigurationTrigger } from './data-source-config-trigger';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cog } from 'lucide-react';

export function DataSourcesList({
  integrationKey,
}: {
  integrationKey: string;
}) {
  const client = useIntegrationApp();
  const { integration } = useIntegration(integrationKey);
  const { dataSources, loading, error } = useDataSources({
    integrationId: integration?.id || '',
  });

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name & Key</TableHead>
            <TableHead>Configure</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataSources.length === 0 && !loading && !error && (
            <TableRow>
              <TableCell
                colSpan={4}
                className='text-center text-muted-foreground'
              >
                No data sources found
              </TableCell>
            </TableRow>
          )}

          <>
            {dataSources.map((source) => (
              <TableRow key={source.id}>
                <TableCell className='font-medium'>
                  {source.name} <Badge variant='secondary'>{source.key}</Badge>
                </TableCell>
                <TableCell className='flex gap-2'>
                  <Button
                    variant='outline'
                    onClick={() => {
                      client
                        .connection(integrationKey)
                        .dataSource(source.key)
                        .openConfiguration();
                    }}
                  >
                    <Cog /> Configure with prebuilt UI
                  </Button>

                  <DataSourceConfigurationTrigger
                    dataSourceId={source.id}
                    integrationId={integration?.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </>

          {loading &&
            Array.from({ length: 3 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className='h-6 w-[200px]' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-6 w-[100px]' />
                </TableCell>
              </TableRow>
            ))}

          {error && (
            <TableRow>
              <TableCell colSpan={4} className='text-center text-red-500'>
                Error loading data sources
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
