'use client';

import { useFieldMappings, useIntegration } from '@integration-app/react';

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
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { EmbeddedFieldMappingConfig } from './embedded-field-mapping-config';

export function FieldMappingsList({
  integrationKey,
}: {
  integrationKey: string;
}) {
  const { integration } = useIntegration(integrationKey);
  const { fieldMappings, loading, error } = useFieldMappings({
    integrationId: integration?.id || '',
  });

  return (
    <TooltipProvider delayDuration={0}>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name & Key</TableHead>
              <TableHead>Configure</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fieldMappings.length === 0 && !loading && !error && (
              <TableRow>
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
                <TableRow key={fieldMapping.id}>
                  <TableCell className='font-medium'>
                    <div className='flex gap-1'>
                      <Link
                        href={`/integrations/${integrationKey}/field-mappings/${fieldMapping.key}`}
                        className='no-underline group flex gap-1 items-center'
                      >
                        {fieldMapping.name}
                        <Badge variant='secondary'>{fieldMapping.key}</Badge>
                        <ArrowRight className='group-hover:opacity-100 opacity-10 transition-opacity size-4' />
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className='flex gap-2'>
                    <EmbeddedFieldMappingConfig
                      integrationKey={integrationKey}
                      fieldMappingKey={fieldMapping.key}
                    />
                    <CustomFieldMappingConfig
                      fieldMappingId={fieldMapping.id}
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
