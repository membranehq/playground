import React from 'react';
import { DataInput, DataSchema } from '@membranehq/react';
import { WorkflowNode } from '../types/workflow';
import { NodeTypeMetadata } from '@/lib/workflow/lib/node-types';
import { SchemaBuilder, JSONSchema } from '@/components/ui/schema-builder';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minimizer } from '@/components/ui/minimizer';
import { Switch } from '@/components/ui/switch';

interface AIConfigProps {
  value: Omit<WorkflowNode, 'id'>;
  onChange: (value: Omit<WorkflowNode, 'id'>) => void;
  variableSchema: DataSchema;
  nodeTypeConfig: NodeTypeMetadata;
}

export function AIConfig({ value, onChange, variableSchema }: AIConfigProps) {
  const prompt = (value.config?.inputMapping as { prompt?: string })?.prompt || '';
  const structuredOutput = value.config?.structuredOutput !== false; // Default to true for backward compatibility
  const mcpConfig =
    (value.config?.mcp as {
      url?: string;
      type?: 'sse' | 'http';
      headers?: Record<string, string>;
    }) || {};

  // Schema for MCP headers using DataInput
  const headersSchema: DataSchema = {
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'HTTP headers to include in MCP requests',
  };

  return (
    <div className="space-y-2 pt-4">
      <div>
        <Label htmlFor="ai-prompt" className="mb-3 block" required>
          Prompt
        </Label>
        <Textarea
          id="ai-prompt"
          placeholder="Enter instructions for the AI on what to do with the input data..."
          value={prompt}
          onChange={(e) => {
            onChange({
              ...value,
              config: {
                ...value.config,
                inputMapping: {
                  prompt: e.target.value,
                },
              },
            });
          }}
          className="min-h-[150px] resize-y"
        />
      </div>

      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
        <div className="space-y-0.5">
          <Label htmlFor="structured-output">Structure AI Output</Label>
          <p className="text-xs text-muted-foreground">Enable to define a schema for structured AI responses</p>
        </div>
        <Switch
          id="structured-output"
          checked={structuredOutput}
          onCheckedChange={(checked) => {
            onChange({
              ...value,
              config: {
                ...value.config,
                structuredOutput: checked,
              },
            });
          }}
        />
      </div>

      {structuredOutput && (
        <Minimizer title="Configure Output Schema" defaultOpen={true}>
          <div className="p-4">
            <SchemaBuilder
              value={value.config?.outputSchema as JSONSchema}
              onChange={(schema) => {
                onChange({
                  ...value,
                  config: {
                    ...value.config,
                    outputSchema: schema,
                  },
                });
              }}
            />
          </div>
        </Minimizer>
      )}

      <Minimizer title="MCP Server Configuration" defaultOpen={false}>
        <div className="space-y-4 p-4">
          <div>
            <Label htmlFor="mcp-url" className="mb-2 block">
              Server URL
            </Label>
            <Input
              id="mcp-url"
              type="url"
              placeholder="http://localhost:3000/mcp"
              value={mcpConfig.url || ''}
              onChange={(e) => {
                onChange({
                  ...value,
                  config: {
                    ...value.config,
                    mcp: {
                      ...mcpConfig,
                      url: e.target.value,
                    },
                  },
                });
              }}
            />
          </div>

          <div>
            <Label htmlFor="mcp-type" className="mb-2 block">
              Server Type
            </Label>
            <Select
              value={mcpConfig.type || 'http'}
              onValueChange={(selectedType: 'sse' | 'http') => {
                onChange({
                  ...value,
                  config: {
                    ...value.config,
                    mcp: {
                      ...mcpConfig,
                      type: selectedType,
                    },
                  },
                });
              }}
            >
              <SelectTrigger id="mcp-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="http">HTTP</SelectItem>
                <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Headers</Label>
            <div
              className="relative z-[1] isolate"
              onFocus={(e) => e.stopPropagation()}
              onBlur={(e) => e.stopPropagation()}
            >
              <DataInput
                schema={headersSchema}
                value={mcpConfig.headers || {}}
                variablesSchema={variableSchema}
                onChange={(headers) => {
                  onChange({
                    ...value,
                    config: {
                      ...value.config,
                      mcp: {
                        ...mcpConfig,
                        headers: headers as Record<string, string>,
                      },
                    },
                  });
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Optional: Add HTTP headers for MCP server requests</p>
          </div>
        </div>
      </Minimizer>
    </div>
  );
}

export default AIConfig;


