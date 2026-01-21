import { WorkflowNode } from '../types/workflow';

/**
 * Validates if a workflow node has all required fields configured
 * @param node The workflow node to validate
 * @returns true if all required fields are configured, false otherwise
 */
export function isNodeConfigured(node: WorkflowNode): boolean {
  // Check if node exists
  if (!node) return false;

  // Manual trigger - no required fields
  if (node.type === 'trigger' && node.triggerType === 'manual') {
    return true;
  }

  // Event trigger - requires different fields based on event source
  if (node.type === 'trigger' && node.triggerType === 'event') {
    const config = node.config || {};
    const eventSource = config.eventSource as 'connector' | 'data-record' | undefined;
    const eventType = config.eventType as string;
    
    // Check if it's a connector event (either by eventSource or eventType)
    const isConnectorEvent = eventSource === 'connector' || eventType === 'connector-event-trigger';
    
    if (isConnectorEvent) {
      // Connector events require: integrationKey, connectorEventKey, and eventType
      return !!(config.integrationKey && config.connectorEventKey && config.eventType);
    } else {
      // Data record events require: integrationKey, dataCollection, and eventType
      return !!(config.integrationKey && config.dataCollection && config.eventType);
    }
  }

  // Membrane action - requires integrationKey and actionId
  if (node.nodeType === 'action' && node.type === 'action') {
    const config = node.config || {};
    return !!(config.integrationKey && config.actionId);
  }

  // HTTP request - requires uri and method
  if (node.nodeType === 'http') {
    const config = node.config || {};
    const inputMapping = config.inputMapping as Record<string, unknown> | undefined;
    return !!(inputMapping?.uri && inputMapping?.method);
  }

  // AI node - requires prompt
  if (node.nodeType === 'ai') {
    const config = node.config || {};
    const inputMapping = config.inputMapping as { prompt?: string } | undefined;
    return !!(inputMapping?.prompt && inputMapping.prompt.trim() !== '');
  }

  // Gate node - requires field, operator, and value
  if (node.nodeType === 'gate') {
    const config = node.config || {};
    const condition = config.condition as {
      field?: { $var: string } | string;
      operator?: 'equals' | 'not_equals';
      value?: string;
    } | undefined;

    if (!condition) return false;

    // Check if field is configured (either as string or variable reference)
    const hasField = !!(
      (typeof condition.field === 'object' && condition.field.$var) ||
      (typeof condition.field === 'string' && condition.field.trim() !== '')
    );

    // Check if operator and value are configured
    const hasOperator = !!condition.operator;
    const hasValue = condition.value !== undefined && condition.value !== '';

    return hasField && hasOperator && hasValue;
  }

  // Default: assume configured if we don't know the type
  return true;
}
