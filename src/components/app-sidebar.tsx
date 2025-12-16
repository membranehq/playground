'use client';

import * as React from 'react';
import { Blocks, Bot, Workflow } from 'lucide-react';

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
  {
    name: 'Workflow Builder',
    url: '/workflow-builder',
    icon: Workflow,
    disabled: true,
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
