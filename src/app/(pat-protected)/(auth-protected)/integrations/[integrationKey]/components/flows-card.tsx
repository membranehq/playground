'use client';

import { usePathname } from 'next/navigation';
import { LinkCard } from './link-card';
import { useFlows } from '@membranehq/react';

export const FlowsCard = ({
  integrationId,
  isConencted,
}: {
  integrationId: string;
  isConencted: boolean;
}) => {
  const pathname = usePathname();
  const { flows, loading } = useFlows({ integrationId });

  return (
    <LinkCard
      disabled={!isConencted}
      loading={loading}
      href={`${pathname}/flows`}
      itemName='Flows'
      itemsCount={flows?.length}
    />
  );
};
