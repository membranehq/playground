import React from 'react';
import { DataInput, DataSchema } from '@membranehq/react';
import { WorkflowNode } from '../types/workflow';
import { NodeTypeMetadata } from '@/lib/workflow/node-types';
import { Minimizer } from '@/components/ui/minimizer';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface GateConfigProps {
  value: Omit<WorkflowNode, 'id'>;
  onChange: (value: Omit<WorkflowNode, 'id'>) => void;
  variableSchema: DataSchema;
  nodeTypeConfig: NodeTypeMetadata;
}

export function GateConfig({ value, onChange, variableSchema }: GateConfigProps) {
  const condition = (value.config?.condition as {
    field?: { $var: string } | string;
    operator?: 'equals' | 'not_equals';
    value?: string;
  }) || {};

  // Schema for field selection - just a string that will be resolved as a variable
  const fieldSchema: DataSchema = {
    type: 'string',
    description: 'Select a field from previous step output',
  };

  return (
    <div className="space-y-4 pt-4">
      <Minimizer title="Configure Gate Condition" defaultOpen={true}>
        <div className="space-y-4 p-4">
          <div>
            <Label htmlFor="gate-field" className="mb-2 block" required>
              Field to Check
            </Label>
            <div
              className="relative z-[1] isolate"
              onFocus={(e) => e.stopPropagation()}
              onBlur={(e) => e.stopPropagation()}
            >
              <DataInput
                schema={fieldSchema}
                value={condition.field}
                variablesSchema={variableSchema}
                onChange={(field) => {
                  onChange({
                    ...value,
                    config: {
                      ...value.config,
                      condition: {
                        ...condition,
                        field,
                      },
                    },
                  });
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Select a field from a previous step to evaluate
            </p>
          </div>

          <div>
            <Label htmlFor="gate-operator" className="mb-2 block" required>
              Operator
            </Label>
            <Select
              value={condition.operator || 'equals'}
              onValueChange={(operator: 'equals' | 'not_equals') => {
                onChange({
                  ...value,
                  config: {
                    ...value.config,
                    condition: {
                      ...condition,
                      operator,
                    },
                  },
                });
              }}
            >
              <SelectTrigger id="gate-operator">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not Equals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="gate-value" className="mb-2 block" required>
              Expected Value
            </Label>
            <Input
              id="gate-value"
              type="text"
              placeholder="Enter expected value"
              value={condition.value || ''}
              onChange={(e) => {
                onChange({
                  ...value,
                  config: {
                    ...value.config,
                    condition: {
                      ...condition,
                      value: e.target.value,
                    },
                  },
                });
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The workflow will continue only if the condition is met
            </p>
          </div>
        </div>
      </Minimizer>
    </div>
  );
}

export default GateConfig;

