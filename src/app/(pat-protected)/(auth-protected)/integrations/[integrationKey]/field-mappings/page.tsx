import { Metadata } from 'next';
import { FieldMappingsList } from './components/field-mappings-list';
import { OpenGhButton } from '@/components/open-gh-button';

export const metadata: Metadata = {
  title: 'Field Mappings',
};

export default async function FieldMappings({
  params,
}: {
  params: Promise<{ integrationKey: string }>;
}) {
  const { integrationKey } = await params;

  return (
    <div className='px-4 py-6 sm:px-0 flex flex-col gap-4'>
      <div className='flex flex-row justify-between items-center'>
        <h1 className='text-3xl font-bold text-foreground'>
          Field Mappings
        </h1>
        <OpenGhButton metaUrl={import.meta.url} />
      </div>
      <FieldMappingsList integrationKey={integrationKey} />
    </div>
  );
}
