import React, { useEffect, useState } from 'react';
import { DataSchema, useIntegrationApp, useIntegration } from '@membranehq/react';
import { WorkflowNode } from '../types/workflow';
import { TriggerType, TRIGGER_TYPES } from '@/lib/workflow/node-types';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from '@/components/ui/select';
import { Minimizer } from '@/components/ui/minimizer';
import { SelectAppAndConnect } from '@/components/ui/select-app-and-connect';
import { useWorkflow } from '../workflow-context';
import { useParams } from 'next/navigation';
import { useCustomer } from '@/components/providers/customer-provider';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { getAgentHeaders } from '@/lib/agent-api';

interface EventTriggerConfigProps {
  value: Omit<WorkflowNode, 'id'>;
  onChange: (value: Omit<WorkflowNode, 'id'>) => void;
  variableSchema?: DataSchema;
  triggerTypeConfig?: TriggerType;
  saveError?: { message: string; details?: string } | null;
  onOpenMembraneAgent?: (message: string) => void;
}

interface JsonSchemaProperty {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  items?: JsonSchemaProperty;
  enum?: unknown[];
  example?: unknown;
}

interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  items?: JsonSchemaProperty;
}

function getEventIngestUrl(workflowId: string) {
  const hostname = typeof window !== 'undefined' ? window.location.origin : '';
  return `${hostname}/api/workflows/ingest-event?workflowId=${workflowId}`;
}

