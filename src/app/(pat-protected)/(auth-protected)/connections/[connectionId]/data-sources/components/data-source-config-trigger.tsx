'use client';

import { TextCursorInput } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfigureDataSourceModal } from './configure-data-source-modal';

export function DataSourceConfigurationTrigger({
  dataSourceId,
  connectionId,
}: {
  dataSourceId: string;
  connectionId: string;
}) {
  return (
    <ConfigureDataSourceModal id={dataSourceId} connectionId={connectionId}>
      <Button variant='outline' className='border-neutral-300 hover:border-neutral-400'>
        <TextCursorInput className='h-4 w-4' /> Configure with custom UI
      </Button>
    </ConfigureDataSourceModal>
  );
}
