'use client';

import {
  ActionRunResponse,
  DataInput,
  useAction,
  useIntegrationApp,
} from '@membranehq/react';
import JsonView from '@uiw/react-json-view';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useCallback, useState } from 'react';
import { ArrowLeft, Loader } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OpenGhButton } from '@/components/open-gh-button';
import { Tabs, TabsContent } from '@/components/ui/tabs';

export function ExecuteActionModal({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { action, loading: actionLoading, error: actionError } = useAction(id);
  const integrationApp = useIntegrationApp();

  const [tab, setTab] = useState<'input' | 'result'>('input');

  const [input, setInput] = useState({});
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState<
    ActionRunResponse | undefined
  >(undefined);
  const [executionError, setExecutionError] = useState<Error | undefined>(
    undefined,
  );

  const handleExecute = useCallback(async () => {
    if (!action?.integration?.key || !action?.key) {
      toast.warning('Integration key or action key is missing.');
      return;
    }

    try {
      setTab('result');
      setExecutionResult(undefined);
      setExecutionLoading(true);
      setExecutionError(undefined);

      const result = await integrationApp
        .connection(action.integration.key)
        .action(action.key)
        .run(input);

      setExecutionResult(result);
    } catch (error) {
      console.error(error);
      setExecutionError(error as Error);
    } finally {
      setExecutionLoading(false);
    }
  }, [action, input, integrationApp]);

  return (
    <Dialog
      onOpenChange={(value) => {
        if (!value) {
          setExecutionResult(undefined);
          setInput({});
          setTab('input');
        }
      }}
      modal
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <Tabs defaultValue='input' value={tab}>
        <DialogContent className='sm:max-w-3xl'>
          <DialogHeader>
            <div className='flex flex-row justify-between pr-10 items-baseline'>
              <DialogTitle>Run action: {action?.name}</DialogTitle>
              <OpenGhButton metaUrl={import.meta.url} />
            </div>

            {!actionLoading && !actionError && !action?.inputSchema && (
              <Alert className='mt-2'>
                <AlertTitle>Please note</AlertTitle>
                <AlertDescription>
                  This action has no input, but you can still execute it.
                </AlertDescription>
              </Alert>
            )}
          </DialogHeader>

          <TabsContent value='input'>
            <div className='flex gap-6 flex-col sm:flex-row'>
              {action?.inputSchema && (
                <div className='flex-1 flex flex-col gap-2'>
                  <h2 className='font-semibold'>Input</h2>
                  <DataInput
                    schema={action?.inputSchema}
                    value={input}
                    onChange={setInput}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value='result'>
            <div className='flex-1 flex flex-col gap-2'>
              {!executionError && (
                <>
                  <div className='flex-1 flex flex-col gap-2'>
                    <h2 className='font-semibold'>Output</h2>
                    <ScrollArea className='max-h-80 overflow-scroll h-full flex-1 min-h-40 border rounded-md p-2'>
                      {executionResult && (
                        <JsonView value={executionResult?.output || {}} />
                      )}
                    </ScrollArea>
                  </div>
                  {'logs' in (executionResult || {}) && (
                    <div className='flex-1 flex flex-col gap-2'>
                      <h2 className='font-semibold'>Logs</h2>
                      <ScrollArea className='max-h-80 overflow-scroll h-full flex-1 min-h-40 border rounded-md p-2'>
                        {executionResult && (
                          <JsonView value={(executionResult as any)?.logs || {}} />
                        )}
                      </ScrollArea>
                    </div>
                  )}
                </>
              )}
              {!!executionError && (
                <Alert className='mt-2'>
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{executionError.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <DialogFooter className='flex-row justify-end'>
            <TabsContent value='result'>
              <Button
                onClick={() => {
                  setTab('input');
                }}
                variant='outline'
              >
                <ArrowLeft />
                Edit input
              </Button>
            </TabsContent>
            <Button
              onClick={handleExecute}
              disabled={actionLoading || executionLoading}
            >
              Run
              {executionLoading && <Loader className='ml-2 animate-spin' />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Tabs>
    </Dialog>
  );
}
