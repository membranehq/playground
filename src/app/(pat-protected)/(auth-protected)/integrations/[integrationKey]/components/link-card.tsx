import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Info } from 'lucide-react';
import Link from 'next/link';

export const LinkCard = ({
  href,
  itemName,
  description,
  itemsCount,
  disabled,
  loading,
}: {
  href: string;
  itemName: string;
  description?: string;
  itemsCount: number;
  disabled?: boolean;
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

  if (disabled) {
    return (
      <Card className='relative overflow-hidden z-1 h-full'>
        {content}
        <div className='absolute top-0 left-0 w-full h-full rounded-lg overflow-hidden p-1'>
          <div className='flex justify-center items-center p-2 w-full h-full backdrop-blur-[2px]'>
            <span className='bg-card rounded-md text-sm p-3 font-medium'>
              <Info className='size-4 inline' /> Please connect your integration
              to access this feature
            </span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Link href={href} className='no-underline'>
      <Card className='relative group h-full'>{content}</Card>
    </Link>
  );
};

export const LoadingLinkCard = ({ description }: { description?: string }) => {
  return (
    <Card className='relative group'>
      <CardHeader>
        <CardDescription className='group-hover:underline flex flex-row items-center gap-1'>
          <Skeleton className='h-4 w-3/7' />
        </CardDescription>
        <CardTitle>
          <Skeleton className='size-4' />
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
