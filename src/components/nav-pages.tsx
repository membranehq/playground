'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type LucideIcon } from 'lucide-react';

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function NavPages({
  pages,
}: {
  pages: {
    name: string;
    url: string;
    icon: LucideIcon;
    disabled?: boolean;
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {pages.map((item) => (
          <SidebarMenuItem key={item.name}>
            {item.disabled ? (
              <SidebarMenuButton
                tooltip={item.name}
                className="opacity-50"
                asChild
              >
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.name}>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
