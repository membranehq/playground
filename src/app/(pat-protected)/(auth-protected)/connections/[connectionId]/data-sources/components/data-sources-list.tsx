'use client';

import {
  useDataSources,
  useConnection,
  useIntegrationApp,
} from '@membranehq/react';

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

export function DataSourcesList({ connectionId }: { connectionId: string }) {
  const client = useIntegrationApp();
  const { connection } = useConnection(connectionId);
  const { dataSources, loading, error } = useDataSources({ connectionId });

  return (
    <div className='rounded-md border border-neutral-800'>
      <Table>
        <TableHeader>
          <TableRow className='border-neutral-800'>
            <TableHead>Name & Key</TableHead>
            <TableHead>Configure</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataSources.length === 0 && !loading && !error && (
            <TableRow className='border-neutral-800'>
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
              <TableRow key={source.id} className='border-neutral-800'>
                <TableCell className='font-medium'>
                  {source.name} <Badge variant='secondary'>{source.key}</Badge>
                </TableCell>
                <TableCell className='flex gap-2'>
                  <Button
                    variant='outline'
                    className='border-neutral-700 hover:border-neutral-600'
                    onClick={() => {
                      if (source.key && connection?.id) {
                        client
                          .connection(connection.id)
                          .dataSource(source.key)
                          .openConfiguration();
                      }
                    }}
                  >
                    <Cog className='h-4 w-4' /> Configure with prebuilt UI
                  </Button>

                  <DataSourceConfigurationTrigger
                    dataSourceId={source.id}
                    connectionId={connectionId}
                  />
                </TableCell>
              </TableRow>
            ))}
          </>

          {loading &&
            Array.from({ length: 3 }).map((_, index) => (
              <TableRow key={index} className='border-neutral-800'>
                <TableCell>
                  <Skeleton className='h-6 w-[200px]' />
                </TableCell>
                <TableCell>
                  <Skeleton className='h-6 w-[100px]' />
                </TableCell>
              </TableRow>
            ))}

          {error && (
            <TableRow className='border-neutral-800'>
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
