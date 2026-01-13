import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TriggerType } from '@/lib/workflow/node-types';

interface TriggerCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  triggerTypes: Record<string, TriggerType>;
  onCreate: (selectedType: string) => void;
}

export function TriggerCreateDialog({ isOpen, onClose, triggerTypes, onCreate }: TriggerCreateDialogProps) {
  const items = Object.values(triggerTypes);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <div className="pt-2">
          <ScrollArea className="h-[420px] pr-2">
            <div className="space-y-2">
              {items.map((item) => {
                const Icon = item.icon as React.ComponentType<{ className?: string }>;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => onCreate(item.type)}
                    className="w-full flex items-center gap-3 rounded-lg border p-3 hover:bg-gray-50 text-left"
                  >
                    {Icon ? <Icon className="h-5 w-5 text-gray-700" /> : null}
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}


