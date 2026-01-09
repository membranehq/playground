import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Minimizer } from '@/components/ui/minimizer';
import { SelectAppAndConnect } from '@/components/ui/select-app-and-connect';
import { Action, DataInput, DataSchema, useAction, useActions } from '@membranehq/react';
import Image from 'next/image';
import { WorkflowNode } from '../types/workflow';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MembraneActionConfigProps {
  value: Omit<WorkflowNode, 'id'>;
  onChange: (value: Omit<WorkflowNode, 'id'>) => void;
  variableSchema: DataSchema;
}

export function MembraneActionConfig({ value, onChange, variableSchema }: MembraneActionConfigProps) {
  const selectedActionId = value.config?.actionId;
  const selectedIntegrationKey = value.config?.integrationKey as string;

  // State for connection status from AppConnectionSelector
  const [isConnected, setIsConnected] = useState(false);
  const [actionSelectOpen, setActionSelectOpen] = useState(false);

  const { loading: isLoadingSelectedAction, action: selectedActionData } = useAction(selectedActionId as string);

  const actionsForSelectedIntegration = useActions({
    integrationKey: selectedIntegrationKey,
  });

  return (
    <>
      {/* App Selection and Connection Section */}
      <SelectAppAndConnect
        selectedIntegrationKey={selectedIntegrationKey}
        onIntegrationChange={(integrationKey) => {
          onChange({
            ...value,
            config: {
              ...value.config,
              integrationKey,
              actionId: undefined,
              inputMapping: undefined,
            },
          });
        }}
        onConnectionStateChange={setIsConnected}
      />

      {/* Only show actions if user is connected */}
      {isConnected && (
        <div className="space-y-2 pt-4">
          <Label required>Action</Label>
          {actionsForSelectedIntegration.loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : actionsForSelectedIntegration.items.length === 0 ? (
            <div className="p-4 border rounded-lg text-sm text-muted-foreground text-center">
              There are no actions available for this integration
            </div>
          ) : (
            <div className="space-y-2">
              <Popover open={actionSelectOpen} onOpenChange={setActionSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={actionSelectOpen}
                    className="w-full justify-between p-3 h-auto"
                  >
                    <div className="flex items-center gap-3">
                      {(() => {
                        const selectedActionData = actionsForSelectedIntegration.items.find(
                          (a: Action) => a.id === selectedActionId
                        );
                        return selectedActionData?.integration?.logoUri ? (
                          <Image
                            width={20}
                            height={20}
                            src={selectedActionData.integration.logoUri}
                            alt="Integration logo"
                            className="w-5 h-5 rounded"
                          />
                        ) : null;
                      })()}
                      <span className="text-sm font-medium text-foreground">
                        {actionsForSelectedIntegration.items.find((a: Action) => a.id === selectedActionId)?.name ||
                          'Select an action'}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search actions..." />
                    <CommandList>
                      <CommandEmpty>No action found.</CommandEmpty>
                      <CommandGroup>
                        {actionsForSelectedIntegration.items.map((action) => (
                          <CommandItem
                            key={action.id}
                            value={action.name}
                            onSelect={() => {
                              // Get the action name to set as the node name
                              const actionName = action?.name || 'Action';
                              onChange({
                                ...value,
                                name: actionName,
                                config: { ...value.config, actionId: action.id },
                              });
                              setActionSelectOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {action.integration?.logoUri ? (
                                <Image
                                  width={20}
                                  height={20}
                                  src={action.integration.logoUri}
                                  alt="Integration logo"
                                  className="w-5 h-5 rounded"
                                />
                              ) : null}
                              <span className="text-sm">{action.name}</span>
                            </div>
                            <Check
                              className={cn(
                                'ml-2 h-4 w-4',
                                selectedActionId === action.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      )}

      {/* Only show action configuration if user is connected */}
      {isConnected && (
        <div className="space-y-2 pt-4">
          {!selectedActionId ? (
            /* Show placeholder when no action is selected */
            actionsForSelectedIntegration.items.length > 0 ? (
              <div className="text-sm text-muted-foreground">Select an action above to configure it</div>
            ) : null
          ) : isLoadingSelectedAction ? (
            /* Show compact skeleton while loading selected action */
            <div className="space-y-3">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-5 w-36 mt-2" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : selectedActionData ? (
            /* Show actual content when loaded */
            <>
              {selectedActionData?.inputSchema && (
                <Minimizer title="Configure Action Input" defaultOpen={true}>
                  <DataInput
                    schema={selectedActionData?.inputSchema}
                    value={value.config?.inputMapping}
                    variablesSchema={variableSchema}
                    onChange={(configuration) => {
                      onChange({ ...value, config: { ...value.config, inputMapping: configuration } });
                    }}
                  />
                </Minimizer>
              )}

              <Minimizer title="Output Schema" defaultOpen={false} className="mt-4">
                <div className="h-40 overflow-y-auto border rounded-md p-2 w-full">
                  <pre className="text-xs">{JSON.stringify(selectedActionData?.outputSchema, null, 2)}</pre>
                </div>
              </Minimizer>
            </>
          ) : (
            /* Show error state */
            <div className="text-sm text-muted-foreground">Failed to load action details</div>
          )}
        </div>
      )}
    </>
  );
}

export default MembraneActionConfig;


