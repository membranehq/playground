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

  // Event trigger - requires integrationKey, dataCollection, and eventType
  if (node.type === 'trigger' && node.triggerType === 'event') {
    const config = node.config || {};
    return !!(config.integrationKey && config.dataCollection && config.eventType);
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

  // Default: assume configured if we don't know the type
  return true;
}
