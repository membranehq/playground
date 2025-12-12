import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDataSource } from '@integration-app/react';
import { DataSource } from '@integration-app/sdk';
import { FileText } from 'lucide-react';

export const DataSourceSection = ({
  dataSourceId,
}: {
  dataSourceId?: DataSource['id'];
}) => {
  const { dataSource } = useDataSource(dataSourceId);

  if (!dataSource) {
    return null;
  }

  return (
    <>
      <h2 className='text-xl font-bold inline-flex gap-1 items-center'>
        <FileText /> Data Source
      </h2>
      <div className='grid grid-cols-2 xl:grid-cols-4 gap-4'>
        <Card className='h-full'>
          <CardHeader>
            <CardTitle className='flex flex-row gap-1 items-center'>
              {dataSource.name}
            </CardTitle>
            <CardDescription className='overflow-hidden'>
              <Badge variant='secondary' className='max-w-full block truncate'>
                {dataSource.key}
              </Badge>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </>
  );
};
