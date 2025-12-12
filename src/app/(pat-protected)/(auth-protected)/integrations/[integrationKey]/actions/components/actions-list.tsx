'use client';

import { useActions, useIntegration } from '@integration-app/react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionExecutionTrigger } from './action-menu';
import { Badge } from '@/components/ui/badge';

export function ActionsList({ integrationKey }: { integrationKey: string }) {
  const { integration } = useIntegration(integrationKey);
  const { actions, loading, error } = useActions({
    integrationId: integration?.id || '',
  });

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name & Key</TableHead>
            <TableHead>Execute</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.length === 0 && !loading && (
            <TableRow>
              <TableCell
                colSpan={4}
                className='text-center text-muted-foreground'
              >
                No actions found
              </TableCell>
            </TableRow>
          )}

          <>
            {actions.map((action) => (
              <TableRow key={action.id}>
                <TableCell className='font-medium'>
                  {action.name} <Badge variant='secondary'>{action.key}</Badge>
                </TableCell>
                <TableCell>
                  <ActionExecutionTrigger actionId={action.id} />
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
                Error loading actions
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
