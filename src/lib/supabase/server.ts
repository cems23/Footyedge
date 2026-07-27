import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: Record<string, unknown>) {
          try { cookieStore.set(name, value, options as any) } catch {}
        },
        remove(name: string, options: Record<string, unknown>) {
          try { cookieStore.set(name, '', options as any) } catch {}
        },
      },
    }
  )
}

export function createServiceClient() {
  // IMPORTANTE: usar el cliente "plano" de supabase-js, NO createServerClient de
  // @supabase/ssr — ese está diseñado para respetar la sesión del usuario vía cookies,
  // y puede terminar usando permisos de usuario normal en vez de bypass real de RLS
  // incluso pasándole la service role key. Esto causaba que tablas nuevas con RLS
  // activado (team_elo, probability_picks, elo_history) devolvieran 0 filas SOLO
  // para usuarios logueados, mientras curl (sin sesión) sí veía los datos — un bug
  // silencioso sin error visible, muy difícil de diagnosticar. Detectado 27/07/2026.
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
