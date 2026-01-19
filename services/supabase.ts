/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

const isConfigured =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your_supabase_anon_key_here')

console.log(
  'Initializing Supabase client with URL:',
  supabaseUrl,
  'key length:',
  supabaseAnonKey?.length || 0,
  'isConfigured:',
  isConfigured
)

// PURE REST MODE – NO REALTIME, NO WEBSOCKETS
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, { realtime: false as any })
  : null
