import { Metadata } from 'next';
import { OpenGhButton } from '@/components/open-gh-button';
import { FlowBuilder } from './components/builder';

export const metadata: Metadata = {
  title: 'Flow builder',
};

export default async function FlowBuilderPage({
  params,
}: {
  params: Promise<{ integrationKey: string; flowKey: string }>;
}) {
  const { integrationKey, flowKey } = await params;

  return (
    <div className='px-4 py-6 sm:px-0 flex flex-col gap-4 h-full w-full'>
      <div className='flex flex-row justify-between items-center'>
        <h1 className='text-3xl font-bold text-foreground'>
          Flow builder
        </h1>
        <OpenGhButton metaUrl={import.meta.url} />
      </div>
      <FlowBuilder integrationKey={integrationKey} flowKey={flowKey} />
    </div>
  );
}
