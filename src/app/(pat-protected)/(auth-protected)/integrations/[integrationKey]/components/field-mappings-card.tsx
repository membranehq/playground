'use client';

import { usePathname } from 'next/navigation';
import { LinkCard } from './link-card';
import { useFieldMappings } from '@integration-app/react';

export const FieldMappingsCard = ({
  integrationId,
  isConencted,
}: {
  integrationId: string;
  isConencted: boolean;
}) => {
  const pathname = usePathname();
  const { fieldMappings, loading } = useFieldMappings({ integrationId });

  return (
    <LinkCard
      disabled={!isConencted}
      loading={loading}
      href={`${pathname}/field-mappings`}
      itemName='Field Mappings'
      itemsCount={fieldMappings?.length}
    />
  );
};
