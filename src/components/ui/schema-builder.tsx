'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Plus, X } from 'lucide-react';
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

interface Property {
  key: string;
  schema: JSONSchema;
  required: boolean;
}

const JSON_SCHEMA_TYPES = [
  { value: 'string', label: 'string', color: 'text-green-600 dark:text-green-400' },
  { value: 'number', label: 'number', color: 'text-green-600 dark:text-green-400' },
  { value: 'integer', label: 'integer', color: 'text-green-600 dark:text-green-400' },
  { value: 'boolean', label: 'boolean', color: 'text-orange-600 dark:text-orange-400' },
  { value: 'array', label: 'array', color: 'text-blue-600 dark:text-blue-400' },
  { value: 'object', label: 'object', color: 'text-orange-600 dark:text-orange-400' },
] as const;

const getTypeColor = (type: string) => {
  const typeConfig = JSON_SCHEMA_TYPES.find((t) => t.value === type);
  return typeConfig?.color || 'text-muted-foreground';
};

interface NestedObjectEditorProps {
  property: Property;
  onSchemaChange: (schema: JSONSchema) => void;
  level: number;
  parentKey: string;
}

function NestedObjectEditor({ property, onSchemaChange, level, parentKey }: NestedObjectEditorProps) {
  const [nestedProperties, setNestedProperties] = useState<Property[]>(() => {
    if (property.schema.properties) {
      return Object.entries(property.schema.properties).map(([key, schema]) => ({
        key,
        schema,
        required: property.schema.required?.includes(key) ?? false,
      }));
    }
    return [];
  });
  const [nestedRequired, setNestedRequired] = useState<Set<string>>(
    new Set(property.schema.required || [])
  );
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [editingKeyValue, setEditingKeyValue] = useState<string>('');
  const inputRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const updateNestedSchema = useCallback((props: Property[], required: Set<string>) => {
    const properties: Record<string, JSONSchema> = {};
    props.forEach((p) => {
      if (p.key.trim()) {
        properties[p.key] = p.schema;
      }
    });
    
    onSchemaChange({
      type: 'object',
      properties,
      required: Array.from(required).length > 0 ? Array.from(required) : undefined,
    });
  }, [onSchemaChange]);

  useEffect(() => {
    if (property.schema.properties) {
      const props = Object.entries(property.schema.properties).map(([key, schema]) => ({
        key,
        schema,
        required: property.schema.required?.includes(key) ?? false,
      }));
      setNestedProperties(props);
      setNestedRequired(new Set(property.schema.required || []));
    }
  }, [property.schema]);

  const handleAddProperty = () => {
    const newProperty: Property = {
      key: `property${nestedProperties.length + 1}`,
      schema: { type: 'string' },
      required: false,
    };
    const updated = [...nestedProperties, newProperty];
    setNestedProperties(updated);
    setEditingKey(updated.length - 1);
    setEditingKeyValue(newProperty.key);
    updateNestedSchema(updated, nestedRequired);
    
    setTimeout(() => {
      const input = inputRefs.current[updated.length - 1];
      if (input) {
        input.focus();
        const range = document.createRange();
        range.selectNodeContents(input);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }, 0);
  };

  const handleRemoveProperty = (index: number) => {
    const prop = nestedProperties[index];
    const updated = nestedProperties.filter((_, i) => i !== index);
    const updatedRequired = new Set(nestedRequired);
    updatedRequired.delete(prop.key);
    setNestedProperties(updated);
    setNestedRequired(updatedRequired);
    updateNestedSchema(updated, updatedRequired);
  };

  const handleKeyEditStart = (index: number) => {
    setEditingKey(index);
    setEditingKeyValue(nestedProperties[index].key);
  };

  const handleKeyEditConfirm = (index: number) => {
    const prop = nestedProperties[index];
    const newKey = editingKeyValue.trim();
    
    if (!newKey || nestedProperties.some((p, i) => i !== index && p.key === newKey)) {
      setEditingKeyValue(prop.key);
      setEditingKey(null);
      return;
    }

    const oldKey = prop.key;
    const updated = nestedProperties.map((p, i) => (i === index ? { ...p, key: newKey } : p));
    const updatedRequired = new Set(nestedRequired);
    if (updatedRequired.has(oldKey)) {
      updatedRequired.delete(oldKey);
      updatedRequired.add(newKey);
    }

    setNestedProperties(updated);
    setNestedRequired(updatedRequired);
    setEditingKey(null);
    updateNestedSchema(updated, updatedRequired);
  };

  const handleTypeChange = (index: number, type: string) => {
    const prop = nestedProperties[index];
    let newSchema: JSONSchema = { type };

    if (type === 'array') {
      newSchema = { type: 'array', items: prop.schema.items || { type: 'string' } };
    } else if (type === 'object') {
      newSchema = { type: 'object', properties: {}, required: [] };
    }

    const updated = nestedProperties.map((p, i) => (i === index ? { ...p, schema: newSchema } : p));
    setNestedProperties(updated);
    updateNestedSchema(updated, nestedRequired);
  };

  const handleArrayItemsTypeChange = (index: number, itemsType: string) => {
    const prop = nestedProperties[index];
    if (prop.schema.type === 'array') {
      const updated = nestedProperties.map((p, i) =>
        i === index ? { ...p, schema: { ...p.schema, items: { type: itemsType } } } : p
      );
      setNestedProperties(updated);
      updateNestedSchema(updated, nestedRequired);
    }
  };

  const handleNestedSchemaChange = (index: number, schema: JSONSchema) => {
    // Update the nested property's schema
    const updated = nestedProperties.map((p, i) => (i === index ? { ...p, schema } : p));
    
    // If this is an object schema, extract required fields from it
    if (schema.type === 'object' && schema.properties) {
      const schemaRequired = schema.required || [];
      // Update required fields: remove old keys for this property, add new ones
      const updatedRequired = new Set(nestedRequired);
      const oldProp = nestedProperties[index];
      if (oldProp?.schema.type === 'object' && oldProp.schema.required) {
        oldProp.schema.required.forEach((key) => {
          if (!schemaRequired.includes(key)) {
            updatedRequired.delete(key);
          }
        });
      }
      schemaRequired.forEach((key) => {
        if (schema.properties?.[key]) {
          updatedRequired.add(key);
        }
      });
      
      setNestedProperties(updated);
      setNestedRequired(updatedRequired);
      updateNestedSchema(updated, updatedRequired);
    } else {
      setNestedProperties(updated);
      updateNestedSchema(updated, nestedRequired);
    }
  };

  const indentWidth = level * 20;

  return (
    <div className="space-y-0.5">
      {nestedProperties.map((prop, index) => {
        const isEditing = editingKey === index;
        const isDuplicate = nestedProperties.some((p, i) => i !== index && p.key === prop.key && prop.key.trim());
        const isRequired = nestedRequired.has(prop.key);
        const isObject = prop.schema.type === 'object';

        return (
          <div key={index}>
            {/* Property Row */}
            <div
              className="group relative flex items-center gap-1 py-0 px-0.5 rounded"
              style={{ paddingLeft: `${6 + indentWidth}px` }}
            >
              {/* Vertical line for indentation */}
              {level > 0 && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-px border-l border-dashed border-muted-foreground/30 pointer-events-none"
                  style={{ left: `${indentWidth}px` }}
                />
              )}

              {/* Property Key with Type Selector */}
              <div className="flex items-center gap-0 flex-1">
                <div className="flex-shrink-0 relative">
                  {isEditing ? (
                    <>
                      <div
                        ref={(el) => {
                          inputRefs.current[index] = el as HTMLDivElement | null;
                          if (el) {
                            el.focus();
                            const range = document.createRange();
                            range.selectNodeContents(el);
                            range.collapse(false);
                            const selection = window.getSelection();
                            selection?.removeAllRanges();
                            selection?.addRange(range);
                          }
                        }}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={() => handleKeyEditConfirm(index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleKeyEditConfirm(index);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingKey(null);
                            setEditingKeyValue(prop.key);
                          }
                        }}
                        onInput={(e) => {
                          setEditingKeyValue(e.currentTarget.textContent || '');
                        }}
                        className={cn(
                          "h-5 px-1 text-sm outline-none w-full max-w-[100px] focus:outline-none relative",
                          isDuplicate && "text-destructive",
                          !editingKeyValue && "text-transparent"
                        )}
                        data-placeholder="property name"
                      >
                        {editingKeyValue || '\u200b'}
                      </div>
                      {!editingKeyValue && (
                        <span className="absolute left-1 top-0 h-5 flex items-center text-sm text-muted-foreground pointer-events-none select-none">
                          property name
                        </span>
                      )}
                    </>
                  ) : (
                    <div
                      onClick={() => handleKeyEditStart(index)}
                      className={cn(
                        "text-left text-sm hover:text-foreground transition-colors w-full cursor-pointer relative",
                        isDuplicate && "text-destructive",
                        !prop.key && "text-transparent"
                      )}
                    >
                      {prop.key || '\u200b'}
                      {prop.key && isRequired && <span className="text-muted-foreground ml-0.5">*</span>}
                      {!prop.key && (
                        <span className="absolute left-0 top-0 text-sm text-muted-foreground pointer-events-none select-none">
                          property name
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Colon separator */}
                <span className="text-muted-foreground text-sm mr-0.5">:</span>

                {/* Type Selector - right beside property name */}
                <Select
                  value={prop.schema.type}
                  onValueChange={(value) => handleTypeChange(index, value)}
                >
                  <SelectTrigger className={cn(
                    "h-auto px-1 py-0 text-sm font-medium border-none shadow-none bg-transparent hover:bg-muted/50 rounded w-auto min-w-[65px] -ml-1 [&>svg]:h-3 [&>svg]:w-3",
                    getTypeColor(prop.schema.type)
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JSON_SCHEMA_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value} className={getTypeColor(type.value)}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Delete Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveProperty(index)}
                  className="h-3.5 w-3.5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-auto"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>

            {/* Recursively render nested object */}
            {isObject && (
              <NestedObjectEditor
                property={prop}
                onSchemaChange={(schema) => handleNestedSchemaChange(index, schema)}
                level={level + 1}
                parentKey={prop.key}
              />
            )}

            {/* Array Item Type */}
            {prop.schema.type === 'array' && (
              <div className="relative">
                <div
                  className="group relative flex items-center gap-1 py-0 px-0.5 rounded"
                  style={{ paddingLeft: `${6 + indentWidth + 20}px` }}
                >
                  {/* Vertical line for indentation */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-px border-l border-dashed border-muted-foreground/30 pointer-events-none"
                    style={{ left: `${indentWidth + 20}px` }}
                  />

                  {/* Item Property Row */}
                  <div className="flex items-center gap-0 flex-1">
                    <div className="flex-shrink-0">
                      <span className="text-left text-sm text-foreground">item</span>
                    </div>

                    {/* Colon separator */}
                    <span className="text-muted-foreground text-sm mr-0.5">:</span>

                    {/* Item Type Selector */}
                    <Select
                      value={prop.schema.items?.type || 'string'}
                      onValueChange={(value) => handleArrayItemsTypeChange(index, value)}
                    >
                      <SelectTrigger className={cn(
                        "h-auto px-1 py-0 text-sm font-medium border-none shadow-none bg-transparent hover:bg-muted/50 rounded w-auto min-w-[65px] -ml-1 [&>svg]:h-3 [&>svg]:w-3",
                        getTypeColor(prop.schema.items?.type || 'string')
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JSON_SCHEMA_TYPES.filter((t) => t.value !== 'array').map((type) => (
                          <SelectItem key={type.value} value={type.value} className={getTypeColor(type.value)}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

          </div>
        );
      })}

      {/* Add field button for this nested object */}
      <div className="relative mt-0.5" style={{ paddingLeft: `${6 + indentWidth + 20}px` }}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAddProperty}
          className="h-5 gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-1 py-0"
        >
          <Plus className="h-2.5 w-2.5" />
          <span>Add field to {parentKey}</span>
        </Button>
      </div>
    </div>
  );
}

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({ value, onChange, title, description }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [requiredFields, setRequiredFields] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [editingKeyValue, setEditingKeyValue] = useState<string>('');
  const lastValueRef = useRef<string>('');
  const inputRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Initialize from value prop
  useEffect(() => {
    const valueStr = JSON.stringify(value || null);
    if (valueStr === lastValueRef.current) return;
    lastValueRef.current = valueStr;

    if (value && value.type === 'object' && value.properties) {
      const props: Property[] = Object.entries(value.properties).map(([key, schema]) => ({
        key,
        schema,
        required: value.required?.includes(key) ?? false,
      }));
      setProperties(props);
      setRequiredFields(new Set(value.required || []));
    } else {
      setProperties([]);
      setRequiredFields(new Set());
    }
  }, [value]);

  // Convert properties to JSON Schema
  const updateSchema = useCallback(
    (updatedProperties: Property[], updatedRequired: Set<string>) => {
      if (updatedProperties.length === 0) {
        onChange?.({
          type: 'object',
          properties: {},
          required: [],
        });
        return;
      }

      const schemaProperties: Record<string, JSONSchema> = {};
      updatedProperties.forEach((prop) => {
        if (prop.key.trim()) {
          schemaProperties[prop.key] = prop.schema;
        }
      });

      const required = Array.from(updatedRequired).filter((key) =>
        updatedProperties.some((p) => p.key === key)
      );

      const newSchema: JSONSchema = {
        type: 'object',
        properties: schemaProperties,
        required: required.length > 0 ? required : undefined,
      };

      lastValueRef.current = JSON.stringify(newSchema);
      onChange?.(newSchema);
    },
    [onChange]
  );

  const handleAddProperty = () => {
    const newProperty: Property = {
      key: `property${properties.length + 1}`,
      schema: { type: 'string' },
      required: false,
    };
    const updated = [...properties, newProperty];
    setProperties(updated);
    setEditingKey(updated.length - 1);
    setEditingKeyValue(newProperty.key);
    updateSchema(updated, requiredFields);
    
    setTimeout(() => {
      const input = inputRefs.current[updated.length - 1];
      if (input) {
        input.focus();
        const range = document.createRange();
        range.selectNodeContents(input);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }, 0);
  };

  const handleRemoveProperty = (index: number) => {
    const property = properties[index];
    const updated = properties.filter((_, i) => i !== index);
    const updatedRequired = new Set(requiredFields);
    updatedRequired.delete(property.key);
    setProperties(updated);
    setRequiredFields(updatedRequired);
    updateSchema(updated, updatedRequired);
  };

  const handleKeyEditStart = (index: number) => {
    setEditingKey(index);
    setEditingKeyValue(properties[index].key);
  };

  const handleKeyEditConfirm = (index: number) => {
    const property = properties[index];
    const newKey = editingKeyValue.trim();
    
    if (!newKey) {
      setEditingKeyValue(property.key);
      setEditingKey(null);
      return;
    }

    const keyExists = properties.some((p, i) => i !== index && p.key === newKey);
    if (keyExists) {
      setEditingKeyValue(property.key);
      setEditingKey(null);
      return;
    }

    const oldKey = property.key;
    const updated = properties.map((p, i) => (i === index ? { ...p, key: newKey } : p));
    const updatedRequired = new Set(requiredFields);
    if (updatedRequired.has(oldKey)) {
      updatedRequired.delete(oldKey);
      updatedRequired.add(newKey);
    }

    setProperties(updated);
    setRequiredFields(updatedRequired);
    setEditingKey(null);
    updateSchema(updated, updatedRequired);
  };

  const handleKeyEditCancel = (index: number) => {
    setEditingKeyValue(properties[index].key);
    setEditingKey(null);
  };

  const handlePropertyTypeChange = (index: number, type: string) => {
    const property = properties[index];
    let newSchema: JSONSchema = { type };

    if (type === 'array') {
      newSchema = {
        type: 'array',
        items: property.schema.items || { type: 'string' },
      };
    } else if (type === 'object') {
      newSchema = {
        type: 'object',
        properties: property.schema.properties || {},
        required: property.schema.required || [],
      };
    }

    const updated = properties.map((p, i) => (i === index ? { ...p, schema: newSchema } : p));
    setProperties(updated);
    updateSchema(updated, requiredFields);
  };

  const handleArrayItemsTypeChange = (index: number, itemsType: string) => {
    const property = properties[index];
    if (property.schema.type === 'array') {
      const updated = properties.map((p, i) =>
        i === index
          ? {
              ...p,
              schema: {
                ...p.schema,
                items: { type: itemsType },
              },
            }
          : p
      );
      setProperties(updated);
      updateSchema(updated, requiredFields);
    }
  };

  const handleNestedSchemaChange = (index: number, nestedSchema: JSONSchema) => {
    const updated = properties.map((p, i) =>
      i === index ? { ...p, schema: nestedSchema } : p
    );
    setProperties(updated);
    updateSchema(updated, requiredFields);
  };

  return (
    <div className="space-y-1.5">
      {(title || description) && (
        <div className="mb-2">
          {title && <h3 className="text-sm font-medium text-foreground mb-0.5">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      <div className="space-y-0.5">
        {properties.map((property, index) => {
          const isEditing = editingKey === index;
          const isDuplicate = properties.some((p, i) => i !== index && p.key === property.key && property.key.trim());
          const isRequired = requiredFields.has(property.key);
          const isObject = property.schema.type === 'object';

          return (
            <div key={index}>
              {/* Main Property Row */}
              <div
                className="group relative flex items-center gap-1 py-0 px-0.5 rounded"
              >
                {/* Property Key with Type Selector */}
                <div className="flex items-center gap-0 flex-1">
                  <div className="flex-shrink-0 relative">
                    {isEditing ? (
                      <>
                        <div
                          ref={(el) => {
                            inputRefs.current[index] = el as HTMLDivElement | null;
                            if (el) {
                              el.focus();
                              const range = document.createRange();
                              range.selectNodeContents(el);
                              range.collapse(false);
                              const selection = window.getSelection();
                              selection?.removeAllRanges();
                              selection?.addRange(range);
                            }
                          }}
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={() => handleKeyEditConfirm(index)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleKeyEditConfirm(index);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              handleKeyEditCancel(index);
                            }
                          }}
                          onInput={(e) => {
                            setEditingKeyValue(e.currentTarget.textContent || '');
                          }}
                          className={cn(
                            "h-5 px-1 text-sm outline-none w-full max-w-[100px] focus:outline-none",
                            isDuplicate && "text-destructive"
                          )}
                        >
                          {editingKeyValue}
                        </div>
                        {!editingKeyValue && (
                          <span className="absolute left-1 top-0 h-5 flex items-center text-sm text-muted-foreground pointer-events-none">
                            property name
                          </span>
                        )}
                      </>
                    ) : (
                      <div
                        onClick={() => handleKeyEditStart(index)}
                        className={cn(
                          "text-left text-sm hover:text-foreground transition-colors w-full cursor-pointer relative",
                          isDuplicate && "text-destructive",
                          !property.key && "text-transparent"
                        )}
                      >
                        {property.key || '\u200b'}
                        {property.key && isRequired && <span className="text-muted-foreground ml-0.5">*</span>}
                        {!property.key && (
                          <span className="absolute left-0 top-0 text-sm text-muted-foreground pointer-events-none select-none">
                            property name
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Colon separator */}
                  <span className="text-muted-foreground text-sm mr-0.5">:</span>

                  {/* Type Selector - right beside property name */}
                  <Select
                    value={property.schema.type}
                    onValueChange={(value) => handlePropertyTypeChange(index, value)}
                  >
                    <SelectTrigger className={cn(
                      "h-auto px-1 py-0 text-sm font-medium border-none shadow-none bg-transparent hover:bg-muted/50 rounded w-auto min-w-[65px] -ml-1 [&>svg]:h-3 [&>svg]:w-3",
                      getTypeColor(property.schema.type)
                    )}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JSON_SCHEMA_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className={getTypeColor(type.value)}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Delete Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveProperty(index)}
                    className="h-3.5 w-3.5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-auto"
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>

              {/* Nested Object Editor */}
              {isObject && (
                <NestedObjectEditor
                  property={property}
                  onSchemaChange={(schema) => handleNestedSchemaChange(index, schema)}
                  level={1}
                  parentKey={property.key}
                />
              )}

              {/* Array Item Type */}
              {property.schema.type === 'array' && (
                <div className="relative">
                  <div
                    className="group relative flex items-center gap-1 py-0 px-0.5 rounded"
                    style={{ paddingLeft: `${26}px` }}
                  >
                    {/* Vertical line for indentation */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-px border-l border-dashed border-muted-foreground/30 pointer-events-none"
                      style={{ left: `20px` }}
                    />

                    {/* Item Property Row */}
                    <div className="flex items-center gap-0 flex-1">
                      <div className="flex-shrink-0">
                        <span className="text-left text-sm text-foreground">item</span>
                      </div>

                      {/* Colon separator */}
                      <span className="text-muted-foreground text-sm mr-0.5">:</span>

                      {/* Item Type Selector */}
                      <Select
                        value={property.schema.items?.type || 'string'}
                        onValueChange={(value) => handleArrayItemsTypeChange(index, value)}
                      >
                        <SelectTrigger className={cn(
                          "h-auto px-1 py-0 text-sm font-medium border-none shadow-none bg-transparent hover:bg-muted/50 rounded w-auto min-w-[65px] -ml-1 [&>svg]:h-3 [&>svg]:w-3",
                          getTypeColor(property.schema.items?.type || 'string')
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {JSON_SCHEMA_TYPES.filter((t) => t.value !== 'array').map((type) => (
                            <SelectItem key={type.value} value={type.value} className={getTypeColor(type.value)}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Property Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAddProperty}
          className="h-5 gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-1 py-0"
        >
          <Plus className="h-2.5 w-2.5" />
          <span>Add property</span>
        </Button>
      </div>
    </div>
  );
};

export default SchemaBuilder;
