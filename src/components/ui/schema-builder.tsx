'use client';

import React, { useState, useEffect } from 'react';
import { Textarea } from './textarea';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface JSONSchema {
  type: string;
  title?: string;
  description?: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  format?: string;
  required?: string[];
}

interface SchemaBuilderProps {
  value?: JSONSchema;
  onChange?: (value: JSONSchema | null) => void;
  title?: string;
  description?: string;
}

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({ value, onChange, title, description }) => {
  const [jsonText, setJsonText] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Initialize textarea with value prop
  useEffect(() => {
    if (value) {
      setJsonText(JSON.stringify(value, null, 2));
      setIsValid(true);
    } else {
      setJsonText('{\n  "type": "object",\n  "properties": {}\n}');
    }
  }, [value]);

  const generateRandomSchema = () => {
    const schemas: JSONSchema[] = [
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      {
        type: 'object',
        properties: {
          age: { type: 'number' },
        },
      },
      {
        type: 'object',
        properties: {
          isActive: { type: 'boolean' },
        },
      },
      {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      },
    ];

    const randomSchema = schemas[Math.floor(Math.random() * schemas.length)];
    const formattedJson = JSON.stringify(randomSchema, null, 2);
    handleTextChange(formattedJson);
  };

  const validateJson = (text: string): boolean => {
    if (!text.trim()) return false;

    try {
      const parsed = JSON.parse(text);
      // Basic validation - check if it has a type property
      return typeof parsed === 'object' && parsed !== null && typeof parsed.type === 'string';
    } catch {
      return false;
    }
  };

  const handleTextChange = (text: string) => {
    setJsonText(text);

    const valid = validateJson(text);
    setIsValid(valid);

    if (valid) {
      try {
        const parsedSchema = JSON.parse(text);
        onChange?.(parsedSchema);
      } catch {
        // This shouldn't happen since we validated, but just in case
        onChange?.(null);
      }
    } else {
      onChange?.(null);
    }
  };

  return (
    <div className="relative">
      {(title || description) && (
        <div className="mb-2">
          {title && <h3 className="text-sm font-medium text-foreground">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}

      <div className="relative">
        <Textarea
          value={jsonText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Enter JSON schema..."
          className={cn(
            'font-mono text-sm min-h-[200px] resize-y p-0 pr-6',
            isValid === false && 'border-red-300 focus:border-red-500',
            isValid === true && 'border-green-300 focus:border-green-500'
          )}
        />

        {/* Validation indicator and random schema button */}
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={generateRandomSchema}
            className="h-6 px-2 text-xs rounded-full"
          >
            Random
          </Button>
          <div className="pointer-events-none">
            {isValid === true && <div className="h-2 w-2 rounded-full bg-green-500" />}
            {isValid === false && <div className="h-2 w-2 rounded-full bg-red-500" />}
          </div>
        </div>
      </div>

      {isValid === false && (
        <p className="text-xs text-red-500 mt-1">
          Invalid JSON schema. Please check your syntax and ensure the schema has a &quot;type&quot; property.
        </p>
      )}
    </div>
  );
};

export default SchemaBuilder;


