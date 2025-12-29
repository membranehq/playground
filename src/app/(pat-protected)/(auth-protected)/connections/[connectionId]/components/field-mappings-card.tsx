'use client';

import { usePathname } from 'next/navigation';
import { LinkCard } from './link-card';
import { useFieldMappings } from '@membranehq/react';

export const FieldMappingsCard = ({ connectionId }: { connectionId: string }) => {
  const pathname = usePathname();
  const { fieldMappings, loading } = useFieldMappings({ connectionId });

  return (
    <LinkCard
      loading={loading}
      href={`${pathname}/field-mappings`}
      itemName="Field Mappings"
      itemsCount={fieldMappings?.length}
    />
  );
};
