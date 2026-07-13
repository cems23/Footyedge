import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LANGS = ['es', 'en']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Extract lang from path
  const pathLang = pathname.split('/')[1]
  const lang = LANGS.includes(pathLang) ? pathLang : 'es'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
        set(name: string, value: string, options: any) { res.cookies.set({ name, value, ...options }) },
        remove(name: string, options: any) { res.cookies.set({ name, value: '', ...options }) },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const isAuthPage = pathname.includes('/auth/') && !pathname.includes('/auth/callback')
  const isDashboard = pathname.includes('/dashboard')
  const isMatch = pathname.includes('/match/')

  if ((isDashboard || isMatch) && !session) {
    return NextResponse.redirect(new URL(`/${lang}/auth/login`, req.url))
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL(`/${lang}/dashboard`, req.url))
  }

  return res
}

export const config = {
  matcher: ['/(es|en)/:path*', '/dashboard/:path*', '/auth/:path*', '/match/:path*'],
}
