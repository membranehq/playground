'use client';

import { usePathname } from 'next/navigation';
import { LinkCard } from './link-card';
import { useActions } from '@integration-app/react';

export const ActionsCard = ({
  integrationId,
  isConencted,
}: {
  integrationId: string;
  isConencted: boolean;
}) => {
  const pathname = usePathname();
  const { actions, loading } = useActions({ integrationId });

  return (
    <LinkCard
      disabled={!isConencted}
      loading={loading}
      href={`${pathname}/actions`}
      itemName='Actions'
      itemsCount={actions?.length}
    />
  );
};
