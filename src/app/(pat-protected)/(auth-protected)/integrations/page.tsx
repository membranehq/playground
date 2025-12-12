import { OpenGhButton } from '@/components/open-gh-button';
import { IntegrationList } from './components/integrations-list';

export default function Integrations() {
  return (
    <div className='px-4 py-6 sm:px-0'>
      <div className='flex flex-row justify-between items-center'>
        <h1 className='text-3xl font-bold text-foreground'>
          Integrations
        </h1>
        <OpenGhButton metaUrl={import.meta.url} />
      </div>
      <IntegrationList />
    </div>
  );
}
