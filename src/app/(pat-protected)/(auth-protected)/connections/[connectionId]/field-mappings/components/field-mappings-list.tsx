'use client';

import { useFieldMappings, useConnection, useIntegrationApp } from '@membranehq/react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomFieldMappingConfig } from './custom-field-mapping-config';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EmbeddedFieldMappingConfig } from './embedded-field-mapping-config';

export function FieldMappingsList({ connectionId }: { connectionId: string }) {
  const { connection } = useConnection(connectionId);
  const { fieldMappings, loading, error } = useFieldMappings({ connectionId });

  return (
    <TooltipProvider delayDuration={0}>
      <div className='rounded-md border border-neutral-200'>
        <Table>
          <TableHeader>
            <TableRow className='border-neutral-200'>
              <TableHead>Name & Key</TableHead>
              <TableHead>Configure</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fieldMappings.length === 0 && !loading && !error && (
              <TableRow className='border-neutral-200'>
                <TableCell
                  colSpan={4}
                  className='text-center text-muted-foreground'
                >
                  No field mappings found
                </TableCell>
              </TableRow>
            )}

            <>
              {fieldMappings.map((fieldMapping) => (
                <TableRow key={fieldMapping.id} className='border-neutral-200'>
                  <TableCell className='font-medium'>
                    <div className='flex gap-1 items-center'>
                      {fieldMapping.name}
                      <Badge variant='secondary'>{fieldMapping.key}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className='flex gap-2'>
                    <EmbeddedFieldMappingConfig
                      connectionId={connectionId}
                      fieldMappingKey={fieldMapping.key}
                    />
                    <CustomFieldMappingConfig
                      fieldMappingId={fieldMapping.id}
                      connectionId={connectionId}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </>

            {loading &&
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index} className='border-neutral-200'>
                  <TableCell>
                    <Skeleton className='h-6 w-[200px]' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-6 w-[100px]' />
                  </TableCell>
                </TableRow>
              ))}

            {error && (
              <TableRow className='border-neutral-200'>
                <TableCell colSpan={4} className='text-center text-red-500'>
                  Error loading field mappings
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
