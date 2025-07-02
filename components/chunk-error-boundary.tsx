'use client';

import { useEffect } from 'react';
import { setupChunkErrorHandler } from '@/lib/chunk-error-handler';

export function ChunkErrorBoundary({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setupChunkErrorHandler();
  }, []);

  return <>{children}</>;
}
