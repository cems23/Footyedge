import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const token = searchParams.get('token')
  const type = searchParams.get('type')

  const supabase = createClient()
  const lang = req.cookies.get('lang')?.value || 'es'

  // Handle recovery (password reset)
  if (type === 'recovery') {
    if (token_hash) {
      await supabase.auth.verifyOtp({ token_hash, type: 'recovery' })
    } else if (token) {
      await supabase.auth.verifyOtp({ token_hash: token, type: 'recovery' })
    } else if (code) {
      await supabase.auth.exchangeCodeForSession(code)
    }
    return NextResponse.redirect(new URL(`/${lang}/auth/reset-password`, req.url))
  }

  // Handle email confirmation / OAuth
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(`/${lang}/dashboard`, req.url))
}
