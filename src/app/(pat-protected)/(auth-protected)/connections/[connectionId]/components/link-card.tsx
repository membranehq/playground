import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const LinkCard = ({
  href,
  itemName,
  description,
  itemsCount,
  loading,
}: {
  href: string;
  itemName: string;
  description?: string;
  itemsCount: number;
  loading?: boolean;
}) => {
  if (loading) {
    return <LoadingLinkCard description={description} />;
  }

  if (!itemsCount) {
    return null;
  }

  const content = (
    <>
      <CardHeader>
        <CardDescription className='flex flex-row items-center gap-1 text-lg'>
          {itemName}
          <ArrowRight className='group-hover:opacity-100 opacity-10 transition-opacity size-4' />
        </CardDescription>
        <CardTitle>{itemsCount}</CardTitle>
      </CardHeader>
      {description && (
        <CardFooter className='flex-col items-start gap-1 text-sm'>
          <div className='line-clamp-1 flex gap-2 font-medium'>Description</div>
          <div className='text-muted-foreground'>{description}</div>
        </CardFooter>
      )}
    </>
  );

  return (
    <Link href={href} className='no-underline'>
      <Card className='relative group h-full bg-white border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm'>
        {content}
      </Card>
    </Link>
  );
};

export const LoadingLinkCard = ({ description }: { description?: string }) => {
  return (
    <Card className='relative group bg-white border-neutral-200 shadow-sm'>
      <CardHeader>
        <CardDescription className='flex flex-row items-center gap-1'>
          <Skeleton className='h-4 w-20' />
        </CardDescription>
        <CardTitle>
          <Skeleton className='h-6 w-8' />
        </CardTitle>
      </CardHeader>
      {description && (
        <CardFooter className='flex-col items-start gap-1 text-sm w-full'>
          <div className='flex gap-2 font-medium'>Description</div>
          <div className='text-muted-foreground w-full'>{description}</div>
        </CardFooter>
      )}
    </Card>
  );
};
