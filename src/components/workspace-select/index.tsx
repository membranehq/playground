'use client';
import { useEffect, useState } from 'react';

import { useConsoleEntry } from '@/hooks/use-console-entry';
import { useCurrentWorkspace } from '../providers/workspace-provider';

import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cva, VariantProps } from 'class-variance-authority';

const selectVariants = cva('w-full', {
  variants: {
    span: {
      full: 'max-w-full',
      short: 'max-w-52',
    },
  },
  defaultVariants: {
    span: 'short',
  },
});

export const WorkspaceSelect = ({
  span,
}: VariantProps<typeof selectVariants>) => {
  const [open, setOpen] = useState(false);

  const {
    workspaces = [],
    orgs = [],
    isError: workspacesError,
    isLoading: workspaceLoading,
    workspacesMap,
  } = useConsoleEntry();
  const { saveWorkspace, workspace: currentWorkspace } = useCurrentWorkspace();

  const [workspaceId, setWorkspaceId] = useState(currentWorkspace?.id || '');

  useEffect(() => {
    if (currentWorkspace?.id) {
      setWorkspaceId(currentWorkspace.id);
    }
  }, [currentWorkspace?.id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          className={cn('justify-between', selectVariants({ span }))}
          disabled={workspacesError || workspaceLoading}
        >
          <span className='truncate'>
            {workspaceId
              ? workspacesMap[workspaceId]?.name
              : 'Select workspace...'}
          </span>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('p-0', selectVariants({ span }))}
        align='start'
      >
        <Command>
          <CommandInput placeholder='Search workspace...' />
          <CommandList>
            <CommandEmpty>No workspaces found.</CommandEmpty>
            {orgs.sort(updatedAtPredicate).map((org) => {
              return (
                <CommandGroup key={org.id} heading={org.name}>
                  {workspaces
                    .filter((ws) => ws.orgId === org.id)
                    .sort(updatedAtPredicate)
                    .map((ws) => (
                      <CommandItem
                        key={ws.id}
                        keywords={[ws.name, org.name]}
                        value={ws.id}
                        onSelect={(newId) => {
                          const workspace = workspacesMap[newId];
                          if (workspace) {
                            saveWorkspace(workspace);
                            setOpen(false);
                          }
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            workspaceId === ws.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {ws.name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const updatedAtPredicate = (
  left: { updatedAt: string },
  right: { updatedAt: string },
) => {
  const leftUpdatedAt = new Date(left.updatedAt);
  const rightUpdatedAt = new Date(right.updatedAt);
  return rightUpdatedAt.getTime() - leftUpdatedAt.getTime();
};
