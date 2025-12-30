'use client';

import { usePathname } from 'next/navigation';
import { LinkCard } from './link-card';
import { useDataSources } from '@membranehq/react';

export const DataSourcesCard = ({ connectionId }: { connectionId: string }) => {
  const pathname = usePathname();
  const { dataSources, loading } = useDataSources({ connectionId });

  return (
    <LinkCard
      loading={loading}
      href={`${pathname}/data-sources`}
      itemName="Data Sources"
      itemsCount={dataSources?.length}
    />
  );
};
