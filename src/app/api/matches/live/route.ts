import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const APF = 'https://v3.football.api-sports.io'
const KEY = process.env.API_FOOTBALL_KEY!

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res = await fetch(`${APF}/fixtures?live=all`, {
      headers: { 'x-apisports-key': KEY },
      cache: 'no-store'
    })
    const data = await res.json()

    const fixtures = (data.response ?? []).map((f: any) => ({
      id: f.fixture?.id,
      minute: f.fixture?.status?.elapsed,
      status: f.fixture?.status?.short,
      home: f.teams?.home?.name,
      away: f.teams?.away?.name,
      homeLogo: f.teams?.home?.logo,
      awayLogo: f.teams?.away?.logo,
      homeGoals: f.goals?.home ?? 0,
      awayGoals: f.goals?.away ?? 0,
      league: f.league?.name,
      stats: {
        homePoss: f.statistics?.[0]?.statistics?.find((s: any) => s.type === 'Ball Possession')?.value ?? null,
        awayPoss: f.statistics?.[1]?.statistics?.find((s: any) => s.type === 'Ball Possession')?.value ?? null,
        homeShots: f.statistics?.[0]?.statistics?.find((s: any) => s.type === 'Shots on Goal')?.value ?? 0,
        awayShots: f.statistics?.[1]?.statistics?.find((s: any) => s.type === 'Shots on Goal')?.value ?? 0,
      }
    }))

    return NextResponse.json({ live: fixtures, count: fixtures.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
