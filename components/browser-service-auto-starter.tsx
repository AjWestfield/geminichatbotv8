'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ServiceStatus {
  running: boolean;
  pid?: number;
  port: number;
}

export function BrowserServiceAutoStarter() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkServiceStatus = async () => {
      try {
        const response = await fetch('/api/browser-service');
        if (response.ok) {
          const data = await response.json();
          if (mounted) {
            setStatus(data);
          }
        }
      } catch (error) {
        console.error('[BrowserServiceAutoStarter] Status check failed:', error);
      }
    };

    const startService = async () => {
      if (isStarting) return;
      
      setIsStarting(true);
      try {
        // Check if the service is needed (only in development)
        if (process.env.NODE_ENV !== 'development') {
          console.log('[BrowserServiceAutoStarter] Skipping in production');
          return;
        }

        console.log('[BrowserServiceAutoStarter] Starting browser service...');
        
        const response = await fetch('/api/browser-service', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' })
        });
        
        if (response.ok) {
          toast.success('Browser Service Started', {
            description: 'Deep research is now available',
            duration: 5000
          });
        } else {
          throw new Error('Failed to start service');
        }
      } catch (error) {
        console.error('[BrowserServiceAutoStarter] Failed to start:', error);
        toast.error('Failed to start browser service', {
          description: 'Deep research may not be available',
          duration: 5000
        });
      } finally {
        setIsStarting(false);
      }
    };

    // Initial check
    checkServiceStatus();

    // Start the service if not running
    setTimeout(() => {
      if (!status?.running && !isStarting) {
        startService();
      }
    }, 1000);

    // Check status periodically
    const statusInterval = setInterval(checkServiceStatus, 5000);

    return () => {
      mounted = false;
      clearInterval(statusInterval);
    };
  }, [isStarting, status?.running]);

  // Status indicator (optional - can be hidden)
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div 
      className={`fixed bottom-4 right-4 px-3 py-1 rounded-full text-xs transition-opacity ${
        status?.running 
          ? 'bg-green-500/10 text-green-500 opacity-50 hover:opacity-100' 
          : 'bg-yellow-500/10 text-yellow-500'
      }`}
      title={status?.running 
        ? `Browser Service Running (PID: ${status.pid})` 
        : 'Browser Service Starting...'
      }
    >
      {status?.running ? '🟢 Browser Service' : '🟡 Starting...'}
    </div>
  );
}