export function EventTriggerConfig({ value, onChange, saveError, onOpenMembraneAgent }: EventTriggerConfigProps) {
  const selectedIntegrationKey = value.config?.integrationKey as string;
  const selectedDataCollection = value.config?.dataCollection as string;
  const selectedEventType = value.config?.eventType as string;
  const selectedConnectorEventKey = value.config?.connectorEventKey as string;
  const eventSource = (value.config?.eventSource as 'connector' | 'data-record') || 'data-record';

  // Derive event source from eventType (fallback if eventSource not set)
  const isConnectorEvent = eventSource === 'connector' || selectedEventType === 'connector-event-trigger';

  const params = useParams();

  const { workflow } = useWorkflow();
  const membrane = useIntegrationApp();
  const { integration: selectedIntegration } = useIntegration(selectedIntegrationKey || '');
  const { customerId, customerName } = useCustomer();
  const { workspace } = useCurrentWorkspace();

  // Get headers for API calls
  const headers = React.useMemo(() => {
    if (!customerId || !workspace) return {};
    return getAgentHeaders(customerId, customerName);
  }, [customerId, customerName, workspace]);

  // Event type options - store full values
  const eventTypes = [
    { value: 'data-record-created-trigger', label: 'Created' },
    { value: 'data-record-updated-trigger', label: 'Updated' },
    { value: 'data-record-deleted-trigger', label: 'Deleted' },
  ];

  // State for data collections
  const [dataCollections, setDataCollections] = useState<Array<{ key: string; name: string }>>([]);
  const [isLoadingDataCollections, setIsLoadingDataCollections] = useState(false);
  const [dataCollectionError, setDataCollectionError] = useState<string | null>(null);

  // State for connector events
  const [connectorEvents, setConnectorEvents] = useState<Array<{ key: string; name: string }>>([]);
  const [isLoadingConnectorEvents, setIsLoadingConnectorEvents] = useState(false);
  const [connectorEventsError, setConnectorEventsError] = useState<string | null>(null);

  // State for output schema
  const [outputSchema, setOutputSchema] = useState<unknown>(null);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // State for flow instance creation error
  const [flowInstanceError, setFlowInstanceError] = useState<string | null>(null);

  const generateSampleValue = (property: JsonSchemaProperty): unknown => {
    const type = property.type || 'string';

    switch (type) {
      case 'string':
        if (property.enum && property.enum.length > 0) {
          return property.enum[0];
        }
        return property.example || 'sample_string';
      case 'number':
      case 'integer':
        return property.example || (type === 'integer' ? 42 : 3.14);
      case 'boolean':
        return property.example || true;
      case 'array':
        if (property.items) {
          return [generateSampleValue(property.items)];
        }
        return [];
      case 'object':
        if (property.properties) {
          const obj: Record<string, unknown> = {};
          for (const [key, prop] of Object.entries(property.properties)) {
            obj[key] = generateSampleValue(prop);
          }
          return obj;
        }
        return {};
      default:
        return property.example || 'sample_value';
    }
  };

  // State for connection status from AppConnectionSelector
  const [isConnected, setIsConnected] = useState(false);

  // Fetch connector events when connected
  useEffect(() => {
    const fetchConnectorEvents = async () => {
      if (!isConnected || !selectedIntegrationKey || !selectedIntegration?.id) {
        setConnectorEvents([]);
        return;
      }

      setIsLoadingConnectorEvents(true);
      setConnectorEventsError(null);

      try {
        const response = await fetch(`/api/integrations/${selectedIntegration.id}/events`, {
          headers,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch connector events');
        }

        const data = await response.json();
        const events = data.events || [];

        // Transform events to match expected format
        const formattedEvents = Array.isArray(events)
          ? events.map((event: { key?: string; name?: string }) => ({
              key: event.key || '',
              name: event.name || event.key || '',
            }))
          : [];

        setConnectorEvents(formattedEvents);
      } catch (error) {
        console.error('Failed to fetch connector events:', error);
        setConnectorEventsError('Failed to fetch connector events');
        setConnectorEvents([]);
      } finally {
        setIsLoadingConnectorEvents(false);
      }
    };

    fetchConnectorEvents();
  }, [isConnected, selectedIntegrationKey, selectedIntegration?.id, headers]);

  // Fetch data collections when connected (only for data record events)
  useEffect(() => {
    const fetchDataCollections = async () => {
      if (!isConnected || !selectedIntegrationKey) {
        setDataCollections([]);
        return;
      }

      setIsLoadingDataCollections(true);
      setDataCollectionError(null);

      try {
        const collections = await membrane.connection(selectedIntegrationKey).dataCollection('').get();
        // Transform the collections to match our expected format
        const formattedCollections = Array.isArray(collections)
          ? collections.map((collection: { key?: string; name?: string }) => ({
              key: collection.key || collection.name || '',
              name: collection.name || collection.key || '',
            }))
          : [];
        setDataCollections(formattedCollections);
      } catch (error) {
        console.error('Failed to fetch data collections:', error);
        setDataCollectionError('Failed to fetch data collections');
        setDataCollections([]);
      } finally {
        setIsLoadingDataCollections(false);
      }
    };

    fetchDataCollections();
  }, [isConnected, selectedIntegrationKey, membrane]);

  // Fetch output schema when data collection is selected (only for data-record events)
  useEffect(() => {
    const fetchOutputSchema = async () => {
      if (!isConnected || !selectedIntegrationKey || !selectedDataCollection || isConnectorEvent) {
        setOutputSchema(null);
        return;
      }

      setIsLoadingSchema(true);
      setSchemaError(null);

      try {
        const schema = await membrane.connection(selectedIntegrationKey).dataCollection(selectedDataCollection).get();
        setOutputSchema(schema.fieldsSchema);
      } catch (error) {
        console.error('Failed to fetch output schema:', error);
        setSchemaError('Failed to fetch output schema');
        setOutputSchema(null);
      } finally {
        setIsLoadingSchema(false);
      }
    };

    fetchOutputSchema();
  }, [isConnected, selectedIntegrationKey, selectedDataCollection, membrane, isConnectorEvent]);

  const currentTriggerType = value.triggerType || 'event';

  // Compute the current selected value for the combined selector
  const getCurrentSelectedValue = () => {
    if (isConnectorEvent && selectedConnectorEventKey) {
      return `connector:${selectedConnectorEventKey}`;
    }
    if (!isConnectorEvent && selectedDataCollection && selectedEventType) {
      return `data-record:${selectedDataCollection}:${selectedEventType}`;
    }
    return '';
  };

  // Get display text for the selected value
  const getDisplayText = () => {
    if (isConnectorEvent && selectedConnectorEventKey) {
      const event = connectorEvents.find((e) => e.key === selectedConnectorEventKey);
      return event?.name || selectedConnectorEventKey;
    }
    if (!isConnectorEvent && selectedDataCollection && selectedEventType) {
      const dataCollectionName =
        dataCollections.find((dc) => dc.key === selectedDataCollection)?.name || selectedDataCollection;
      const eventTypeLabel = eventTypes.find((et) => et.value === selectedEventType)?.label || selectedEventType;
      return `${dataCollectionName}: ${eventTypeLabel}`;
    }
    return 'Select an event';
  };

  return (
    <div className="space-y-2 pt-4">
      {/* Flow Instance Error Banner */}
      {saveError && (
        <div className="p-4 border border-red-300 bg-red-50 rounded-lg text-sm text-red-700">
          <div className="font-semibold">{saveError.message}</div>
          {saveError.details && <div className="mt-1 text-xs">{saveError.details}</div>}
        </div>
      )}

      <div className="space-y-4">
        {/* Trigger Type Selector */}
        <div className="space-y-2">
          <Label required>Trigger Type</Label>
          <Select
            value={currentTriggerType}
            onValueChange={(newTriggerType) => {
              // If switching away from event, clear all config
              // If staying on event, keep current config
              const newConfig = newTriggerType === 'event' ? value.config || {} : {};

              onChange({
                ...value,
                triggerType: newTriggerType,
                config: newConfig,
                name: TRIGGER_TYPES[newTriggerType]?.name || value.name,
              });
            }}
          >
            <SelectTrigger className="w-full h-10">
              {TRIGGER_TYPES[currentTriggerType]?.name || 'Select trigger type'}
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRIGGER_TYPES).map(([key, triggerType]) => (
                <SelectItem key={key} value={key}>
                  {triggerType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* App Selection and Connection Section */}
        <SelectAppAndConnect
          selectedIntegrationKey={selectedIntegrationKey}
          onIntegrationChange={(integrationKey) => {
            onChange({
              ...value,
              config: {
                ...value.config,
                integrationKey,
                dataCollection: undefined, // Clear data collection when changing integration
                eventType: undefined, // Clear event type when changing integration
                connectorEventKey: undefined, // Clear connector event key when changing integration
              },
            });
          }}
          onConnectionStateChange={setIsConnected}
          onOpenMembraneAgent={onOpenMembraneAgent}
        />

        {/* Event Configuration - Only show if connected */}
        {isConnected ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label required>Event</Label>
              {isLoadingConnectorEvents || isLoadingDataCollections ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : connectorEventsError || dataCollectionError ? (
                <div className="p-4 border rounded-lg text-sm text-red-600 text-center">
                  {connectorEventsError || dataCollectionError}
                </div>
              ) : connectorEvents.filter((e) => e.key !== 'any-webhook-event').length === 0 &&
                dataCollections.length === 0 ? (
                <div className="p-4 border rounded-lg text-sm text-muted-foreground text-center">
                  No events available for this integration
                </div>
              ) : (
                <Select
                  value={getCurrentSelectedValue()}
                  onValueChange={(combinedValue) => {
                    if (combinedValue.startsWith('connector:')) {
                      // Handle connector event selection
                      const eventKey = combinedValue.replace('connector:', '');
                      const event = connectorEvents.find((e) => e.key === eventKey);
                      const nodeName = event?.name || eventKey;

                      onChange({
                        ...value,
                        name: nodeName,
                        config: {
                          ...value.config,
                          connectorEventKey: eventKey,
                          eventType: 'connector-event-trigger',
                          eventSource: 'connector',
                          dataCollection: undefined,
                        },
                      });
                    } else if (combinedValue.startsWith('data-record:')) {
                      // Handle data record event selection
                      const parts = combinedValue.replace('data-record:', '').split(':');
                      const [dataCollection, eventType] = parts;

                      const dataCollectionName =
                        dataCollections.find((dc) => dc.key === dataCollection)?.name || dataCollection;
                      const eventTypeLabel = eventTypes.find((et) => et.value === eventType)?.label || eventType;
                      const nodeName = `${dataCollectionName}: ${eventTypeLabel}`;

                      onChange({
                        ...value,
                        name: nodeName,
                        config: {
                          ...value.config,
                          dataCollection,
                          eventType,
                          eventSource: 'data-record',
                          connectorEventKey: undefined,
                        },
                      });
                    }
                  }}
                >
                  <SelectTrigger aria-label="Select event" className="w-full h-10">
                    <span>{getDisplayText()}</span>
                  </SelectTrigger>
                  <SelectContent side="bottom">
                    {/* Connector events first */}
                    {connectorEvents
                      .filter((event) => event.key !== 'any-webhook-event')
                      .map((event) => (
                        <SelectItem key={`connector:${event.key}`} value={`connector:${event.key}`}>
                          {event.name}
                        </SelectItem>
                      ))}

                    {/* Data record events - show in "Others" group only if there are connector events */}
                    {dataCollections.length > 0 && (
                      <>
                        {connectorEvents.filter((e) => e.key !== 'any-webhook-event').length > 0 ? (
                          <SelectGroup>
                            <SelectLabel>Others</SelectLabel>
                            {dataCollections.map((collection) =>
                              eventTypes.map((eventType) => (
                                <SelectItem
                                  key={`data-record:${collection.key}:${eventType.value}`}
                                  value={`data-record:${collection.key}:${eventType.value}`}
                                >
                                  <span>
                                    {collection.name}: {eventType.label}
                                  </span>
                                </SelectItem>
                              )),
                            )}
                          </SelectGroup>
                        ) : (
                          // If no connector events, show data record events directly without group
                          dataCollections.map((collection) =>
                            eventTypes.map((eventType) => (
                              <SelectItem
                                key={`data-record:${collection.key}:${eventType.value}`}
                                value={`data-record:${collection.key}:${eventType.value}`}
                              >
                                <span>
                                  {collection.name}: {eventType.label}
                                </span>
                              </SelectItem>
                            )),
                          )
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        ) : null}

        {/* Output Schema - Show when connected and data collection is selected (only for data-record events) */}
        {isConnected && selectedDataCollection && !isConnectorEvent && (
          <Minimizer
            title="Output Schema"
            defaultOpen={false}
            tooltip="View the schema of data that will be available when this event triggers."
          >
            <div className="space-y-2">
              {isLoadingSchema ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : schemaError ? (
                <div className="p-4 border rounded-lg text-sm text-red-600 text-center">{schemaError}</div>
              ) : outputSchema ? (
                <div className="p-3 bg-gray-50 rounded-md border">
                  <pre className="text-xs text-foreground overflow-auto max-h-60">
                    {JSON.stringify(outputSchema, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="p-4 border rounded-lg text-sm text-muted-foreground text-center">
                  No schema available for this data collection
                </div>
              )}
            </div>
          </Minimizer>
        )}
      </div>
    </div>
  );
}

export default EventTriggerConfig;
