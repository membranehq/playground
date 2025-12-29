'use client';

import { useFlows, useIntegrationApp, useConnection } from '@membranehq/react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FlowExecutionTrigger } from './flow-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TextCursorInput, Workflow } from 'lucide-react';
import Link from 'next/link';

export function FlowsList({ connectionId }: { connectionId: string }) {
  const client = useIntegrationApp();
  const { connection } = useConnection(connectionId);
  const { flows, loading, error } = useFlows({ connectionId });

  return (
    <div className="rounded-md border border-neutral-200">
      <Table>
        <TableHeader>
          <TableRow className="border-neutral-200">
            <TableHead>Name & Key</TableHead>
            <TableHead>Configure</TableHead>
            <TableHead>Run</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flows.length === 0 && !loading && !error && (
            <TableRow className="border-neutral-200">
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No flows found
              </TableCell>
            </TableRow>
          )}

          <>
            {flows.map((flow) => (
              <TableRow key={flow.id} className="border-neutral-200">
                <TableCell className="font-medium">
                  {flow.name} <Badge variant="secondary">{flow.key}</Badge>
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={!flow.key}
                    className="border-neutral-300 hover:border-neutral-400"
                    onClick={() => {
                      if (flow.key && connection?.id) {
                        client.connection(connection.id).flow(flow.key).openConfiguration();
                      }
                    }}
                  >
                    <TextCursorInput className="h-4 w-4" /> Edit parameters
                  </Button>

                  <Button
                    variant="outline"
                    disabled={!flow.key}
                    className="border-neutral-300 hover:border-neutral-400"
                    onClick={() => {
                      if (flow.key && connection?.id) {
                        client.connection(connection.id).flow(flow.key).openEditor();
                      }
                    }}
                  >
                    <Workflow className="h-4 w-4" /> Edit flow
                  </Button>

                  <Button variant="outline" asChild className="border-neutral-300 hover:border-neutral-400">
                    <Link href={`/connections/${connectionId}/flows/${flow.key}/builder`}>
                      <Workflow className="h-4 w-4" /> Embedded flow editor
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
              <TableRow key={index} className="border-neutral-200">
                <TableCell>
                  <Skeleton className="h-6 w-[200px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-[100px]" />
                </TableCell>
              </TableRow>
            ))}

          {error && (
            <TableRow className="border-neutral-200">
              <TableCell colSpan={4} className="text-center text-red-500">
                Error loading flows
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
