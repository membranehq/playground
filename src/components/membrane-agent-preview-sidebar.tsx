'use client';

import { X } from 'lucide-react';
import { Button } from './ui/button';

interface MembraneAgentPreviewSidebarProps {
  message: string;
  onClose: () => void;
}

/**
 * Preview sidebar that shows what message will be sent to Membrane Agent.
 * This is used before actually creating a session.
 */
export function MembraneAgentPreviewSidebar({ message, onClose }: MembraneAgentPreviewSidebarProps) {
  return (
    <div className="h-full flex flex-col bg-white animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-neutral-900">Membrane Agent Preview</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
            Preview
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Message Preview */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="text-sm text-neutral-600">
            <p className="font-medium mb-2">Message that will be sent to Membrane Agent:</p>
          </div>
          
          {/* User message preview */}
          <div className="p-3 rounded-xl bg-neutral-200 text-sm">
            <div className="whitespace-pre-wrap text-neutral-800">{message}</div>
          </div>

          <div className="text-xs text-neutral-500 italic">
            Note: This is a preview. The Membrane Agent session has not been created yet.
          </div>
        </div>
      </div>
    </div>
  );
}

