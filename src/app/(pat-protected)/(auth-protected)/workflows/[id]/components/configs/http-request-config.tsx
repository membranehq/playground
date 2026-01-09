import React from 'react';
import { DataInput, DataSchema } from '@membranehq/react';
import { WorkflowNode } from '../types/workflow';
import { NodeTypeMetadata } from '@/lib/workflow/lib/node-types';
import { Minimizer } from '@/components/ui/minimizer';
import { SchemaBuilder, JSONSchema } from '@/components/ui/schema-builder';

interface HttpRequestConfigProps {
  value: Omit<WorkflowNode, 'id'>;
  onChange: (value: Omit<WorkflowNode, 'id'>) => void;
  variableSchema: DataSchema;
  nodeTypeConfig: NodeTypeMetadata;
}

export function HttpRequestConfig({ value, onChange, variableSchema, nodeTypeConfig }: HttpRequestConfigProps) {
  return (
    <div className="space-y-2 pt-4">
      <Minimizer title="Configure HTTP Request" defaultOpen={true}>
        <div
          className="relative z-[1] isolate"
          onFocus={(e) => e.stopPropagation()}
          onBlur={(e) => e.stopPropagation()}
        >
          <DataInput
            schema={nodeTypeConfig.configurationSchema as DataSchema}
            value={value.config?.inputMapping}
            variablesSchema={variableSchema}
            onChange={(configuration) => {
              onChange({
                ...value,
                config: {
                  ...value.config,
                  inputMapping: configuration,
                },
              });
            }}
          />
        </div>
      </Minimizer>

      <Minimizer title="Configure Response Schema" defaultOpen={false}>
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
    </div>
  );
}

export default HttpRequestConfig;


