import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Minimizer } from '@/components/ui/minimizer';
import { SelectAppAndConnect } from '@/components/ui/select-app-and-connect';
import { Action, DataInput, DataSchema, useAction, useActions, useIntegration } from '@membranehq/react';
import Image from 'next/image';
import { WorkflowNode } from '../types/workflow';
import { Check, ChevronsUpDown, WandSparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface MembraneActionConfigProps {
  value: Omit<WorkflowNode, 'id'>;
  onChange: (value: Omit<WorkflowNode, 'id'>) => void;
  variableSchema: DataSchema;
  onOpenMembraneAgent?: (enrichedMessage: string) => void;
  refreshKey?: number;
}

export function MembraneActionConfig({
  value,
  onChange,
  variableSchema,
  onOpenMembraneAgent,
  refreshKey,
}: MembraneActionConfigProps) {
  const selectedActionId = value.config?.actionId;
  const selectedIntegrationKey = value.config?.integrationKey as string;
  const selectedConnectorId = value.config?.connectorId as string;
  const selectedConnectorName = value.config?.connectorName as string;
  const selectedConnectorLogoUri = value.config?.connectorLogoUri as string;

  // State for connection status from AppConnectionSelector
  const [isConnected, setIsConnected] = useState(false);
  const [actionSelectOpen, setActionSelectOpen] = useState(false);

  // Use ref to track the latest value to avoid stale closures
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Handle connection state change and store connectionId
  const handleConnectionStateChange = useCallback(
    (connected: boolean, connectionId?: string) => {
      setIsConnected(connected);
      // Store connectionId in config when connection state changes
      if (connected && connectionId && valueRef.current.config?.connectionId !== connectionId) {
        onChange({
          ...valueRef.current,
          config: {
            ...valueRef.current.config,
            connectionId,
          },
        });
      }
    },
    [onChange],
  );

  // State for "Add new action" dialog
  const [addActionDialogOpen, setAddActionDialogOpen] = useState(false);
  const [actionDescription, setActionDescription] = useState('');

  const { loading: isLoadingSelectedAction, action: selectedActionData } = useAction(selectedActionId as string);
  const { integration: selectedIntegration } = useIntegration(selectedIntegrationKey);

  // Determine if we're in connector mode (no integrationKey)
  const isConnectorMode = !selectedIntegrationKey && !!selectedConnectorId;

  // Get connectionId from config for connector mode
  const configConnectionId = value.config?.connectionId as string | undefined;

  // Fetch actions based on mode - use connectionId in connector mode
  const actionsForSelectedIntegration = useActions(
    isConnectorMode && configConnectionId
      ? { connectionId: configConnectionId }
      : { integrationKey: selectedIntegrationKey },
  );

  // Refresh actions when refreshKey changes (e.g., after Membrane agent session completes)
  useEffect(() => {
    if (refreshKey && actionsForSelectedIntegration.refresh) {
      actionsForSelectedIntegration.refresh();
    }
  }, [refreshKey]);

  return (
    <>
      {/* App Selection and Connection Section */}
      <SelectAppAndConnect
        selectedIntegrationKey={selectedIntegrationKey}
        selectedConnectorId={selectedConnectorId}
        selectedConnectorName={selectedConnectorName}
        selectedConnectorLogoUri={selectedConnectorLogoUri}
        onIntegrationChange={(integrationKey) => {
          onChange({
            ...value,
            config: {
              ...value.config,
              integrationKey,
              connectorId: undefined,
              connectorName: undefined,
              connectorLogoUri: undefined,
              connectionId: undefined,
              actionId: undefined,
              inputMapping: undefined,
            },
          });
        }}
        onConnectorChange={(connectorId, connectorName, connectorLogoUri) => {
          onChange({
            ...value,
            config: {
              ...value.config,
              connectorId,
              connectorName,
              connectorLogoUri,
              integrationKey: undefined,
              connectionId: undefined,
              actionId: undefined,
              inputMapping: undefined,
            },
          });
        }}
        onConnectionStateChange={handleConnectionStateChange}
        onOpenMembraneAgent={onOpenMembraneAgent}
        refreshKey={refreshKey}
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
            <div className="space-y-3">
              <div className="p-4 border rounded-lg text-sm text-muted-foreground text-center">
                There are no actions available for this integration
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => setAddActionDialogOpen(true)}>
                <WandSparkles className="w-4 h-4 text-purple-600" />
                <span className="text-purple-600 font-medium">Add new action</span>
              </Button>
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
                          (a: Action) => a.id === selectedActionId,
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
                              const actionName = action?.name || 'Action';
                              // For connection-level actions, we need the key or uuid
                              // action.key is the preferred identifier, fallback to uuid, then id
                              const actionKey = action.key || action.uuid || action.id;
                              onChange({
                                ...value,
                                name: actionName,
                                config: { ...value.config, actionId: action.id, actionKey },
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
                                selectedActionId === action.id ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                          </CommandItem>
                        ))}
                        <CommandSeparator />
                        <CommandItem
                          value="add-new-action"
                          onSelect={() => {
                            setActionSelectOpen(false);
                            setAddActionDialogOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <WandSparkles className="w-5 h-5 text-purple-600" />
                            <span className="text-sm font-medium text-purple-600">Add new action</span>
                          </div>
                        </CommandItem>
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
                {selectedActionData?.outputSchema ? (
                  <div className="h-40 overflow-y-auto border rounded-md p-2 w-full">
                    <pre className="text-xs">{JSON.stringify(selectedActionData.outputSchema, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg text-sm text-muted-foreground text-center">
                    No output schema specified for this action
                  </div>
                )}
              </Minimizer>
            </>
          ) : (
            /* Show error state */
            <div className="text-sm text-muted-foreground">Failed to load action details</div>
          )}
        </div>
      )}

      {/* Add New Action Dialog */}
      <Dialog open={addActionDialogOpen} onOpenChange={setAddActionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Action</DialogTitle>
            <DialogDescription>
              Describe what you want this action to do, and we'll generate it for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-description">Action Description</Label>
              <Textarea
                id="action-description"
                placeholder="e.g., Create a new task in the project management system with a title, description, and due date"
                value={actionDescription}
                onChange={(e) => setActionDescription(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddActionDialogOpen(false);
                setActionDescription('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                let enrichedMessage: string;

                if (isConnectorMode) {
                  // Connector mode: create connection-specific action
                  enrichedMessage = `I need to create a new action for a tenant-level connector.

Connector ID: ${selectedConnectorId}
Connector Name: ${selectedConnectorName || 'Not available'}
Connection ID: ${configConnectionId || 'Not available'}

User's description of what the action should do:
${actionDescription}

Please help me create this action.

IMPORTANT: This is a tenant-level connector, not a workspace-level integration. Create a connection-specific action using the provided Connection ID. Do not create an integration-level action.`;
                } else {
                  // Integration mode: create integration-level action
                  enrichedMessage = `I need to create a new action for the ${selectedIntegrationKey} integration.

Integration Key: ${selectedIntegrationKey}
Integration ID: ${selectedIntegration?.id || 'Not available'}

User's description of what the action should do:
${actionDescription}

Please help me create this action.

IMPORTANT: Do not ask user to create/test a connection. Connection must be created at this point. Find and use an existing one.`;
                }

                // Call the callback to open Membrane agent panel
                onOpenMembraneAgent?.(enrichedMessage);

                // Close dialog and clear description
                setAddActionDialogOpen(false);
                setActionDescription('');
              }}
              disabled={!actionDescription.trim()}
            >
              <WandSparkles className="w-4 h-4 mr-2" />
              Generate new action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MembraneActionConfig;
