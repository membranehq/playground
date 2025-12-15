import { Metadata } from 'next';
import { FlowBuilder } from './components/builder';

export const metadata: Metadata = {
  title: 'Flow builder',
};

export default async function FlowBuilderPage({
  params,
}: {
  params: Promise<{ connectionId: string; flowKey: string }>;
}) {
  const { connectionId, flowKey } = await params;

  return (
    <div className='px-6 py-6 flex flex-col gap-4 h-full w-full'>
      <h1 className='text-2xl font-semibold text-neutral-900'>Flow builder</h1>
      <FlowBuilder connectionId={connectionId} flowKey={flowKey} />
    </div>
  );
}
