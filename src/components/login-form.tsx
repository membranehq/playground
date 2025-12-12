'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCustomer } from './providers/customer-provider';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { setCustomerName, customerName } = useCustomer();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get('from') || '/';

  useEffect(() => {
    if (customerName) {
      router.push(fromPath);
    }
  }, [customerName, router, fromPath]);

  const [email, setEmail] = useState('');

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setCustomerName(email);
        }}
      >
        <div className='flex flex-col gap-6'>
          <div className='flex flex-col items-center gap-2'>
            <h1 className='text-xl font-bold'>
              Welcome to Integration.app Playground
            </h1>
          </div>
          <div className='flex flex-col gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                placeholder='m@example.com'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type='submit' className='w-full'>
              Login
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
