'use client';

import { usePathname } from 'next/navigation';
import { LinkCard } from './link-card';
import { useDataSources } from '@integration-app/react';

export const DataSourcesCard = ({
  integrationId,
  isConencted,
}: {
  integrationId: string;
  isConencted: boolean;
}) => {
  const pathname = usePathname();
  const { dataSources, loading } = useDataSources({ integrationId });

  return (
    <LinkCard
      disabled={!isConencted}
      loading={loading}
      href={`${pathname}/data-sources`}
      itemName='Data Sources'
      itemsCount={dataSources?.length}
    />
  );
};
