import { Metadata } from 'next';
import { DataSourcesList } from './components/data-sources-list';
import { OpenGhButton } from '@/components/open-gh-button';

export const metadata: Metadata = {
  title: 'Data Sources',
};

export default async function DataSources({
  params,
}: {
  params: Promise<{ integrationKey: string }>;
}) {
  const { integrationKey } = await params;

  return (
    <div className='px-4 py-6 sm:px-0 flex flex-col gap-4'>
      <div className='flex flex-row justify-between items-center'>
        <h1 className='text-3xl font-bold text-foreground'>
          Data Sources
        </h1>
        <OpenGhButton metaUrl={import.meta.url} />
      </div>
      <DataSourcesList integrationKey={integrationKey} />
    </div>
  );
}
