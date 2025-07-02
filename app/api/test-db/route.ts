import { NextResponse } from 'next/server'
import { supabase, isPersistenceConfigured } from '@/lib/database/supabase'

export async function GET() {
  try {
    const env = {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_API_KEY || !!process.env.SUPABASE_ANON_KEY,
      supabaseUrlFormat: process.env.SUPABASE_URL?.includes('.supabase.co') ? 'valid' : 'invalid',
      urlPrefix: process.env.SUPABASE_URL?.substring(0, 30) + '...',
    }

    const persistenceConfigured = isPersistenceConfigured()
    
    let dbTest = null
    if (supabase) {
      try {
        // Try a simple query to test the connection
        const { data, error } = await supabase
          .from('chats')
          .select('count(*)', { count: 'exact', head: true })
        
        if (error) {
          dbTest = { success: false, error: error.message, code: error.code }
        } else {
          dbTest = { success: true, message: 'Database connection successful' }
        }
      } catch (testError) {
        dbTest = { success: false, error: testError instanceof Error ? testError.message : 'Unknown error' }
      }
    }

    return NextResponse.json({
      env,
      persistenceConfigured,
      supabaseClient: !!supabase,
      dbTest,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}