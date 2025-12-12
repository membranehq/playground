'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

import { cn } from '@/lib/utils';
import { cva, VariantProps } from 'class-variance-authority';

const avatarVariants = cva('relative flex shrink-0 overflow-hidden', {
  variants: {
    variant: {
      round: 'rounded-full',
      square: 'rounded-lg',
    },
    size: {
      default: 'size-8',
      sm: 'size-6',
      lg: 'size-10',
    },
  },
  defaultVariants: {
    variant: 'round',
    size: 'default',
  },
});

function Avatar({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> &
  VariantProps<typeof avatarVariants>) {
  return (
    <AvatarPrimitive.Root
      data-slot='avatar'
      className={cn(avatarVariants({ variant, size }), className)}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot='avatar-image'
      className={cn('aspect-square size-full', className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback> &
  VariantProps<typeof avatarVariants>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot='avatar-fallback'
      className={cn(
        'bg-muted flex size-full items-center justify-center',
        avatarVariants({ variant, size }),
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
