'use client';

import { usePathname } from 'next/navigation';
import { LinkCard } from './link-card';
import { useFlows } from '@membranehq/react';

export const FlowsCard = ({ connectionId }: { connectionId: string }) => {
  const pathname = usePathname();
  const { flows, loading } = useFlows({ connectionId });

  return <LinkCard loading={loading} href={`${pathname}/flows`} itemName="Flows" itemsCount={flows?.length} />;
};
