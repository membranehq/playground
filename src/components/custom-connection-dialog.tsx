'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIntegrationApp, useIntegration } from '@membranehq/react';
import { Loader2 } from 'lucide-react';

interface CustomConnectionDialogProps {
  integrationKey: string;
  integrationName: string;
  integrationLogo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CustomConnectionDialog({
  integrationKey,
  integrationName,
  integrationLogo,
  open,
  onOpenChange,
  onSuccess,
}: CustomConnectionDialogProps) {
  const membrane = useIntegrationApp();
  const { integration, loading: integrationLoading } = useIntegration(integrationKey);
  const [connectionParameters, setConnectionParameters] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setConnectionParameters({});
      setError(null);
      setConnecting(false);
    }
  }, [open]);

  const authOption = integration?.authOptions?.[0];
  const schema = authOption?.ui?.schema;
  const fields = schema ? Object.keys(schema.properties ?? {}) : [];
  const hasFields = fields.length > 0;

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      await membrane.integration(integrationKey).connect({
        parameters: connectionParameters,
        authOptionKey: authOption?.key,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <div className='flex items-center gap-3'>
            <Avatar size='lg' variant='square' className='ring-1 ring-neutral-200'>
              <AvatarImage src={integrationLogo} />
              <AvatarFallback size='lg' variant='square' className='bg-neutral-100 text-neutral-600'>
                {integrationName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>Connect to {integrationName}</DialogTitle>
              <DialogDescription>Custom Connection UI</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {integrationLoading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        ) : !authOption ? (
          <div className='py-4 text-center text-sm text-muted-foreground'>
            No authentication options available for this integration.
          </div>
        ) : (
          <div className='space-y-4 py-4'>
            {authOption.description && (
              <p className='text-sm text-muted-foreground'>{authOption.description}</p>
            )}


            {hasFields ? (
              <div className='space-y-3'>
                <p className='text-sm font-medium text-neutral-700'>Connection Parameters</p>
                {fields.map((field) => {
                  const fieldSchema = schema?.properties?.[field] as { type?: string; description?: string } | undefined;
                  return (
                    <div key={field} className='space-y-1.5'>
                      <Label htmlFor={field} className='text-sm capitalize'>
                        {field.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                      </Label>
                      <Input
                        id={field}
                        type={field.toLowerCase().includes('password') || field.toLowerCase().includes('secret') || field.toLowerCase().includes('key') ? 'password' : 'text'}
                        placeholder={fieldSchema?.description || `Enter ${field}`}
                        value={connectionParameters[field] || ''}
                        onChange={(e) =>
                          setConnectionParameters({
                            ...connectionParameters,
                            [field]: e.target.value,
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>
                No additional parameters required. Click connect to authenticate.
              </p>
            )}

            {error && (
              <div className='rounded-md bg-red-50 p-3 text-sm text-red-600'>{error}</div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={connecting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={connecting || integrationLoading || !authOption}>
            {connecting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
