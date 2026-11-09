import { NextRequest, NextResponse } from 'next/server'
import { apf } from '@/lib/api/football'
import { isAdminEmail } from '@/lib/permissions'
import { buildEventMomentum, calculatePressure, toNumber, type MomentumEvent, type PressureStats } from '@/lib/match/momentum'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CACHE_TTL_MS = 5 * 60 * 1000
const STARTED_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'FT', 'AET', 'PEN'])

function eventType(event: any): MomentumEvent['type'] | null {
  const rawType = String(event.type ?? '').toLowerCase()
  if (rawType === 'goal') return 'goal'
  if (rawType === 'card' && String(event.detail ?? '').toLowerCase().includes('red')) return 'red_card'
  if (rawType === 'card') return 'yellow_card'
  if (rawType === 'var') return 'var'
  if (rawType === 'subst' || rawType === 'substitution') return 'substitution'
  return null
}

function eventIcon(event: MomentumEvent) {
  if (event.type === 'goal') return '⚽'
  if (event.type === 'red_card') return '🟥'
  if (event.type === 'yellow_card') return '🟨'
  if (event.type === 'var') return '▣'
  return '⇄'
}

function readStats(rows: any[], teamId: number): PressureStats {
  const team = (rows ?? []).find((row: any) => row.team?.id === teamId)
  const value = (type: string) => toNumber(team?.statistics?.find((stat: any) => stat.type === type)?.value)
  return {
    possession: value('Ball Possession'),
    shotsOn: value('Shots on Goal'),
    shotsTotal: value('Total Shots'),
    corners: value('Corner Kicks'),
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const [{ data: account }, { data: match }] = await Promise.all([
    service.from('users').select('plan,email').eq('id', user.id).single(),
    service.from('matches').select('id,external_id,home_team_id,away_team_id,home_team_name,away_team_name').eq('id', params.id).single(),
  ])
  const allowed = account?.plan === 'pro' || account?.plan === 'elite' || isAdminEmail(account?.email ?? user.email)
  if (!allowed) return NextResponse.json({ error: 'MOMENTUM_PRO_REQUIRED' }, { status: 403 })
  if (!match?.external_id || !match.home_team_id || !match.away_team_id) return NextResponse.json({ error: 'Match data is incomplete.' }, { status: 422 })

  const { data: cached } = await service
    .from('live_momentum_cache')
    .select('payload,cached_at')
    .eq('match_id', match.id)
    .maybeSingle()
  if (cached && Date.now() - new Date(cached.cached_at).getTime() < CACHE_TTL_MS) {
    return NextResponse.json({ ...cached.payload, cached: true, cachedAt: cached.cached_at })
  }

  try {
    const fixtures = await apf<any[]>('/fixtures', { id: match.external_id })
    const fixture = fixtures?.[0]
    const status = fixture?.fixture?.status?.short ?? 'NS'
    const minute = fixture?.fixture?.status?.elapsed ?? null
    const base = {
      status,
      minute,
      homeGoals: fixture?.goals?.home ?? 0,
      awayGoals: fixture?.goals?.away ?? 0,
      homeTeam: match.home_team_name,
      awayTeam: match.away_team_name,
    }

    if (!STARTED_STATUSES.has(status)) {
      return NextResponse.json({ ...base, available: false, reason: 'El pulso se activa cuando el partido comienza.', cached: false })
    }

    const [rawStats, rawEvents] = await Promise.all([
      apf<any[]>('/fixtures/statistics', { fixture: match.external_id }),
      apf<any[]>('/fixtures/events', { fixture: match.external_id }),
    ])
    const events = (rawEvents ?? []).flatMap((event: any): MomentumEvent[] => {
      const type = eventType(event)
      if (!type) return []
      const teamId = event.team?.id
      return [{
        minute: Number(event.time?.elapsed ?? 0),
        type,
        detail: String(event.detail ?? event.type ?? ''),
        team: teamId === match.home_team_id ? 'home' : teamId === match.away_team_id ? 'away' : null,
        player: event.player?.name ?? null,
      }]
    })
    const homeStats = readStats(rawStats, match.home_team_id)
    const awayStats = readStats(rawStats, match.away_team_id)
    const pressure = calculatePressure(homeStats, awayStats)
    const payload = {
      ...base,
      available: true,
      eventMomentum: buildEventMomentum(events, minute),
      events: events.map((event) => ({ ...event, icon: eventIcon(event) })),
      stats: { home: homeStats, away: awayStats },
      pressure,
    }
    const cachedAt = new Date().toISOString()
    const { error } = await service.from('live_momentum_cache').upsert({ match_id: match.id, payload, cached_at: cachedAt }, { onConflict: 'match_id' })
    if (error) throw error

    return NextResponse.json({ ...payload, cached: false, cachedAt })
  } catch (error) {
    console.error('live momentum failed', error)
    return NextResponse.json({ error: 'No se pudo cargar el pulso en directo. Inténtalo de nuevo.' }, { status: 502 })
  }
}
