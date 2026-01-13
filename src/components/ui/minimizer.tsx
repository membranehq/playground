import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Settings, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MinimizerProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  icon?: React.ReactNode;
  tooltip?: string;
}

export function Minimizer({
  title,
  children,
  defaultOpen = true,
  className,
  titleClassName,
  contentClassName,
  icon,
  tooltip,
}: MinimizerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border rounded-lg', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors rounded-t-lg',
          titleClassName
        )}
      >
        <div className="flex items-center gap-2">
          {icon || <Settings className="h-4 w-4 text-muted-foreground" />}
          <span className="font-medium text-sm text-foreground">{title}</span>
          {tooltip && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center hover:bg-gray-200 rounded-full p-0.5 transition-colors cursor-pointer"
                    aria-label="Help"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className={cn('p-2', contentClassName)}>{children}</div>}
    </div>
  );
}

export default Minimizer;


