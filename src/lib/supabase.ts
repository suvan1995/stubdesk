import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Warn in dev if keys are missing/placeholder — app will still render
if (import.meta.env.DEV) {
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    console.warn(
      '[StubDesk] VITE_SUPABASE_URL is not set.\n' +
      'Create a project at supabase.com and add the URL to your .env file.\n' +
      'Auth and data features will not work until this is configured.'
    )
  }
}

export const supabase = createClient<Database>(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseKey  || 'placeholder',
  {
    auth: {
      persistSession:  true,
      autoRefreshToken: true,
      storage:         window.localStorage,
      storageKey:      'stubdesk-auth',
      detectSessionInUrl: true,
    },
  }
)
