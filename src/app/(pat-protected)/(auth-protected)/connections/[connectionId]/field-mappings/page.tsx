import { Metadata } from 'next';
import { FieldMappingsList } from './components/field-mappings-list';

export const metadata: Metadata = {
  title: 'Field Mappings',
};

export default async function FieldMappings({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;

  return (
    <div className='px-6 py-6 flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold text-neutral-100'>Field Mappings</h1>
      <FieldMappingsList connectionId={connectionId} />
    </div>
  );
}
