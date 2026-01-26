import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { GlobeIcon, Sparkles, Plug, GitBranch, ArrowLeft, Plus, Search, Loader2, WandSparkles } from 'lucide-react';
import { useIntegrations, useIntegrationApp } from '@membranehq/react';
import type { Integration, App } from '@membranehq/sdk';
import { useExternalApps } from '@/hooks/use-external-apps';
import { useDebounce } from '@/hooks/use-debounce';

export type ViewMode = 'actions' | 'apps' | 'search' | 'build';

interface NodeCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (selectedType: string, config?: Record<string, unknown>) => void;
  initialViewMode?: ViewMode;
  onOpenMembraneAgent?: (message: string) => void;
}

export function NodeCreateDialog({
  isOpen,
  onClose,
  onCreate,
  initialViewMode = 'actions',
  onOpenMembraneAgent,
}: NodeCreateDialogProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingIntegration, setIsCreatingIntegration] = useState(false);
  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');

  // Set initial view mode when dialog opens
  useEffect(() => {
    if (isOpen) {
      setViewMode(initialViewMode);
    }
  }, [isOpen, initialViewMode]);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { integrations, refresh: refreshIntegrations } = useIntegrations();
  const integrationApp = useIntegrationApp();

  const {
    apps: externalApps,
    isLoading: isLoadingExternalApps,
    error: externalAppsError,
  } = useExternalApps({
    search: debouncedSearch,
    limit: 50,
    enabled: viewMode === 'search',
  });

  // Reset view when dialog closes
  const handleClose = () => {
    setViewMode('actions');
    setSearchQuery('');
    setIsCreatingIntegration(false);
    setAppName('');
    setAppUrl('');
    onClose();
  };

  const handleIntegrationSelect = (integration: Integration) => {
    onCreate('action', { integrationKey: integration.key });
    handleClose();
  };

  const handleAppIntegrationSelect = () => {
    // Create action node without app selected
    onCreate('action', {});
    handleClose();
  };

  const handleBackToActions = () => {
    setViewMode('actions');
  };

  const handleHttpRequestSelect = () => {
    onCreate('http', {});
    handleClose();
  };

  const handleAISelect = () => {
    onCreate('ai', {});
    handleClose();
  };

  const handleGateSelect = () => {
    onCreate('gate', {});
    handleClose();
  };

  const handleAddNewApp = () => {
    setViewMode('search');
  };

  const handleBackToApps = () => {
    setSearchQuery('');
    setViewMode('apps');
  };

  const handleExternalAppSelect = async (app: App) => {
    setIsCreatingIntegration(true);

    try {
      // Create integration from external app
      const newIntegration = await integrationApp.integrations.create({
        name: app.name,
        logoUri: app.logoUri,
        appUuid: app.uuid,
        connectorId: app.defaultConnectorId,
        key: app.key,
      });

      // Refresh integrations list
      await refreshIntegrations();

      // Create the node with the new integration
      onCreate('action', { integrationKey: newIntegration.key });
      handleClose();
    } catch (error) {
      console.error('Failed to create integration:', error);
      setIsCreatingIntegration(false);
    }
  };

  const handleBuildIntegration = () => {
    setAppName(searchQuery.trim());
    setAppUrl('');
    setViewMode('build');
  };

  const handleBackToSearch = () => {
    setViewMode('search');
  };

  const handleGenerate = () => {
    if (!onOpenMembraneAgent) return;

    const enrichedMessage = `I need to create a new app integration.

App Name: ${appName.trim()}
App URL: ${appUrl.trim() || 'Not provided'}

Please help me build this integration so I can use it in my workflow.`;

    onOpenMembraneAgent(enrichedMessage);
    handleClose();
  };

  const sortedIntegrations = integrations.sort((a, b) => {
    // Connected integrations first
    if (a.connection && !b.connection) return -1;
    if (!a.connection && b.connection) return 1;
    return 0;
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl h-[600px] p-0 overflow-hidden" hideClose>
        {/* Loading overlay when creating integration */}
        {isCreatingIntegration && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Creating integration...</p>
            </div>
          </div>
        )}

        <div className="flex flex-col h-full overflow-hidden">
          {/* Header with Back Button (shown in apps and search views) */}
          {viewMode === 'apps' && (
            <div className="p-6 pb-4 border-b flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={handleBackToActions} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Actions
              </Button>
            </div>
          )}
          {viewMode === 'search' && (
            <div className="p-6 pb-4 border-b flex-shrink-0 space-y-4">
              <Button variant="ghost" size="sm" onClick={handleBackToApps} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Apps
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search apps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
          )}
          {viewMode === 'build' && (
            <div className="p-6 pb-4 border-b flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={handleBackToSearch} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Search
              </Button>
            </div>
          )}

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6">
              {viewMode === 'actions' ? (
                /* Actions View */
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* App Integration option */}
                    <button
                      type="button"
                      onClick={handleAppIntegrationSelect}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 text-left w-full cursor-pointer"
                    >
                      <div className="w-12 h-12 flex items-center justify-center bg-green-100 rounded">
                        <Plug className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">App Integration</div>
                        <div className="text-xs text-muted-foreground">Connect to apps</div>
                      </div>
                    </button>

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
              ) : viewMode === 'apps' ? (
                /* Apps View */
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Apps</h3>
                  <div className="grid grid-cols-6 gap-3">
                    {/* Add new app button - always first */}
                    <button
                      onClick={handleAddNewApp}
                      className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border-2 border-dashed border-gray-300 hover:border-purple-400"
                    >
                      <div className="w-12 h-12 mb-2 flex items-center justify-center bg-purple-100 rounded">
                        <Plus className="w-6 h-6 text-purple-600" />
                      </div>
                      <span className="text-xs text-center text-purple-600 font-medium truncate w-full">
                        Add new app
                      </span>
                    </button>

                    {/* Existing integrations */}
                    {sortedIntegrations.map((integration) => (
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
              ) : viewMode === 'search' ? (
                /* Search View */
                <div className="space-y-4">
                  {isLoadingExternalApps ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : externalAppsError ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-destructive">Failed to load apps</p>
                      <p className="text-xs text-muted-foreground mt-1">Please try again</p>
                    </div>
                  ) : externalApps.length === 0 && !searchQuery.trim() ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-muted-foreground">Start typing to search apps</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-6 gap-3">
                      {externalApps.map((app) => (
                        <button
                          key={app.key}
                          onClick={() => handleExternalAppSelect(app)}
                          className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <div className="w-12 h-12 mb-2 relative">
                            {app.logoUri ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={app.logoUri}
                                alt={`${app.name} logo`}
                                className="w-full h-full object-contain rounded"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-lg font-medium text-gray-600">
                                {app.name[0]}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-center text-gray-700 truncate w-full">{app.name}</span>
                        </button>
                      ))}

                      {/* Build integration option - shown at the end when there's a search query */}
                      {searchQuery.trim() && (
                        <button
                          onClick={handleBuildIntegration}
                          className="flex flex-col items-center p-3 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer border-2 border-dashed border-purple-300 hover:border-purple-400"
                        >
                          <div className="w-12 h-12 mb-2 flex items-center justify-center bg-purple-100 rounded">
                            <Sparkles className="w-6 h-6 text-purple-600" />
                          </div>
                          <span className="text-xs text-center text-purple-600 font-medium w-full">
                            Build integration for &ldquo;{searchQuery.trim()}&rdquo;
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : viewMode === 'build' ? (
                /* Build View */
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold text-gray-900">Build Integration</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="app-name">App Name</Label>
                      <Input
                        id="app-name"
                        placeholder="Enter app name"
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="app-url">App URL (optional)</Label>
                      <Input
                        id="app-url"
                        placeholder="https://example.com"
                        value={appUrl}
                        onChange={(e) => setAppUrl(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleGenerate} disabled={!appName.trim()} className="gap-2">
                      <WandSparkles className="h-4 w-4" />
                      Generate
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Clicking Generate will launch an AI Agent session that will build the integration for you.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
