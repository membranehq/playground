'use client';

import { ChevronsUpDown, LogOut, User } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useConsoleAuth } from './providers/console-auth-provider';
import { useCurrentWorkspace } from './providers/workspace-provider';
import { useRouter } from 'next/navigation';
import { useCustomer } from './providers/customer-provider';

export const useClearPat = () => {
  const { clearToken } = useConsoleAuth();
  const { clearWorkspace } = useCurrentWorkspace();
  const router = useRouter();

  const clearPat = () => {
    clearToken();
    clearWorkspace();
    router.push('/personal-token');
    localStorage.clear();
  };

  return { clearPat };
};

export function NavUser() {
  const { setCustomerName, customerName, customerId } = useCustomer();
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Avatar className='h-8 w-8 rounded-lg'>
                <AvatarImage src={undefined} alt={customerName || 'User'} />
                <AvatarFallback className='rounded-lg'>
                  <User className='size-4' />
                </AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{customerName}</span>
                <span className='truncate text-xs'>{customerId}</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src={undefined} alt={customerName || 'User'} />
                  <AvatarFallback className='rounded-lg'>
                    <User className='size-4' />
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>{customerName}</span>
                  <span className='truncate text-xs'>{customerId}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCustomerName(undefined)}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
