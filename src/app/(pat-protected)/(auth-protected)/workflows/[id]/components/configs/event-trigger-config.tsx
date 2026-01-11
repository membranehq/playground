import React, { useEffect, useState } from 'react';
import { DataSchema, useIntegrationApp, useIntegration } from '@membranehq/react';
import { WorkflowNode } from '../types/workflow';
import { TriggerType, TRIGGER_TYPES } from '@/lib/workflow/node-types';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
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

export function EventTriggerConfig({ value, onChange }: EventTriggerConfigProps) {
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

  // State for sample event sending
  const [isSendingSample, setIsSendingSample] = useState(false);
  const [sampleEventResult, setSampleEventResult] = useState<{ success: boolean; message: string } | null>(null);

  // Generate event ingest URL
  const workflowId = workflow?.id || (params.id as string);

 

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

  // Fetch connector events when connected and event type is connector-event-trigger
  useEffect(() => {
    const fetchConnectorEvents = async () => {
      if (!isConnected || !selectedIntegrationKey || !isConnectorEvent || !selectedIntegration?.id) {
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
  }, [isConnected, selectedIntegrationKey, isConnectorEvent, selectedIntegration?.id, headers]);

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
  }, [isConnected, selectedIntegrationKey, membrane, isConnectorEvent]);

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

  return (
    <div className="space-y-2 pt-4">
      <div className="space-y-4">
        {/* Trigger Type Selector */}
        <div className="space-y-2">
          <Label required>Trigger Type</Label>
          <Select
            value={currentTriggerType}
            onValueChange={(newTriggerType) => {
              // If switching away from event, clear all config
              // If staying on event, keep current config
              const newConfig = newTriggerType === 'event'
                ? value.config || {}
                : {};
              
              onChange({
                ...value,
                triggerType: newTriggerType,
                config: newConfig,
                name: TRIGGER_TYPES[newTriggerType]?.name || value.name,
              });
            }}
          >
            <SelectTrigger className="w-full">
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
        />

        {/* Event Configuration - Only show if connected */}
        {isConnected ? (
          <div className="space-y-4">
            {/* Event Source Selector */}
            <div className="space-y-2">
              <Label required>Event Source</Label>
              <Select
                value={eventSource}
                onValueChange={(newEventSource: 'connector' | 'data-record') => {
                  onChange({
                    ...value,
                    config: {
                      ...value.config,
                      eventSource: newEventSource,
                      // Clear event-specific fields when switching
                      dataCollection: undefined,
                      eventType: undefined,
                      connectorEventKey: undefined,
                    },
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  {eventSource === 'connector' ? 'Connector Event' : 'Data Record Event'}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data-record">Data Record Event</SelectItem>
                  <SelectItem value="connector">Connector Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data Record Event Configuration */}
            {!isConnectorEvent && (
              <div className="space-y-2">
                <Label required>Collection Event</Label>
                {isLoadingDataCollections ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : dataCollectionError ? (
                  <div className="p-4 border rounded-lg text-sm text-red-600 text-center">{dataCollectionError}</div>
                ) : dataCollections.length === 0 ? (
                  <div className="p-4 border rounded-lg text-sm text-muted-foreground text-center">
                    No data collections available for this integration
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Select
                      value={
                        selectedDataCollection && selectedEventType
                          ? `${selectedDataCollection}:${selectedEventType}`
                          : ''
                      }
                      onValueChange={(combinedValue) => {
                        // Parse the combined value to extract collection and event type
                        const [dataCollection, eventType] = combinedValue.split(':');
                        
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
                            connectorEventKey: undefined, // Clear connector event key when selecting data record event
                          },
                        });
                      }}
                    >
                      <SelectTrigger aria-label="Select collection event" className="w-full">
                        <span>
                          {selectedDataCollection && selectedEventType
                            ? `${dataCollections.find((dc) => dc.key === selectedDataCollection)?.name || selectedDataCollection}: ${eventTypes.find((et) => et.value === selectedEventType)?.label || selectedEventType}`
                            : 'Select a collection event'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {dataCollections.map((collection) =>
                          eventTypes.map((eventType) => (
                            <SelectItem
                              key={`${collection.key}:${eventType.value}`}
                              value={`${collection.key}:${eventType.value}`}
                            >
                              <span>
                                {collection.name}: {eventType.label}
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Connector Event Configuration */}
            {isConnectorEvent && (
              <div className="space-y-2">
                <Label required>Connector Event</Label>
                {isLoadingConnectorEvents ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : connectorEventsError ? (
                  <div className="p-4 border rounded-lg text-sm text-red-600 text-center">{connectorEventsError}</div>
                ) : connectorEvents.length === 0 ? (
                  <div className="p-4 border rounded-lg text-sm text-muted-foreground text-center">
                    No connector events available for this integration
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Select
                      value={selectedConnectorEventKey || ''}
                      onValueChange={(eventKey) => {
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
                            dataCollection: undefined, // Clear data collection when selecting connector event
                          },
                        });
                      }}
                    >
                      <SelectTrigger aria-label="Select connector event" className="w-full">
                        <span>
                          {selectedConnectorEventKey
                            ? connectorEvents.find((e) => e.key === selectedConnectorEventKey)?.name || selectedConnectorEventKey
                            : 'Select a connector event'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {connectorEvents.map((event) => (
                          <SelectItem key={event.key} value={event.key}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
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


