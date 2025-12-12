'use client';

import {
  useFlows,
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
import { FlowExecutionTrigger } from './flow-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TextCursorInput, Workflow } from 'lucide-react';
import Link from 'next/link';

export function FlowsList({ integrationKey }: { integrationKey: string }) {
  const client = useIntegrationApp();
  const { integration } = useIntegration(integrationKey);
  const { flows, loading, error } = useFlows({
    integrationId: integration?.id || '',
  });

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name & Key</TableHead>
            <TableHead>Configure</TableHead>
            <TableHead>Run</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flows.length === 0 && !loading && !error && (
            <TableRow>
              <TableCell
                colSpan={4}
                className='text-center text-muted-foreground'
              >
                No flows found
              </TableCell>
            </TableRow>
          )}

          <>
            {flows.map((flow) => (
              <TableRow key={flow.id}>
                <TableCell className='font-medium'>
                  {flow.name} <Badge variant='secondary'>{flow.key}</Badge>
                </TableCell>
                <TableCell className='flex gap-2'>
                  <Button
                    variant='outline'
                    onClick={() => {
                      client
                        .connection(integrationKey)
                        .flow(flow.key)
                        .openConfiguration();
                    }}
                  >
                    <TextCursorInput /> Edit parameters
                  </Button>

                  <Button
                    variant='outline'
                    onClick={() => {
                      client
                        .connection(integrationKey)
                        .flow(flow.key)
                        .openEditor();
                    }}
                  >
                    <Workflow /> Edit flow
                  </Button>

                  <Button variant='outline' asChild>
                    <Link
                      href={`/integrations/${integrationKey}/flows/${flow.key}/builder`}
                    >
                      <Workflow /> Embeded flow editor
                    </Link>
                  </Button>
                </TableCell>
                <TableCell>
                  <FlowExecutionTrigger flowId={flow.id} />
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
                Error loading flows
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
