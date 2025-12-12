export const VIRTUAL_WINDOW_ID = 'virtual-window';

export function VirtualWindow({ children }: { children: React.ReactNode }) {
  return (
    <div className='w-full h-full rounded-lg shadow-xl overflow-hidden bg-background'>
      <div className='flex items-center h-[var(--frame-window-header-height)] bg-muted rounded-t-lg px-3'>
        <div className='flex space-x-2'>
          <div className='w-3 h-3 bg-red-500 rounded-full'></div>
          <div className='w-3 h-3 bg-yellow-500 rounded-full'></div>
          <div className='w-3 h-3 bg-green-500 rounded-full'></div>
        </div>
      </div>
      <div className='overflow-hidden h-[calc(100%-var(--frame-window-header-height))] relative bg-background' id={VIRTUAL_WINDOW_ID}>
        {children}
      </div>
    </div>
  );
}
