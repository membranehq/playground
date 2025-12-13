'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type LucideIcon } from 'lucide-react';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function NavPages({
  pages,
}: {
  pages: {
    name: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {pages.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.name}>
              <Link href={item.url}>
                <item.icon />
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
