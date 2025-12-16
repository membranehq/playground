import { ReactNode } from 'react';

// This layout is a pass-through - the actual header is rendered by each page
// to allow customization of the right-side actions
export default function AgentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
