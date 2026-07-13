import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://footyedge.xyz'
const SECRET = process.env.CRON_SECRET!
const TOTAL_LEAGUES = 40

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = []

  for (let i = 0; i < TOTAL_LEAGUES; i++) {
    try {
      const res = await fetch(`${BASE}/api/matches/analyze-league?league=${i}`, {
        headers: { Authorization: `Bearer ${SECRET}` }
      })
      const data = await res.json()
      results.push({ league: i, ...data })
      await new Promise(r => setTimeout(r, 2000))
    } catch (e: any) {
      results.push({ league: i, error: e.message })
    }
  }

  const consolidate = await fetch(`${BASE}/api/matches/consolidate`, {
    headers: { Authorization: `Bearer ${SECRET}` }
  })
  const consolidated = await consolidate.json()

  return NextResponse.json({ success: true, results, consolidated })
}
