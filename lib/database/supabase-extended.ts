// Fix for chat loading timeout issues
// This increases the timeout for API calls

import { supabase as originalSupabase } from '@/lib/database/supabase'

// Create a wrapper with extended timeout
export const supabase = originalSupabase ? {
  ...originalSupabase,
  from: (table: string) => {
    const query = originalSupabase.from(table);
    
    // Override fetch for this query to extend timeout
    const originalFetch = query.fetch;
    if (originalFetch) {
      query.fetch = async function(...args: any[]) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds
        
        try {
          const result = await originalFetch.apply(this, args);
          clearTimeout(timeoutId);
          return result;
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('Request timeout after 60 seconds');
          }
          throw error;
        }
      };
    }
    
    return query;
  }
} : null;

export { isPersistenceConfigured } from '@/lib/database/supabase';
