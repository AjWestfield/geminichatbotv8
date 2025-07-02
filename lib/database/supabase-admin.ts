// Fix for chat persistence optimization to prevent timeouts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Create an admin client with service role key for better performance
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        // Increase timeout to 60 seconds for large operations
        fetch: (url: RequestInfo | URL, init?: RequestInit) => {
          return fetch(url, {
            ...init,
            signal: init?.signal || AbortSignal.timeout(60000) // 60 second timeout
          })
        }
      }
    })
  : null

// Helper to get the appropriate client
export const getSupabaseClient = () => {
  // Use admin client if available for better performance
  if (supabaseAdmin) return supabaseAdmin
  
  // Fall back to regular client
  const { supabase } = require('@/lib/database/supabase')
  return supabase
}
