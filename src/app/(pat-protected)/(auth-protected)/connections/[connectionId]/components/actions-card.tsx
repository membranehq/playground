'use client';

import { usePathname } from 'next/navigation';
import { LinkCard } from './link-card';
import { useActions } from '@membranehq/react';

export const ActionsCard = ({
  connectionId,
}: {
  connectionId: string;
}) => {
  const pathname = usePathname();
  const { actions, loading } = useActions({ connectionId });

  return (
    <LinkCard
      loading={loading}
      href={`${pathname}/actions`}
      itemName='Actions'
      itemsCount={actions?.length}
    />
  );
};
