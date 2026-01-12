import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build time, use placeholder values to avoid prerender errors
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found, using placeholder')
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key-for-build'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
