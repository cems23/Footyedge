import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['admin@footyedge.com', 'carlosmartens8@gmail.com']
const REPO = 'cems23/Footyedge'
const WORKFLOW_FILE = 'daily-refresh.yml'

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

  const since = req.nextUrl.searchParams.get('since')

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=5`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
  )
  if (!res.ok) return NextResponse.json({ error: 'No se pudo consultar el estado' }, { status: 502 })

  const json = await res.json()
  const runs = json.workflow_runs ?? []

  // Buscar la corrida que arrancó después de que disparamos (con 5s de margen
  // por si GitHub tarda un toque en registrar el evento) — para no confundir
  // con una corrida anterior que por casualidad siga en curso.
  const relevant = since
    ? runs.find((r: any) => new Date(r.created_at).getTime() >= new Date(since).getTime() - 5000)
    : runs[0]

  if (!relevant) return NextResponse.json({ found: false })

  return NextResponse.json({
    found: true,
    status: relevant.status,       // queued | in_progress | completed
    conclusion: relevant.conclusion, // success | failure | null
    html_url: relevant.html_url,
    created_at: relevant.created_at,
  })
}
