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
  connectionId,
}: {
  fieldMappingId: string;
  connectionId: string;
}) {
  return (
    <Tooltip>
      <ConfigureFieldMappingModal
        fieldMappingId={fieldMappingId}
        connectionId={connectionId}
      >
        <TooltipTrigger asChild>
          <Button variant='outline' className='border-neutral-700 hover:border-neutral-600'>
            <TextCursorInput className='h-4 w-4' /> Custom UI
          </Button>
        </TooltipTrigger>
      </ConfigureFieldMappingModal>
      <TooltipContent side='top'>Configure with custom UI</TooltipContent>
    </Tooltip>
  );
}
