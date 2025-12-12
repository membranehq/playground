'use client';

import { TextCursorInput } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfigureFieldMappingModal } from './configure-field-mapping-modal';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function CustomFieldMappingConfig({
  fieldMappingId,
  integrationId,
}: {
  fieldMappingId: string;
  integrationId?: string;
}) {
  return (
    <Tooltip>
      <ConfigureFieldMappingModal
        fieldMappingId={fieldMappingId}
        integrationId={integrationId}
      >
        <TooltipTrigger asChild>
          <Button variant='outline'>
            <TextCursorInput /> Custom UI
          </Button>
        </TooltipTrigger>
      </ConfigureFieldMappingModal>
      <TooltipContent side='top'>Configure with custom UI</TooltipContent>
    </Tooltip>
  );
}
