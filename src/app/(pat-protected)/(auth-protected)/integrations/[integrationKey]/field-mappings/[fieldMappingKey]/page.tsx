'use client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useFieldMappingInstance,
  useIntegration,
} from '@integration-app/react';
import { CircleX } from 'lucide-react';
import { useParams } from 'next/navigation';
import { DataSourceSection } from './components/data-source-section';
import { ActionsSection } from './components/actions-section';
import { FlowsSection } from './components/flows-section';
import { EmbeddedFieldMappingConfig } from '../components/embedded-field-mapping-config';
import { CustomFieldMappingConfig } from '../components/custom-field-mapping-config';
import { OpenGhButton } from '@/components/open-gh-button';

export default function FieldMappingPage() {
  const { fieldMappingKey, integrationKey } = useParams<{
    fieldMappingKey: string;
    integrationKey: string;
  }>();
  const { integration } = useIntegration(integrationKey);

  const { fieldMappingInstance, loading, error } = useFieldMappingInstance({
    fieldMappingKey,
    integrationId: integration?.id,
  });

  if (!loading && !!error) {
    return (
      <div className='px-4 py-6 sm:px-0 flex flex-col gap-4 justify-center items-center h-full'>
        <CircleX className='size-10' />
        <div className='flex flex-col gap-1 items-center'>
          <h1 className='text-lg font-semibold'>
            Failed to load field mapping
          </h1>
          <h2 className='text-md font-normal'>{error.message}</h2>
        </div>
        <OpenGhButton metaUrl={import.meta.url} />
      </div>
    );
  }

  return (
    <div className='px-4 py-6 sm:px-0 flex flex-col gap-4'>
      <div className='flex flex-row justify-between items-center'>
        <h1 className='text-3xl font-bold'>
          {loading && !error && <Skeleton className='w-48 h-8' />}

          {!loading &&
            !error &&
            (fieldMappingInstance?.name || 'Unnamed Field Mapping')}
        </h1>

        <div className='flex gap-1'>
          {fieldMappingInstance?.fieldMapping?.key && (
            <EmbeddedFieldMappingConfig
              integrationKey={integrationKey}
              fieldMappingKey={fieldMappingInstance.fieldMapping.key}
            />
          )}

          {fieldMappingInstance?.fieldMapping?.id && (
            <CustomFieldMappingConfig
              fieldMappingId={fieldMappingInstance.fieldMapping.id}
              integrationId={integration?.id}
            />
          )}
          <OpenGhButton metaUrl={import.meta.url} />
        </div>
      </div>
      {fieldMappingInstance?.fieldMapping?.key && (
        <Badge variant='secondary'>
          {fieldMappingInstance?.fieldMapping?.key}
        </Badge>
      )}

      <DataSourceSection
        dataSourceId={fieldMappingInstance?.dataSourceInstance?.dataSourceId}
      />

      <ActionsSection />

      <FlowsSection />
    </div>
  );
}
