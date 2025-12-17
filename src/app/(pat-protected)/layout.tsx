import { CustomerProvider } from '@/components/providers/customer-provider';
import { SettingsProvider } from '@/components/providers/settings-provider';
import { VirtualWindow } from '@/components/virtual-window';
import { cn } from '@/lib/utils';
import { AdminControls } from '@/components/admin-controls';
import { Toaster } from '@/components/ui/sonner';
import { AuthProtectedRoute } from '@/components/guards/auth-protected-route';
import {
  FRAME_HEIGHT,
  FRAME_MARGIN_AROUND,
  FRAME_MARGIN_TOP,
  FRAME_WINDOW_HEADER_HEIGHT,
} from '@/helpers/common-styles';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProtectedRoute>
      <SettingsProvider>
        <div
          className="h-screen w-screen overflow-hidden relative"
          style={
            {
              '--frame-margin-around': FRAME_MARGIN_AROUND,
              '--frame-margin-top': FRAME_MARGIN_TOP,
              '--frame-window-header-height': FRAME_WINDOW_HEADER_HEIGHT,
            } as React.CSSProperties
          }
        >
          <div
            className='absolute -z-10 inset-0 h-full w-full
        bg-[linear-gradient(to_right,#73737320_1px,transparent_1px),linear-gradient(to_bottom,#73737320_1px,transparent_1px)]
        bg-[size:20px_20px]'
          />
          <AdminControls />
          <div
            className={cn(
              'm-[calc(var(--frame-margin-around)/2)] mt-[calc(var(--frame-margin-top))]',
              FRAME_HEIGHT,
            )}
          >
            <VirtualWindow>
              <CustomerProvider>{children}</CustomerProvider>
              <Toaster />
            </VirtualWindow>
          </div>
        </div>
      </SettingsProvider>
    </AuthProtectedRoute>
  );
}
