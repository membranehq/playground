'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCustomer } from './providers/customer-provider';
import { getWorkspaceHeaders } from '@/lib/workspace-storage';

export type DialogMode = 'add' | 'delete-entities' | 'delete-customer';

interface CustomerManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: DialogMode;
  targetCustomerId?: string;
}

export function CustomerManagementDialog({
  open,
  onOpenChange,
  mode,
  targetCustomerId,
}: CustomerManagementDialogProps) {
  const { addCustomerId, removeCustomerId, customerId, switchCustomer } = useCustomer();
  const [newCustomerId, setNewCustomerId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setNewCustomerId('');
    setError(null);
    onOpenChange(false);
  };

  const handleAddCustomer = () => {
    if (!newCustomerId.trim()) {
      setError('Customer ID is required');
      return;
    }
    addCustomerId(newCustomerId.trim());
    // Switch to the new customer
    switchCustomer(newCustomerId.trim());
    handleClose();
  };

  const handleDeleteEntities = async () => {
    if (!targetCustomerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${encodeURIComponent(targetCustomerId)}/entities`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getWorkspaceHeaders(),
          'x-auth-id': customerId ?? '',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete entities');
      }

      handleClose();
      // Refresh to update UI
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!targetCustomerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${encodeURIComponent(targetCustomerId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getWorkspaceHeaders(),
          'x-auth-id': customerId ?? '',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete customer');
      }

      // Remove from local list
      removeCustomerId(targetCustomerId);
      handleClose();
      // Refresh to update UI
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
    } finally {
      setIsLoading(false);
    }
  };

  const getDialogContent = () => {
    switch (mode) {
      case 'add':
        return {
          title: 'Add New Customer',
          description: 'Enter a customer ID to create a new test customer. This ID will be used to isolate connections and data.',
          content: (
            <div className="py-4">
              <Input
                placeholder="Enter customer ID (e.g., customer-1, test-user)"
                value={newCustomerId}
                onChange={(e) => {
                  setNewCustomerId(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCustomer();
                  }
                }}
              />
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </div>
          ),
          actions: (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomer}>
                Add Customer
              </Button>
            </>
          ),
        };

      case 'delete-entities':
        return {
          title: 'Delete Customer Entities',
          description: `This will delete all connections, flow instances, and other data for customer "${targetCustomerId}". The customer record will remain so you can create new connections.`,
          content: (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. All tenant-level entities will be permanently deleted from Membrane.
              </p>
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </div>
          ),
          actions: (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteEntities}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Entities
              </Button>
            </>
          ),
        };

      case 'delete-customer':
        return {
          title: 'Delete Customer',
          description: `This will archive customer "${targetCustomerId}" in Membrane and remove it from your local list.`,
          content: (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                All connections and data for this customer will be deactivated. The customer will be removed from your picker list.
              </p>
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </div>
          ),
          actions: (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCustomer}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Customer
              </Button>
            </>
          ),
        };
    }
  };

  const dialogContent = getDialogContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogContent.title}</DialogTitle>
          <DialogDescription>{dialogContent.description}</DialogDescription>
        </DialogHeader>
        {dialogContent.content}
        <DialogFooter>
          {dialogContent.actions}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
