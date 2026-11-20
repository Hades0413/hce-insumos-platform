'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { createQueryClient, useSessionSync } from '@hce/api-client/react';
import { ToastProvider } from '@hce/ui';

function SessionSync() {
  useSessionSync();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <SessionSync />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
