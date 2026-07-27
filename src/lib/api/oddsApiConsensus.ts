// ═══════════════════════════════════════════════════════════
// The Odds API — consenso de varias casas de apuestas, SOLO
// para las ligas grandes/eficientes donde vale la pena (misma
// lista que la mezcla modelo-mercado en consolidate). Se usa
// con mucho cuidado: 1 llamada por liga por día (nunca por
// partido), cacheada en Supabase, y con un tope de presupuesto
// de créditos mensual para no gastar más de lo planeado en el
// plan gratis (500/mes) — se detiene en 400 usados, dejando
// 100 de colchón, y de ahí en adelante sigue con API-Football
// normalmente sin ningún cambio.
// ═══════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'

const ODDS_API = 'https://api.the-odds-api.com/v4'
const MONTHLY_CREDIT_LIMIT = 500
const CREDIT_BUDGET_CAP = 400 // se detiene aquí, deja 100 de colchón

export interface ConsensusOdds {
  homeTeam: string
  awayTeam: string
  oddsHome?: number
  oddsDraw?: number
  oddsAway?: number
  oddsOver25?: number
  bookmakerCount: number
}

// Verifica si todavía hay presupuesto disponible este mes, usando el último
// "requests_remaining" que la propia API nos devolvió en su último header.
async function hasbudget(): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('odds_api_cache')
    .select('requests_remaining')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (data?.requests_remaining == null) return true // sin dato previo, asumir que sí hay
  const used = MONTHLY_CREDIT_LIMIT - data.requests_remaining
  return used < CREDIT_BUDGET_CAP
}

/**
 * Devuelve el consenso de cuotas de The Odds API para una liga, cacheado por día.
 * Si ya se agotó el presupuesto del mes, o si algo falla, devuelve null — el
 * llamador debe caer de vuelta a API-Football/FootyStats sin romper nada.
 */
export async function getOddsApiConsensus(sportKey: string): Promise<ConsensusOdds[] | null> {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // 1. ¿Ya está en caché de hoy? No gastar otra llamada si es así.
  const { data: cached } = await supabase
    .from('odds_api_cache')
    .select('response')
    .eq('sport_key', sportKey)
    .eq('date', today)
    .maybeSingle()

  if (cached?.response) {
    return parseConsensus(cached.response as any[])
  }

  // 2. ¿Hay presupuesto disponible este mes?
  if (!(await hasbudget())) return null

  const key = process.env.ODDS_API_KEY
  if (!key) return null

  try {
    const url = new URL(`${ODDS_API}/sports/${sportKey}/odds`)
    url.searchParams.set('apiKey', key)
    url.searchParams.set('regions', 'uk,eu')
    url.searchParams.set('markets', 'h2h,totals')
    url.searchParams.set('oddsFormat', 'decimal')

    const res = await fetch(url.toString())
    if (!res.ok) return null

    const remaining = parseInt(res.headers.get('x-requests-remaining') ?? '', 10)
    const json = await res.json()

    await supabase.from('odds_api_cache').upsert({
      sport_key: sportKey, date: today, response: json,
      requests_remaining: Number.isFinite(remaining) ? remaining : null,
      fetched_at: new Date().toISOString(),
    }, { onConflict: 'sport_key,date' })

    return parseConsensus(json)
  } catch {
    return null
  }
}

function parseConsensus(events: any[]): ConsensusOdds[] {
  return (events ?? []).map(ev => {
    const homeOdds: number[] = []
    const drawOdds: number[] = []
    const awayOdds: number[] = []
    const over25Odds: number[] = []

    for (const bm of ev.bookmakers ?? []) {
      const h2h = bm.markets?.find((m: any) => m.key === 'h2h')
      const totals = bm.markets?.find((m: any) => m.key === 'totals')

      const home = h2h?.outcomes?.find((o: any) => o.name === ev.home_team)?.price
      const away = h2h?.outcomes?.find((o: any) => o.name === ev.away_team)?.price
      const draw = h2h?.outcomes?.find((o: any) => o.name === 'Draw')?.price
      const over25 = totals?.outcomes?.find((o: any) => o.name === 'Over' && o.point === 2.5)?.price

      if (home) homeOdds.push(home)
      if (away) awayOdds.push(away)
      if (draw) drawOdds.push(draw)
      if (over25) over25Odds.push(over25)
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined

    return {
      homeTeam: ev.home_team,
      awayTeam: ev.away_team,
      oddsHome: avg(homeOdds),
      oddsDraw: avg(drawOdds),
      oddsAway: avg(awayOdds),
      oddsOver25: avg(over25Odds),
      bookmakerCount: (ev.bookmakers ?? []).length,
    }
  })
}

// Fuzzy match simple por nombre de equipo (mismo patrón que usamos con FootyStats)
export function findConsensusMatch(consensus: ConsensusOdds[], homeTeam: string, awayTeam: string): ConsensusOdds | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const h = norm(homeTeam), a = norm(awayTeam)
  return consensus.find(c => {
    const ch = norm(c.homeTeam), ca = norm(c.awayTeam)
    return (ch.includes(h) || h.includes(ch)) && (ca.includes(a) || a.includes(ca))
  }) ?? null
}
