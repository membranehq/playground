import { Metadata } from 'next';
import { FlowsList } from './components/flows-list';

export const metadata: Metadata = {
  title: 'Flows',
};

export default async function Flows({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;

  return (
    <div className='px-6 py-6 flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold text-neutral-100'>Flows</h1>
      <FlowsList connectionId={connectionId} />
    </div>
  );
}
