import { Metadata } from 'next';
import { DataSourcesList } from './components/data-sources-list';

export const metadata: Metadata = {
  title: 'Data Sources',
};

export default async function DataSources({ params }: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await params;

  return (
    <div className="px-6 py-6 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-neutral-900">Data Sources</h1>
      <DataSourcesList connectionId={connectionId} />
    </div>
  );
}
