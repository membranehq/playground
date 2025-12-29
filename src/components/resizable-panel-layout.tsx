'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface ResizablePanelLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode | null;
  defaultSidebarWidth?: number;
  minSidebarWidth?: number;
  maxSidebarWidth?: number;
}

/**
 * Layout component with a main content area and optional resizable sidebar.
 * The sidebar appears on the right with a draggable divider for resizing.
 */
export function ResizablePanelLayout({
  children,
  sidebar,
  defaultSidebarWidth = 600,
  minSidebarWidth = 400,
  maxSidebarWidth = 900,
}: ResizablePanelLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      const clampedWidth = Math.min(maxSidebarWidth, Math.max(minSidebarWidth, newWidth));
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // Add cursor style to body while dragging
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minSidebarWidth, maxSidebarWidth]);

  return (
    <div ref={containerRef} className="flex h-full w-full">
      {/* Main content area */}
      <div className="flex-1 min-w-0 overflow-hidden">{children}</div>

      {/* Sidebar with draggable divider */}
      {sidebar && (
        <>
          {/* Draggable divider */}
          <div
            className={`
              w-px flex-shrink-0 cursor-col-resize transition-colors
              ${isDragging ? 'bg-neutral-400' : 'bg-neutral-200 hover:bg-neutral-400'}
            `}
            onMouseDown={handleMouseDown}
          />

          {/* Sidebar panel */}
          <div style={{ width: sidebarWidth }} className="flex-shrink-0 overflow-hidden">
            {sidebar}
          </div>
        </>
      )}
    </div>
  );
}
