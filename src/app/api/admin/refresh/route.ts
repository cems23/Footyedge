import { NextRequest, NextResponse } from 'next/server'

const LEAGUES = [2,13,11,3,39,40,41,42,140,141,135,136,78,79,61,62,88,94,203,144,128,71,253,262,113,103,179,307,164,106,119,98,197,207,218,235,265,268,239,292,332,299]

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const secret = process.env.CRON_SECRET
  const headers = { Authorization: `Bearer ${secret}` }
  const base = req.nextUrl.origin

  // Fire and forget — don't await
  ;(async () => {
    for (let i = 0; i < LEAGUES.length; i += 5) {
      const batch = LEAGUES.slice(i, i + 5)
      await Promise.all(
        batch.map(id =>
          fetch(`${base}/api/matches/analyze-league?leagueId=${id}`, { headers, signal: AbortSignal.timeout(20000) }).catch(() => null)
        )
      )
    }
    await fetch(`${base}/api/matches/consolidate`, { headers, signal: AbortSignal.timeout(20000) }).catch(() => null)
  })()

  // Respond immediately before Cloudflare times out
  return NextResponse.json({ ok: true, message: 'Refresh started in background' })
}
