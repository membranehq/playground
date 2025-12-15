import { IntegrationList } from './components/integrations-list';

export default function Integrations() {
  return (
    <div className='px-6 py-6'>
      <div className='flex flex-col gap-1'>
        <h1 className='text-2xl font-semibold text-neutral-100'>
          Integrations
        </h1>
        <p className='text-sm text-neutral-500'>
          Manage your connections and connect to new integrations
        </p>
      </div>
      <IntegrationList />
    </div>
  );
}
