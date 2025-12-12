import { Metadata } from 'next';
import { OpenClient } from '../../open-client';

export const metadata: Metadata = {
  title: 'Overview',
};

export default function HomePage() {
  return (
    <div className='container mx-auto py-10'>
      <div className='flex flex-col gap-4 mb-10'>
        <div className='flex justify-between items-center'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Overview</h1>
            <p className='text-muted-foreground'>
              Welcome to Integration.app Playground
            </p>
          </div>
        </div>
      </div>

      <OpenClient />
    </div>
  );
}
