'use client';

import { TextCursorInput } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfigureDataSourceModal } from './configure-data-source-modal';

export function DataSourceConfigurationTrigger({
  dataSourceId,
  integrationId,
}: {
  dataSourceId: string;
  integrationId?: string;
}) {
  return (
    <ConfigureDataSourceModal id={dataSourceId} integrationId={integrationId}>
      <Button variant='outline' onClick={() => {}}>
        <TextCursorInput /> Configure with custom UI
      </Button>
    </ConfigureDataSourceModal>
  );
}
