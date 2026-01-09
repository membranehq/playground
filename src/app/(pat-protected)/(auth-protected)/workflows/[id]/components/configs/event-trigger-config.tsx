import React, { useEffect, useState } from 'react';
import { DataSchema, useIntegrationApp } from '@membranehq/react';
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
  const params = useParams();

  const { workflow } = useWorkflow();
  const membrane = useIntegrationApp();
  const { customerId, customerName } = useCustomer();
  const { workspace } = useCurrentWorkspace();

  // Get headers for API calls
  const headers = React.useMemo(() => {
    if (!customerId || !workspace) return {};
    return getAgentHeaders(customerId, customerName);
  }, [customerId, customerName, workspace]);

  // Event type options
  const eventTypes = [
    { value: 'created', label: 'Created' },
    { value: 'updated', label: 'Updated' },
    { value: 'deleted', label: 'Deleted' },
  ];

  // State for data collections
  const [dataCollections, setDataCollections] = useState<Array<{ key: string; name: string }>>([]);
  const [isLoadingDataCollections, setIsLoadingDataCollections] = useState(false);
  const [dataCollectionError, setDataCollectionError] = useState<string | null>(null);

  // State for output schema
  const [outputSchema, setOutputSchema] = useState<unknown>(null);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // State for sample event sending
  const [isSendingSample, setIsSendingSample] = useState(false);
  const [sampleEventResult, setSampleEventResult] = useState<{ success: boolean; message: string } | null>(null);

  // Generate event ingest URL
  const workflowId = workflow?.id || (params.id as string);

  // Generate sample data from JSON schema
  const generateSampleData = (schema: unknown): unknown => {
    if (!schema || typeof schema !== 'object') {
      return {};
    }

    const jsonSchema = schema as JsonSchema;

    // Handle different schema types
    if (jsonSchema.type === 'object' && jsonSchema.properties) {
      const sampleData: Record<string, unknown> = {};
      for (const [key, property] of Object.entries(jsonSchema.properties)) {
        sampleData[key] = generateSampleValue(property);
      }
      return sampleData;
    } else if (Array.isArray(schema)) {
      // Handle array schemas
      return schema.map((item) => generateSampleData(item));
    } else if (jsonSchema.type) {
      return generateSampleValue(jsonSchema);
    }

    return {};
  };

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

  // Fetch data collections when connected
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

  // Fetch output schema when data collection is selected
  useEffect(() => {
    const fetchOutputSchema = async () => {
      if (!isConnected || !selectedIntegrationKey || !selectedDataCollection) {
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
  }, [isConnected, selectedIntegrationKey, selectedDataCollection, membrane]);

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
              },
            });
          }}
          onConnectionStateChange={setIsConnected}
        />

        {/* Event Configuration - Only show if connected */}
        {isConnected ? (
          <Minimizer
            title="Event Configuration"
            defaultOpen={true}
            tooltip="Configure which data collection and event type should trigger this workflow."
          >
            <div className="space-y-4">
              {/* Data Collection Selection */}
              <div className="space-y-2">
                <Label required>Data Collection</Label>
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
                      value={selectedDataCollection || ''}
                      onValueChange={(dataCollection) => {
                        // Update node name if event type is already selected
                        const dataCollectionName =
                          dataCollections.find((dc) => dc.key === dataCollection)?.name || dataCollection;
                        const nodeName = selectedEventType
                          ? `${dataCollectionName}: ${eventTypes.find((et) => et.value === selectedEventType)?.label || selectedEventType}`
                          : value.name;

                        onChange({
                          ...value,
                          name: nodeName,
                          config: {
                            ...value.config,
                            dataCollection,
                            eventType: undefined, // Clear event type when changing data collection
                          },
                        });
                      }}
                    >
                      <SelectTrigger aria-label="Select data collection" className="w-full">
                        <span>
                          {dataCollections.find((dc) => dc.key === selectedDataCollection)?.name ||
                            'Select a data collection'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {dataCollections.map((collection) => (
                          <SelectItem key={collection.key} value={collection.key}>
                            <span>{collection.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Event Type Selection - Only show if data collection selected */}
              {selectedDataCollection && (
                <div className="space-y-2">
                  <Label required>Event Type</Label>
                  <div className="space-y-2">
                    <Select
                      value={selectedEventType || ''}
                      onValueChange={(eventType) => {
                        // Calculate the node name based on data collection and event type
                        const dataCollectionName =
                          dataCollections.find((dc) => dc.key === selectedDataCollection)?.name ||
                          selectedDataCollection;
                        const eventTypeLabel = eventTypes.find((et) => et.value === eventType)?.label || eventType;
                        const nodeName = `${dataCollectionName}: ${eventTypeLabel}`;

                        onChange({
                          ...value,
                          name: nodeName,
                          config: {
                            ...value.config,
                            eventType,
                          },
                        });
                      }}
                    >
                      <SelectTrigger aria-label="Select event type" className="w-full">
                        <span>
                          {eventTypes.find((et) => et.value === selectedEventType)?.label || 'Select an event type'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypes.map((eventType) => (
                          <SelectItem key={eventType.value} value={eventType.value}>
                            <span>{eventType.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </Minimizer>
        ) : null}

        {/* Output Schema - Show when connected and data collection is selected */}
        {isConnected && selectedDataCollection && (
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


