import React from 'react';
import { WorkflowNode } from '../types/workflow';
import { Minimizer } from '@/components/ui/minimizer';
import { SchemaBuilder, JSONSchema } from '@/components/ui/schema-builder';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { TRIGGER_TYPES } from '@/lib/workflow/node-types';

interface ManualTriggerConfigProps {
  value: Omit<WorkflowNode, 'id'>;
  onChange: (value: Omit<WorkflowNode, 'id'>) => void;
}

export function ManualTriggerConfig({ value, onChange }: ManualTriggerConfigProps) {
  const hasInput = value.config?.hasInput !== false; // Default to true
  const currentTriggerType = value.triggerType || 'manual';

  return (
    <div className="space-y-4 pt-4">
      {/* Trigger Type Selector */}
      <div className="space-y-2">
        <Label required>Trigger Type</Label>
        <Select
          value={currentTriggerType}
          onValueChange={(newTriggerType) => {
            // If switching away from manual, clear all config
            // If staying on manual, keep current config
            const newConfig = newTriggerType === 'manual' 
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

      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
        <div className="space-y-0.5">
          <Label htmlFor="has-input">Has Input</Label>
          <p className="text-xs text-muted-foreground">Enable to allow input parameters when running this workflow</p>
        </div>
        <Switch
          id="has-input"
          checked={hasInput}
          onCheckedChange={(checked) => {
            onChange({
              ...value,
              config: {
                ...value.config,
                hasInput: checked,
              },
            });
          }}
        />
      </div>

      {hasInput && (
        <Minimizer title="Input Schema" defaultOpen={true} tooltip="Configure Input Schema for this trigger">
          <div className="space-y-4">
            <SchemaBuilder
              value={value.config?.inputSchema as JSONSchema}
              onChange={(schema) => {
                onChange({
                  ...value,
                  config: {
                    ...value.config,
                    inputSchema: schema,
                  },
                });
              }}
            />
          </div>
        </Minimizer>
      )}
    </div>
  );
}

export default ManualTriggerConfig;


