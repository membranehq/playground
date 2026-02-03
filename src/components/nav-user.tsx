'use client';

import { useState } from 'react';
import { ChevronsUpDown, LogOut, User, UserPlus, Trash2, Database, Check } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { useAuth } from './providers/auth-provider';
import { useCurrentWorkspace } from './providers/workspace-provider';
import { useCustomer } from './providers/customer-provider';
import { CustomerManagementDialog, DialogMode } from './customer-management-dialog';

export function NavUser() {
  const { customerId, customerIds, switchCustomer } = useCustomer();
  const { logout } = useAuth();
  const { clearWorkspace } = useCurrentWorkspace();
  const { isMobile } = useSidebar();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('add');
  const [targetCustomerId, setTargetCustomerId] = useState<string | undefined>();

  const handleLogout = async () => {
    clearWorkspace();
    await logout();
  };

  const handleAddCustomer = () => {
    setDialogMode('add');
    setTargetCustomerId(undefined);
    setDialogOpen(true);
  };

  const handleDeleteEntities = (id: string) => {
    setDialogMode('delete-entities');
    setTargetCustomerId(id);
    setDialogOpen(true);
  };

  const handleDeleteCustomer = (id: string) => {
    setDialogMode('delete-customer');
    setTargetCustomerId(id);
    setDialogOpen(true);
  };

  const handleSwitchCustomer = (id: string) => {
    if (id !== customerId) {
      switchCustomer(id);
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={undefined} alt={customerId || 'User'} />
                  <AvatarFallback className="rounded-lg">
                    <User className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{customerId || 'No Customer'}</span>
                  <span className="truncate text-xs text-muted-foreground">Customer ID</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-64 rounded-lg"
              side={isMobile ? 'bottom' : 'right'}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">Customers</DropdownMenuLabel>

              {customerIds.length === 0 ? (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  No customers yet
                </DropdownMenuItem>
              ) : (
                customerIds.map((id) => (
                  <DropdownMenuSub key={id}>
                    <DropdownMenuSubTrigger className="gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Avatar className="h-6 w-6 rounded-md">
                          <AvatarFallback className="rounded-md text-xs">
                            {id.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate flex-1">{id}</span>
                        {id === customerId && <Check className="size-4 text-green-500" />}
                      </div>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {id !== customerId && (
                        <DropdownMenuItem onClick={() => handleSwitchCustomer(id)}>
                          <User className="size-4" />
                          Switch to this customer
                        </DropdownMenuItem>
                      )}
                      {id === customerId && (
                        <DropdownMenuItem disabled>
                          <Check className="size-4" />
                          Currently active
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteEntities(id)}
                        className="text-orange-600 focus:text-orange-600"
                      >
                        <Database className="size-4" />
                        Delete entities
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteCustomer(id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="size-4" />
                        Delete customer
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleAddCustomer}>
                <UserPlus className="size-4" />
                Add new customer
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CustomerManagementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        targetCustomerId={targetCustomerId}
      />
    </>
  );
}
