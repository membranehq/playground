import { FlowNodeType, FLOW_NODE_SPECS, FlowNode } from '@membranehq/sdk';

export function isTriggerNode(node: FlowNode | string): boolean {
  if (!node) return false;

  const t = typeof node === 'string' ? node : node.type;

  if (!t) return false;

  return !!FLOW_NODE_SPECS[t as FlowNodeType]?.isTrigger;
}

export function extractTriggerKeys(nodes: Record<string, FlowNode> | undefined) {
  return Object.entries(nodes ?? {})
    .filter(([, node]) => isTriggerNode(node))
    .map(([key]) => key);
}
