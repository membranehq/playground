import type { ElementType } from 'react';
import { GlobeIcon, Package, MousePointerClickIcon, BoltIcon, Sparkles, GitBranch } from 'lucide-react';

// Define trigger types
export interface TriggerType {
  type: 'manual' | 'event';
  name: string;
  description: string;
  icon: ElementType;
  color: string;
  configurationSchema?: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Define node type metadata
export interface NodeTypeMetadata {
  type: 'http' | 'action' | 'ai' | 'gate';
  name: string;
  description: string;
  category: string;
  icon: ElementType;
  color: string;
  configurationSchema?: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const TRIGGER_TYPES: Record<string, TriggerType> = {
  manual: {
    type: 'manual',
    name: 'Manual Trigger',
    description: 'Start the workflow manually',
    icon: MousePointerClickIcon,
    color: 'blue',
  },
  event: {
    type: 'event',
    name: 'Event Trigger',
    description: 'Trigger the workflow based on events',
    icon: BoltIcon,
    color: 'red',
  },
};

export const NODE_TYPES: Record<string, NodeTypeMetadata> = {
  http: {
    type: 'http',
    name: 'HTTP Request',
    description: 'Make HTTP requests to external APIs or webhooks',
    category: 'integration',
    icon: GlobeIcon,
    color: 'blue',
    configurationSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: 'The URL to make the request to',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
          description: 'HTTP method to use for the request',
        },
        headers: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'HTTP headers to include in the request',
        },
        queryParameters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: { type: 'string' },
            },
          },
          description: 'Query parameters to append to the URL',
        },
        body: {
          type: 'object',
          description: 'Body to include in the request',
        },
      },
      required: ['uri', 'method'],
    },
  },

  action: {
    type: 'action',
    name: 'Action',
    description: 'Perform action',
    category: 'action',
    icon: Package,
    color: 'purple',
  },

  ai: {
    type: 'ai',
    name: 'AI',
    description: 'Use AI to process data with custom instructions',
    category: 'ai',
    icon: Sparkles,
    color: 'purple',
    configurationSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          format: 'textarea',
          description: 'Instructions for the AI on what to do with the input data',
        },
      },
      required: ['prompt'],
    },
  },

  gate: {
    type: 'gate',
    name: 'Gate',
    description: 'Control workflow flow based on conditions',
    category: 'logic',
    icon: GitBranch,
    color: 'orange',
    configurationSchema: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          description: 'Field path from previous step output',
        },
        operator: {
          type: 'string',
          enum: ['equals', 'not_equals'],
          description: 'Comparison operator',
        },
        value: {
          type: 'string',
          description: 'Value to compare against',
        },
      },
      required: ['field', 'operator', 'value'],
    },
  },
};


