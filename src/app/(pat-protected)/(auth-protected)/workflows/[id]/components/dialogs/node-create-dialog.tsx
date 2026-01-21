import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GlobeIcon, Sparkles, Plug, GitBranch } from 'lucide-react';
import { useIntegrations } from '@membranehq/react';
import type { Integration } from '@membranehq/sdk';

interface NodeCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (selectedType: string, config?: Record<string, unknown>) => void;
}

export function NodeCreateDialog({ isOpen, onClose, onCreate }: NodeCreateDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { integrations } = useIntegrations();

  const handleIntegrationSelect = (integration: Integration) => {
    onCreate('action', { integrationKey: integration.key });
    onClose();
  };

  const handleHttpRequestSelect = () => {
    onCreate('http', {});
    onClose();
  };

  const handleAISelect = () => {
    onCreate('ai', {});
    onClose();
  };

  const handleGateSelect = () => {
    onCreate('gate', {});
    onClose();
  };

  const filteredIntegrations = integrations
    .filter((integration) => integration.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      // Connected integrations first
      if (a.connection && !b.connection) return -1;
      if (!a.connection && b.connection) return 1;
      return 0;
    });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[600px] p-0 overflow-hidden" hideClose>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Fixed Search Bar */}
          <div className="p-6 pb-4 border-b flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search apps..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pl-9 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            <div className="p-6 pt-4 space-y-6">
              {/* Others Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* HTTP Request option */}
                  <button
                    type="button"
                    onClick={handleHttpRequestSelect}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 text-left w-full cursor-pointer"
                  >
                    <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded">
                      <GlobeIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">HTTP Request</div>
                      <div className="text-xs text-muted-foreground">Make API calls</div>
                    </div>
                  </button>

                  {/* AI option */}
                  <button
                    type="button"
                    onClick={handleAISelect}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 text-left w-full cursor-pointer"
                  >
                    <div className="w-12 h-12 flex items-center justify-center bg-purple-100 rounded">
                      <Sparkles className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">AI</div>
                      <div className="text-xs text-muted-foreground">Process data with AI</div>
                    </div>
                  </button>

                  {/* Gate option */}
                  <button
                    type="button"
                    onClick={handleGateSelect}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 text-left w-full cursor-pointer"
                  >
                    <div className="w-12 h-12 flex items-center justify-center bg-orange-100 rounded">
                      <GitBranch className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Gate</div>
                      <div className="text-xs text-muted-foreground">Control flow with conditions</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Apps Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Apps</h3>
                <div className="grid grid-cols-6 gap-3">
                  {filteredIntegrations.map((integration) => (
                    <button
                      key={integration.key}
                      onClick={() => handleIntegrationSelect(integration)}
                      className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="w-12 h-12 mb-2 relative">
                        {integration.logoUri ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={integration.logoUri}
                            alt={`${integration.name} logo`}
                            className="w-full h-full object-contain rounded"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-lg font-medium text-gray-600">
                            {integration.name[0]}
                          </div>
                        )}
                        {integration.connection && (
                          <div className="absolute -top-0.5 -left-0.5 bg-green-500 rounded-full p-1">
                            <Plug className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-center text-gray-700 truncate w-full">{integration.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}


