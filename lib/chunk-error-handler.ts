import React from 'react';

// Chunk error handler with automatic retry
export function setupChunkErrorHandler() {
  if (typeof window === 'undefined') return;

  // Track retry attempts
  const retryAttempts = new Map<string, number>();
  const MAX_RETRIES = 3;

  // Handle chunk loading errors
  window.addEventListener('error', (event) => {
    const error = event.error;
    
    if (error && error.name === 'ChunkLoadError') {
      console.error('ChunkLoadError detected:', error.message);
      
      // Extract chunk name from error message
      const chunkMatch = error.message.match(/Loading chunk (\S+) failed/);
      const chunkName = chunkMatch ? chunkMatch[1] : 'unknown';
      
      // Get retry count
      const retries = retryAttempts.get(chunkName) || 0;
      
      if (retries < MAX_RETRIES) {
        retryAttempts.set(chunkName, retries + 1);
        console.log(`Retrying chunk ${chunkName} (attempt ${retries + 1}/${MAX_RETRIES})...`);
        
        // Wait a bit before retrying
        setTimeout(() => {
          window.location.reload();
        }, 1000 * (retries + 1)); // Exponential backoff
      } else {
        console.error(`Failed to load chunk ${chunkName} after ${MAX_RETRIES} attempts`);
        
        // Show user-friendly error
        if (window.confirm('The application encountered an error loading resources. Would you like to refresh the page?')) {
          // Clear all caches and reload
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
            }).then(() => {
              window.location.reload(true);
            });
          } else {
            window.location.reload(true);
          }
        }
      }
      
      // Prevent default error handling
      event.preventDefault();
    }
  });

  // Handle unhandled promise rejections (often from dynamic imports)
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.name === 'ChunkLoadError') {
      console.error('Unhandled ChunkLoadError:', event.reason);
      // Let the error event handler deal with it
      throw event.reason;
    }
  });
}

// Lazy loading wrapper with retry logic
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  componentName?: string
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const MAX_RETRY_COUNT = 3;
    const RETRY_DELAY = 1000;

    for (let i = 0; i < MAX_RETRY_COUNT; i++) {
      try {
        return await importFunc();
      } catch (error: any) {
        console.error(`Failed to load component ${componentName || 'unknown'} (attempt ${i + 1}):`, error);
        
        if (i === MAX_RETRY_COUNT - 1) {
          // Last attempt failed
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
      }
    }
    
    throw new Error(`Failed to load component after ${MAX_RETRY_COUNT} attempts`);
  });
}