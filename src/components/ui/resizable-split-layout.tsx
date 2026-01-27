'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResizableSplitLayoutProps {
  header?: React.ReactNode;
  leftPane: React.ReactNode;
  rightPane?: React.ReactNode;
  rightWidth?: number; // Controlled width
  defaultRightWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
  className?: string;
}

export function ResizableSplitLayout({
  header,
  leftPane,
  rightPane,
  rightWidth: controlledRightWidth,
  defaultRightWidth = 420,
  minRightWidth = 300,
  maxRightWidth = 800,
  className,
}: ResizableSplitLayoutProps) {
  const [internalRightWidth, setInternalRightWidth] = useState(defaultRightWidth);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use controlled width if provided, otherwise use internal state
  const rightWidth = controlledRightWidth ?? internalRightWidth;

  // Update internal width when controlled width changes
  useEffect(() => {
    if (controlledRightWidth !== undefined) {
      setInternalRightWidth(controlledRightWidth);
    }
  }, [controlledRightWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;

      if (newWidth >= minRightWidth && newWidth <= maxRightWidth) {
        setInternalRightWidth(newWidth);
      }
    },
    [isResizing, minRightWidth, maxRightWidth],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className={cn('flex flex-col h-full w-full', className)}>
      {/* Header */}
      {header && (
        <div className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center flex-shrink-0">
          {header}
        </div>
      )}

      {/* Main content area */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden min-h-0">
        {/* Left pane */}
        <div className="flex-1 overflow-hidden min-h-0">{leftPane}</div>

        {/* Right pane with resize handle */}
        {rightPane && (
          <>
            {/* Resize handle - transparent but still functional */}
            <div
              className={cn(
                'w-1 bg-transparent hover:bg-blue-500/30 dark:hover:bg-blue-600/30 cursor-col-resize transition-colors relative group',
                isResizing && 'bg-blue-500/50 dark:bg-blue-600/50',
              )}
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-y-0 -left-2 -right-2" />
            </div>

            {/* Right pane */}
            <div
              style={{ width: rightWidth }}
              className={cn(
                'flex flex-col h-full overflow-hidden min-h-0',
                !isResizing && 'transition-all duration-300',
              )}
            >
              <div className="flex-1 overflow-y-auto min-h-0">{rightPane}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
