'use client';

import {
  DataInput,
  FlowRun,
  useFlow,
  useIntegrationApp,
} from '@integration-app/react';
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
import { extractTriggerKeys } from '@/helpers/flow';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ExecuteFlowModal({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { flow, loading: flowLoading, error: flowError } = useFlow(id);
  const integrationApp = useIntegrationApp();

  const [tab, setTab] = useState<'input' | 'result'>('input');

  const [input, setInput] = useState({});
  const [trigger, setTrigger] = useState<string | undefined>(undefined);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState<FlowRun | undefined>(
    undefined,
  );
  const [executionError, setExecutionError] = useState<Error | undefined>(
    undefined,
  );

  const handleExecute = useCallback(async () => {
    if (!flow?.integration?.key) {
      toast.warning('Integration key is missing.');
      return;
    }

    if (!trigger) {
      toast.warning('Trigger is missing.');
      return;
    }

    try {
      setTab('result');
      setExecutionResult(undefined);
      setExecutionLoading(true);
      setExecutionError(undefined);

      const result = await integrationApp
        .connection(flow.integration.key)
        .flow(flow.key)
        .run({
          nodeKey: trigger,
          input,
        });

      setExecutionResult(result);
    } catch (error) {
      console.error(error);
      setExecutionError(error as Error);
    } finally {
      setExecutionLoading(false);
    }
  }, [flow, input, integrationApp, trigger]);

  const triggers = extractTriggerKeys(flow?.nodes).map((triggerKey) => ({
    value: triggerKey,
    label: flow?.nodes?.[triggerKey]?.name,
  }));

  return (
    <Dialog
      onOpenChange={(value) => {
        if (!value) {
          setExecutionResult(undefined);
          setInput({});
          setTab('input');
          setTrigger(undefined);
        }
      }}
      modal
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <Tabs defaultValue='input' value={tab}>
        <DialogContent className='sm:max-w-3xl'>
          <DialogHeader>
            <div className='flex flex-row justify-between pr-10 items-baseline'>
              <DialogTitle>Run flow: {flow?.name}</DialogTitle>
              <OpenGhButton metaUrl={import.meta.url} />
            </div>

            {!flowLoading && !flowError && !flow?.parametersSchema && (
              <Alert className='mt-2'>
                <AlertTitle>Please note</AlertTitle>
                <AlertDescription>
                  This flow has no input, but you can still execute it.
                </AlertDescription>
              </Alert>
            )}
          </DialogHeader>

          <TabsContent value='input'>
            <div className='flex gap-6 flex-col'>
              <div className='grid gap-2 max-w-3/7'>
                <Label htmlFor='trigger'>Flow trigger</Label>
                <Select
                  value={trigger}
                  onValueChange={(key) => {
                    setTrigger(key);
                  }}
                >
                  <SelectTrigger
                    id='trigger'
                    className='w-full'
                    loading={flowLoading}
                  >
                    <SelectValue placeholder='Select a flow trigger' />
                  </SelectTrigger>
                  <SelectContent>
                    {triggers.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {flow?.parametersSchema && (
                <div className='flex-1 flex flex-col gap-2'>
                  <h2 className='font-semibold'>Input</h2>
                  <DataInput
                    schema={flow?.parametersSchema}
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
                        <JsonView value={executionResult || {}} />
                      )}
                    </ScrollArea>
                  </div>
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
              disabled={flowLoading || executionLoading}
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
