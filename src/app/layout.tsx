import { ThemeProvider } from '@/components/providers/theme-provider';
import { inter } from '@/lib/fonts';
import { AuthProvider } from '@/components/providers/auth-provider';
import { WorkspaceProvider } from '@/components/providers/workspace-provider';

import './globals.css';
import '@membranehq/react/styles.css';

export const metadata = {
  title: {
    default: 'Playground',
    template: '%s | Playground',
  },
  description: 'Integration.app Playground',
  icons: {
    icon: '/favicon.png',
  },
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
          defaultTheme='light'
          forcedTheme='light'
          enableSystem={false}
        >
          <AuthProvider>
            <WorkspaceProvider>{children}</WorkspaceProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
