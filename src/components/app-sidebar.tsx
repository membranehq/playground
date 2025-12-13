'use client';

import * as React from 'react';
import { Blocks, Bot } from 'lucide-react';

import { NavPages } from '@/components/nav-pages';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';

const pages = [
  {
    name: 'Integrations',
    url: '/integrations',
    icon: Blocks,
  },
  {
    name: 'Agent',
    url: '/agent',
    icon: Bot,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <NavUser />
      </SidebarHeader>
      <SidebarContent>
        <NavPages pages={pages} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
