import { Metadata } from 'next';
import { ActionsList } from './components/actions-list';

export const metadata: Metadata = {
  title: 'Actions',
};

export default async function Actions({ params }: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await params;

  return (
    <div className="px-6 py-6 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-neutral-900">Actions</h1>
      <ActionsList connectionId={connectionId} />
    </div>
  );
}
