import { ThemeProvider } from '@/components/providers/theme-provider';
import { inter } from '@/lib/fonts';
import { ConsoleAuthProvider } from '@/components/providers/console-auth-provider';
import { WorkspaceProvider } from '@/components/providers/workspace-provider';

import './globals.css';
import '@integration-app/react/styles.css';

export const metadata = {
  title: {
    default: 'Playground',
    template: '%s | Playground',
  },
  description: 'Integration.app Playground',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased h-screen overflow-hidden bg-background`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='dark'
          enableSystem={false}
        >
          <ConsoleAuthProvider>
            <WorkspaceProvider>{children}</WorkspaceProvider>
          </ConsoleAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
