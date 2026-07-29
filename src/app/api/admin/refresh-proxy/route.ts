import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['admin@footyedge.com', 'carlosmartens8@gmail.com']
const REPO = 'cems23/Footyedge'
const WORKFLOW_FILE = 'daily-refresh.yml'

// Ya no hace el trabajo pesado dentro de una función serverless de Vercel — el
// análisis completo de las ~41 ligas tarda 4-5 minutos reales, muy por encima de
// cualquier límite de maxDuration razonable. En vez de eso, dispara el mismo
// workflow de GitHub Actions que ya corre 4x/día por cron (que no tiene ese
// límite de tiempo), vía la API de GitHub con un token de acceso acotado solo
// a este repo con permiso de Actions.
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase.from('users').select('email').eq('id', user.id).single()
  if (!ADMIN_EMAILS.includes(userData?.email || '')) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const token = process.env.GITHUB_DISPATCH_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_DISPATCH_TOKEN no configurado' }, { status: 500 })
  }

  const triggeredAt = new Date().toISOString()

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  )

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return NextResponse.json({ error: 'No se pudo disparar el workflow', detail }, { status: 502 })
  }

  return NextResponse.json({ ok: true, triggeredAt })
}
