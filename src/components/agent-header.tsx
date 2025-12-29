'use client';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { AgentSessionsDropdown } from '@/components/agent-sessions-dropdown';

interface AgentHeaderProps {
  onNewChat: () => void;
  isCreating: boolean;
}

export function AgentHeader({ onNewChat, isCreating }: AgentHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-border">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumbs />
      </div>
      <div className="px-4">
        <AgentSessionsDropdown onNewChat={onNewChat} isCreating={isCreating} />
      </div>
    </header>
  );
}
