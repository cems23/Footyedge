// ═══════════════════════════════════════════════════════════
// FootyEdge 2.0 — Integración APIs Externas
// API-Football v3 + The Odds API v4
// ═══════════════════════════════════════════════════════════

import type { LeagueStats, TeamStats, MatchInput } from '@/lib/math/poisson'
import { getFootyStatsToday, findFootyStatsMatch, extractFootyStatsData } from '@/lib/api/footystats'
import type { ApiFootballInjury } from '@/lib/football/injuries'

const API_FOOTBALL = 'https://v3.football.api-sports.io'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const ODDS_API     = 'https://api.the-odds-api.com/v4'

/**
 * API-Football returns provider errors inside an otherwise valid JSON envelope.
 * Keep the useful, non-secret part of that envelope in the error so an operator
 * can distinguish a bad/expired key from a temporary provider outage.
 */
export function formatApiFootballErrors(errors: unknown): string | null {
  if (!errors) return null

  if (typeof errors === 'string') return errors.slice(0, 240)
  if (Array.isArray(errors)) {
    const values = errors.filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean)
    return values.length ? values.join('; ').slice(0, 240) : null
  }
  if (typeof errors !== 'object') return null

  const parts = Object.entries(errors as Record<string, unknown>)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .filter(part => part !== 'undefined')
  return parts.length ? parts.join('; ').slice(0, 240) : null
}

// ── LEAGUE WEIGHTS para ranking ────────────────────────────
export const LEAGUE_WEIGHTS: Record<number, number> = {
  39:  1.00, // Premier League
  140: 0.98, // La Liga
  78:  0.96, // Bundesliga
  135: 0.95, // Serie A
  61:  0.92, // Ligue 1
  2:   0.97, // Champions League
  3:   0.90, // Europa League
}

export const ACTIVE_LEAGUES = [
  // ── LIGAS CON ODDS REALES (The Odds API) ─────────────────
  // hasOdds: true = value bets habilitadas
  // hasOdds: false = solo estadísticas, sin value bets
  { id: 2,   sportKey: 'soccer_uefa_champs_league',          name: 'Champions League', season: 2026, hasOdds: true  },
  { id: 3,   sportKey: 'soccer_uefa_europa_league',          name: 'Europa League',    season: 2026, hasOdds: true  },
  { id: 848, sportKey: 'soccer_uefa_europa_conference_league', name: 'Conference League', season: 2026, hasOdds: true  },
  { id: 13,  sportKey: 'soccer_conmebol_libertadores',         name: 'Libertadores',   season: 2026, hasOdds: true  },
  { id: 11,  sportKey: 'soccer_conmebol_sudamericana',        name: 'Sudamericana',   season: 2026, hasOdds: true  },
  { id: 39,  sportKey: 'soccer_epl',                        name: 'Premier League', season: 2026, hasOdds: true  },
  { id: 140, sportKey: 'soccer_spain_la_liga',              name: 'La Liga',        season: 2026, hasOdds: true  },
  { id: 78,  sportKey: 'soccer_germany_bundesliga',         name: 'Bundesliga',     season: 2026, hasOdds: true  },
  { id: 135, sportKey: 'soccer_italy_serie_a',              name: 'Serie A',        season: 2026, hasOdds: true  },
  { id: 61,  sportKey: 'soccer_france_ligue_one',           name: 'Ligue 1',        season: 2026, hasOdds: true  },
  { id: 88,  sportKey: 'soccer_netherlands_eredivisie',     name: 'Eredivisie',     season: 2026, hasOdds: true  },
  { id: 94,  sportKey: 'soccer_portugal_primeira_liga',     name: 'Primeira Liga',  season: 2026, hasOdds: true  },
  { id: 40,  sportKey: 'soccer_england_championship',       name: 'Championship',   season: 2026, hasOdds: true  },
  { id: 203, sportKey: 'soccer_turkey_super_league',        name: 'Süper Lig',      season: 2026, hasOdds: true  },
  { id: 144, sportKey: 'soccer_belgium_first_div_a',        name: 'Pro League',     season: 2026, hasOdds: true  },
  { id: 128, sportKey: 'soccer_argentina_primera_division', name: 'Liga Argentina', season: 2026, hasOdds: true  },
  { id: 71,  sportKey: 'soccer_brazil_campeonato',          name: 'Brasileirao',    season: 2026, hasOdds: true  },
  { id: 253, sportKey: 'soccer_usa_mls',                    name: 'MLS',            season: 2026, hasOdds: true  },
  { id: 262, sportKey: 'soccer_mexico_liga_mx',             name: 'Liga MX',        season: 2026, hasOdds: true  },
  { id: 113, sportKey: 'soccer_sweden_allsvenskan',         name: 'Allsvenskan',    season: 2026, hasOdds: true  },
  { id: 164, sportKey: 'soccer_iceland_urvalsdeild',        name: 'Úrvalsdeild',    season: 2026, hasOdds: true  },
  { id: 103, sportKey: 'soccer_norway_eliteserien',         name: 'Eliteserien',    season: 2026, hasOdds: true  },
  { id: 106, sportKey: 'soccer_poland_ekstraklasa',         name: 'Ekstraklasa',    season: 2026, hasOdds: true  },
  { id: 207, sportKey: 'soccer_switzerland_super_league',   name: 'Swiss SL',       season: 2026, hasOdds: true  },
  { id: 179, sportKey: 'soccer_scotland_premiership',       name: 'Scottish PL',    season: 2026, hasOdds: true  },
  { id: 41,  sportKey: 'soccer_england_league1',            name: 'League One',     season: 2026, hasOdds: true  },
  { id: 42,  sportKey: 'soccer_england_league2',            name: 'League Two',     season: 2026, hasOdds: true  },
  { id: 79,  sportKey: 'soccer_germany_bundesliga2',        name: 'Bundesliga 2',   season: 2026, hasOdds: true  },
  { id: 136, sportKey: 'soccer_italy_serie_b',              name: 'Serie B',        season: 2026, hasOdds: true  },
  { id: 62,  sportKey: 'soccer_france_ligue_2',             name: 'Ligue 2',        season: 2026, hasOdds: true  },
  // ── LIGAS SIN ODDS (solo estadísticas) ────────────────────
  { id: 307, sportKey: 'soccer_saudi_professional_league',  name: 'Saudi Pro',      season: 2026, hasOdds: false },
  { id: 235, sportKey: 'soccer_russia_premier_league',      name: 'RPL',            season: 2026, hasOdds: true  },
  { id: 119, sportKey: 'soccer_denmark_superliga',          name: 'Superliga DK',   season: 2026, hasOdds: true  },
  { id: 218, sportKey: 'soccer_austria_bundesliga',         name: 'Austria BL',     season: 2026, hasOdds: true  },
  { id: 197, sportKey: 'soccer_greece_super_league',        name: 'Super League GR',season: 2026, hasOdds: true  },
  { id: 141, sportKey: 'soccer_spain_segunda',              name: 'Segunda Div',    season: 2026, hasOdds: false },
  { id: 239, sportKey: 'soccer_colombia_primera_a',         name: 'Liga BetPlay',   season: 2026, hasOdds: false },
  { id: 265, sportKey: 'soccer_chile_primera_division',     name: 'Primera Chile',  season: 2026, hasOdds: false },
  { id: 268, sportKey: 'soccer_uruguay_primera_division',   name: 'Primera Uruguay',season: 2026, hasOdds: false },
  { id: 332, sportKey: 'soccer_iran_persian_gulf_pro',      name: 'Persian Gulf',   season: 2026, hasOdds: false },
  { id: 299, sportKey: 'soccer_venezuela_primera_division',   name: 'Venezuela Primera', season: 2026, hasOdds: false },
  { id: 98,  sportKey: 'soccer_japan_j1_league',            name: 'J1 League',      season: 2026, hasOdds: false },
  { id: 292, sportKey: 'soccer_south_korea_k_league_1',     name: 'K League 1',     season: 2026, hasOdds: false },
]

// ── HTTP HELPERS ────────────────────────────────────────────

export async function apf<T>(endpoint: string, params: Record<string, string | number>): Promise<T> {
  const key = process.env.API_FOOTBALL_KEY
  if (!key) throw new Error('API_FOOTBALL_KEY missing')

  const url = new URL(`${API_FOOTBALL}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  // Timeout explicito — sin esto, un colgado del lado de API-Football puede
  // arrastrar toda la funcion serverless que la llama (analyze-league corre esto
  // por CADA partido de CADA liga, asi que el riesgo se multiplica mucho).
  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: { 'x-apisports-key': key },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
  } catch (error) {
    const reason = error instanceof Error && error.name === 'TimeoutError' ? 'timed out after 15s' : 'network request failed'
    throw new Error(`API-Football ${endpoint} ${reason}`)
  }

  const raw = await res.text()
  let json: { response?: T; errors?: unknown } | null = null
  try {
    json = JSON.parse(raw) as { response?: T; errors?: unknown }
  } catch {
    if (!res.ok) throw new Error(`API-Football ${endpoint} returned HTTP ${res.status}`)
    throw new Error(`API-Football ${endpoint} returned invalid JSON`)
  }

  const providerError = formatApiFootballErrors(json.errors)
  if (!res.ok) {
    throw new Error(`API-Football ${endpoint} returned HTTP ${res.status}${providerError ? `: ${providerError}` : ''}`)
  }

  if (!Object.prototype.hasOwnProperty.call(json, 'response')) {
    throw new Error(`API-Football ${endpoint} returned an invalid response shape`)
  }

  if (providerError) throw new Error(`API-Football ${endpoint} reported an upstream error: ${providerError}`)
  return json.response as T
}

import { getOddsApiConsensus, findConsensusMatch } from './oddsApiConsensus'

// Ligas grandes/eficientes donde vale la pena pagar el costo de un consenso real
// de varias casas de apuestas — misma lista que la mezcla modelo-mercado.
const ODDS_API_LEAGUES = new Set([2, 39, 140, 135, 78, 61]) // Champions, PL, LaLiga, SerieA, Bundesliga, Ligue1

async function oddsApi<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const key = process.env.ODDS_API_KEY
  if (!key) throw new Error('ODDS_API_KEY missing')

  const url = new URL(`${ODDS_API}${endpoint}`)
  url.searchParams.set('apiKey', key)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), { next: { revalidate: 300 }, signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Odds API ${res.status}: ${await res.text()}`)
  return res.json() as T
}

// ── TIPOS ───────────────────────────────────────────────────

export interface APIFixture {
  fixture: { id: number; date: string; status: { short: string; long: string } }
  league: { id: number; name: string; season: number; logo: string }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
}

function isAPIFixture(value: unknown): value is APIFixture {
  if (!value || typeof value !== 'object') return false
  const fixture = value as Partial<APIFixture>
  return typeof fixture.fixture?.id === 'number'
    && typeof fixture.fixture?.date === 'string'
    && typeof fixture.league?.id === 'number'
    && typeof fixture.league?.season === 'number'
    && typeof fixture.teams?.home?.id === 'number'
    && typeof fixture.teams?.home?.name === 'string'
    && typeof fixture.teams?.away?.id === 'number'
    && typeof fixture.teams?.away?.name === 'string'
}

export interface APITeamStats {
  goals: {
    for:     { total: { home: number; away: number; total: number }; average: { home: string; away: string } }
    against: { total: { home: number; away: number; total: number }; average: { home: string; away: string } }
  }
  fixtures: { played: { home: number; away: number; total: number } }
  form: string
}



import { createServiceClient } from '@/lib/supabase/server'

const CACHE_TTL_HOURS = 12

async function getCached<T>(key: string, ttlHours = CACHE_TTL_HOURS): Promise<T | null> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase.from('api_cache').select('data, cached_at').eq('cache_key', key).single()
    if (!data) return null
    const age = Date.now() - new Date(data.cached_at).getTime()
    if (age > ttlHours * 60 * 60 * 1000) return null
    return data.data as T
  } catch { return null }
}

async function setCached(key: string, data: any): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('api_cache').upsert({ cache_key: key, data, cached_at: new Date().toISOString() }, { onConflict: 'cache_key' })
  } catch {}
}

/**
 * Loads absence data for up to twenty fixtures at a time. API-Football updates
 * this endpoint every four hours, so a shared database cache prevents manual
 * scans and the scheduled scan from repeatedly consuming the same provider
 * quota. The `ids` parameter is documented by API-Football for this endpoint.
 */
export async function getInjuriesForFixtures(fixtureIds: Array<string | number>) {
  const ids = Array.from(new Set(fixtureIds.map(Number).filter(Number.isFinite)))
  const injuries: ApiFootballInjury[] = []
  let providerCalls = 0
  let cacheHits = 0
  let failedBatches = 0

  for (let start = 0; start < ids.length; start += 20) {
    const batch = ids.slice(start, start + 20)
    const cacheKey = `injuries_fixtures_v1_${batch.slice().sort((a, b) => a - b).join('-')}`
    const cached = await getCached<ApiFootballInjury[]>(cacheKey, 4)
    if (cached) {
      cacheHits += 1
      injuries.push(...cached)
      continue
    }

    try {
      const response = await apf<ApiFootballInjury[]>('/injuries', { ids: batch.join('-') })
      providerCalls += 1
      await setCached(cacheKey, response)
      injuries.push(...response)
    } catch (error) {
      failedBatches += 1
      console.error('injury-watch provider batch failed', { fixtureCount: batch.length, error })
    }
  }

  return { injuries, providerCalls, cacheHits, failedBatches }
}

export async function getLeagueStats(leagueId: number, season: number): Promise<LeagueStats> {
  const key = `league_${leagueId}_${season}`
  const cached = await getCached<LeagueStats>(key)
  if (cached) return cached

  try {
    const fixtures = await apf<APIFixture[]>('/fixtures', {
      league: leagueId, season, status: 'FT', last: 100,
    })

    const played = fixtures.filter(f => f.goals.home !== null && f.goals.away !== null)
    if (played.length < 10) throw new Error('Not enough fixtures')

    const totalH = played.reduce((s, f) => s + (f.goals.home ?? 0), 0)
    const totalA = played.reduce((s, f) => s + (f.goals.away ?? 0), 0)

    const stats: LeagueStats = {
      avgHomeGoals:  totalH / played.length,
      avgAwayGoals:  totalA / played.length,
      avgTotalGoals: (totalH + totalA) / played.length,
    }

    await setCached(key, stats)
    return stats
  } catch (error) {
    // These values are intentionally conservative, but callers must be able to
    // see in logs that the provider data was unavailable for this calculation.
    console.warn(`[football-data] League ${leagueId} fallback stats used: ${error instanceof Error ? error.message : 'unknown error'}`)
    return { avgHomeGoals: 1.52, avgAwayGoals: 1.18, avgTotalGoals: 2.70 }
  }
}

// ── TEAM STATS ──────────────────────────────────────────────

export async function getTeamStats(
  teamId: number, leagueId: number, season: number, isHome: boolean,
  _isFallback = false
): Promise<TeamStats> {
  const cacheKey = `team_${teamId}_${leagueId}_${season}_${isHome ? "h" : "a"}`
  const cached = await getCached<TeamStats>(cacheKey)
  if (cached) return cached

  // Get season stats + last 8 real fixtures in parallel
  const [statsData, fixturesData] = await Promise.all([
    apf<any>("/teams/statistics", { team: teamId, league: leagueId, season }),
    apf<any>("/fixtures", { team: teamId, league: leagueId, season, last: 8, status: 'FT' }),
  ])

  const s = Array.isArray(statsData) ? statsData[0] : statsData
  if (!s || !s.fixtures) return {
    goalsScored: 0, goalsConceded: 0, matchesPlayed: 1,
    xgScored: undefined, xgConceded: undefined,
    recentGoalsScored: [1,1,1,1,1], recentGoalsConceded: [1,1,1,1,1],
    recentXgScored: [], unbeaten: 0, form: 'NNNNN',
  } as any

  // Use home/away specific stats based on team role in this match
  // This is critical: a team scoring 2.0 at home but 1.0 away
  // should NOT be treated the same in both roles
  const playedHome = s.fixtures?.played?.home || 0
  const playedAway = s.fixtures?.played?.away || 0
  const rawPlayed = isHome ? playedHome : playedAway

  // Sin partidos en ESTA competición esta temporada (ej. equipo recién entrando a
  // clasificatorias continentales, pero activo en su liga doméstica) — buscar sus
  // últimos partidos reales en CUALQUIER competición esta temporada (sin filtro de liga),
  // en vez de un promedio genérico compartido. Preserva diferenciación real entre equipos.
  // Agrega goles/concedidos de una lista de fixtures ya filtrados a "terminados".
  // Reusado por los dos niveles de fallback (temporada actual y temporada anterior).
  function aggregateFixtures(finished: any[], forTeamId: number) {
    let gScored = 0, gConceded = 0
    const recentScored: number[] = []
    const recentConceded: number[] = []
    for (const f of finished) {
      const wasHome = f.teams?.home?.id === forTeamId
      const scored   = wasHome ? (f.goals?.home ?? 0) : (f.goals?.away ?? 0)
      const conceded = wasHome ? (f.goals?.away ?? 0) : (f.goals?.home ?? 0)
      gScored += scored
      gConceded += conceded
      recentScored.push(scored)
      recentConceded.push(conceded)
    }
    return { gScored, gConceded, recentScored, recentConceded }
  }

  if (rawPlayed === 0 && !_isFallback) {
    // Nivel 1: cualquier competición, temporada actual (ej. equipo en clasificatorias
    // continentales pero sin partidos aún en la liga que estamos analizando).
    try {
      const anyCompFixtures = await apf<any[]>("/fixtures", { team: teamId, season, last: 10, status: 'FT' })
      const finished = (anyCompFixtures ?? []).filter(f => f.goals?.home !== null && f.goals?.away !== null)
      if (finished.length >= 3) {
        const agg = aggregateFixtures(finished, teamId)
        const fallbackResult: TeamStats = {
          goalsScored: agg.gScored, goalsConceded: agg.gConceded, matchesPlayed: finished.length,
          xgScored: undefined, xgConceded: undefined,
          recentGoalsScored: agg.recentScored, recentGoalsConceded: agg.recentConceded,
          recentXgScored: [], isHome, usedFallback: true,
        }
        await setCached(cacheKey, fallbackResult)
        return fallbackResult
      }
    } catch {
      // si falla, seguimos al nivel 2
    }

    // Nivel 2: cualquier competición, temporada ANTERIOR — solo cuando el nivel 1
    // tampoco alcanzó los 3 partidos mínimos (típico en pretemporada/inicio de
    // temporada nueva, cuando casi ningún equipo acumuló partidos todavía).
    // Se marca usedPriorSeason para que calcConfidence lo penalice más que un
    // fallback normal (dato más viejo, menos representativo del equipo hoy).
    try {
      const priorSeasonFixtures = await apf<any[]>("/fixtures", { team: teamId, season: season - 1, last: 10, status: 'FT' })
      const finishedPrior = (priorSeasonFixtures ?? []).filter(f => f.goals?.home !== null && f.goals?.away !== null)
      if (finishedPrior.length >= 3) {
        const agg = aggregateFixtures(finishedPrior, teamId)
        const fallbackResult: TeamStats = {
          goalsScored: agg.gScored, goalsConceded: agg.gConceded, matchesPlayed: finishedPrior.length,
          xgScored: undefined, xgConceded: undefined,
          recentGoalsScored: agg.recentScored, recentGoalsConceded: agg.recentConceded,
          recentXgScored: [], isHome, usedFallback: true, usedPriorSeason: true,
        }
        await setCached(cacheKey, fallbackResult)
        return fallbackResult
      }
    } catch {
      // si falla, seguimos con el flujo normal (promedio de liga en poisson.ts)
    }
  }

  const played = isHome
    ? Math.max(1, playedHome)
    : Math.max(1, playedAway)

  const gF = isHome
    ? (s.goals?.for?.total?.home   ?? s.goals?.for?.total?.total   ?? 0)
    : (s.goals?.for?.total?.away   ?? s.goals?.for?.total?.total   ?? 0)
  const gA = isHome
    ? (s.goals?.against?.total?.home ?? s.goals?.against?.total?.total ?? 0)
    : (s.goals?.against?.total?.away ?? s.goals?.against?.total?.total ?? 0)

  // xG from season stats if available
  const xgFor     = isHome
    ? (s.goals?.for?.average?.home     ? parseFloat(s.goals.for.average.home)     * played : undefined)
    : (s.goals?.for?.average?.away     ? parseFloat(s.goals.for.average.away)     * played : undefined)
  const xgAgainst = isHome
    ? (s.goals?.against?.average?.home ? parseFloat(s.goals.against.average.home) * played : undefined)
    : (s.goals?.against?.average?.away ? parseFloat(s.goals.against.average.away) * played : undefined)

  // Real goals from last 8 fixtures
  const recentFixtures: any[] = Array.isArray(fixturesData) ? fixturesData : []
  const recentGoalsScored: number[] = recentFixtures.map((f: any) => {
    const isTeamHome = f.teams?.home?.id === teamId
    return isTeamHome ? (f.goals?.home ?? 0) : (f.goals?.away ?? 0)
  })
  const recentGoalsConceded: number[] = recentFixtures.map((f: any) => {
    const isTeamHome = f.teams?.home?.id === teamId
    return isTeamHome ? (f.goals?.away ?? 0) : (f.goals?.home ?? 0)
  })

  // xG from recent fixtures (if API provides it)
  const recentXgScored: number[] = recentFixtures.map((f: any) => {
    const isTeamHome = f.teams?.home?.id === teamId
    const xg = isTeamHome
      ? f.score?.halftime?.home  // fallback
      : f.score?.halftime?.away
    return 0 // xG per fixture requires statistics endpoint - placeholder
  })

  const result: TeamStats = {
    goalsScored: gF,
    goalsConceded: gA,
    matchesPlayed: played,
    xgScored: xgFor,
    xgConceded: xgAgainst,
    recentGoalsScored: recentGoalsScored.length >= 3 ? recentGoalsScored : [1,1,1,1,1],
    recentGoalsConceded: recentGoalsConceded.length >= 3 ? recentGoalsConceded : [1,1,1,1,1],
    recentXgScored,
    isHome,
  }
  await setCached(`team_${teamId}_${leagueId}_${season}_${isHome ? 'h' : 'a'}`, result)
  return result
}

// ── UPCOMING FIXTURES ───────────────────────────────────────

export async function getUpcomingFixtures(leagueId: number, season: number, next?: number): Promise<APIFixture[]> {
  // from/to = solo "hoy" perdía partidos que arrancan entre 23:00-05:00 UTC (muy
  // comun en futbol latinoamericano — 20:30 Argentina = 23:30 UTC, 21:00 Colombia =
  // 02:00 UTC del dia siguiente): la corrida de las 23:00 UTC calcula "hoy" y no
  // llega a cubrir un partido que ya es, en UTC, "mañana". Se amplia a today+tomorrow
  // para que SIEMPRE se analice a tiempo, sin importar en que momento del reloj corra
  // el cron. consolidate tiene su propia ventana ampliada para lo mismo (ver ahi).
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const from = today.toISOString().split('T')[0]
  const to = tomorrow.toISOString().split('T')[0]
  const cacheKey = `upcoming_${leagueId}_${season}_${from}_${to}`
  // Cada batch del pipeline ve el mismo calendario. Una caché breve evita que
  // dividir una jornada en lotes multiplique llamadas al proveedor, sin volver
  // obsoletos los cambios de última hora durante demasiado tiempo.
  let fixtures = await getCached<APIFixture[]>(cacheKey, 1 / 6)
  if (!fixtures) {
    const response = await apf<unknown>('/fixtures', { league: leagueId, season, from, to })
    if (!Array.isArray(response)) throw new Error('API-Football fixtures response is not an array')

    fixtures = response.filter(isAPIFixture)
    if (fixtures.length !== response.length) {
      console.warn(`[football-data] League ${leagueId}: discarded ${response.length - fixtures.length} malformed fixture records`)
    }
    fixtures = fixtures.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())
    await setCached(cacheKey, fixtures)
  }

  return typeof next === 'number' ? fixtures.slice(0, Math.max(1, next)) : fixtures
}

// ── ODDS (API-Football) ─────────────────────────────────────
// Reemplaza The Odds API — usamos el mismo plan Pro de API-Football
// Bookmaker 8 = Bet365 (mejor cobertura europea)

export interface OddsEvent {
  fixture_id: number
  oddsHome?: number | undefined
  oddsDraw?: number | undefined
  oddsAway?: number | undefined
  oddsOver25?: number | undefined
  oddsBtts?: number | undefined
}

export async function getOddsForLeague(sportKey: string): Promise<OddsEvent[]> {
  // sportKey ya no se usa — extraemos leagueId del contexto
  // Esta función ahora se llama con leagueId directamente
  return []
}

export async function getOddsForLeagueById(leagueId: number, season: number): Promise<OddsEvent[]> {
  try {
    // Buscar odds para hoy y los próximos 2 días
    const today = new Date()
    const dates = [0, 1, 2].map(d => {
      const dt = new Date(today)
      dt.setDate(dt.getDate() + d)
      return dt.toISOString().split('T')[0]
    })
    const cacheKey = `odds_${leagueId}_${season}_${dates.join('_')}`
    const cached = await getCached<OddsEvent[]>(cacheKey, 1 / 6)
    if (cached) return cached

    // Las tres fechas son independientes. En serie podían acumular hasta 45 s
    // de espera ante una latencia temporal del proveedor; en paralelo el límite
    // queda acotado al timeout de una sola llamada. Los fallos parciales siguen
    // siendo no fatales: simplemente se usan las fechas que respondan.
    const responses = await Promise.allSettled(
      dates.map(date => apf<any[]>('/odds', { league: leagueId, season, bookmaker: 8, date })),
    )
    const allData = responses.flatMap(result =>
      result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [],
    )
    const data = allData
    if (!Array.isArray(data) || !data.length) {
      await setCached(cacheKey, [])
      return []
    }

    const odds = data.map((item: any) => {
      const bm = item.bookmakers?.[0]
      if (!bm) return { fixture_id: item.fixture.id }

      const matchWinner = bm.bets?.find((b: any) => b.name === 'Match Winner')
      const goalsOU     = bm.bets?.find((b: any) => b.name === 'Goals Over/Under')
      const btts        = bm.bets?.find((b: any) => b.name === 'Both Teams Score')

      const getOdd = (bet: any, value: string) =>
        parseFloat(bet?.values?.find((v: any) => v.value === value)?.odd ?? '0') || undefined

      const oddsOver25 = goalsOU?.values?.find((v: any) => v.value === 'Over 2.5')?.odd
      const oddsBtts   = btts?.values?.find((v: any) => v.value === 'Yes')?.odd

      return {
        fixture_id: item.fixture.id,
        oddsHome:   getOdd(matchWinner, 'Home'),
        oddsDraw:   getOdd(matchWinner, 'Draw'),
        oddsAway:   getOdd(matchWinner, 'Away'),
        oddsOver25: oddsOver25 ? parseFloat(oddsOver25) : undefined,
        oddsBtts:   oddsBtts   ? parseFloat(oddsBtts)   : undefined,
      }
    }).filter(e => !!(e.oddsHome || e.oddsOver25)) as OddsEvent[]
    await setCached(cacheKey, odds)
    return odds
  } catch (err) {
    console.error('getOddsForLeagueById error:', err)
    return []
  }
}

export function extractOdds(event: OddsEvent, _homeTeam: string, _awayTeam: string) {
  return {
    oddsHome:   event.oddsHome,
    oddsDraw:   event.oddsDraw,
    oddsAway:   event.oddsAway,
    oddsOver25: event.oddsOver25,
    oddsBtts:   event.oddsBtts,
  }
}

// ── MATCH INPUT BUILDER ─────────────────────────────────────

export async function buildMatchInput(
  fixture: APIFixture, oddsEvents: OddsEvent[]
): Promise<MatchInput> {
  const [homeStats, awayStats, leagueStats, footyStatsMatches] = await Promise.all([
    getTeamStats(fixture.teams.home.id, fixture.league.id, fixture.league.season, true),
    getTeamStats(fixture.teams.away.id, fixture.league.id, fixture.league.season, false),
    getLeagueStats(fixture.league.id, fixture.league.season),
    getFootyStatsToday(),
  ])

  // Match by fixture_id — 100% preciso
  const oddsEvent = oddsEvents.find(e => e.fixture_id === fixture.fixture.id)
  const league = ACTIVE_LEAGUES.find(l => l.id === fixture.league.id)

  // Odds de API-Football (primario)
  const apfOdds = (league?.hasOdds && oddsEvent)
    ? extractOdds(oddsEvent, fixture.teams.home.name, fixture.teams.away.name)
    : { oddsHome: undefined, oddsDraw: undefined, oddsAway: undefined, oddsOver25: undefined, oddsBtts: undefined }

  // FootyStats: fallback de odds + xG prematch
  const fsMatch = findFootyStatsMatch(footyStatsMatches, fixture.teams.home.name, fixture.teams.away.name)
  const fsData = fsMatch ? extractFootyStatsData(fsMatch) : null

  // The Odds API: consenso real de varias casas, SOLO para ligas grandes y solo
  // mientras haya presupuesto de créditos disponible este mes (ver oddsApiConsensus.ts).
  // Si no aplica o se agotó el presupuesto, esto simplemente devuelve null y todo
  // sigue funcionando igual que antes con API-Football/FootyStats.
  let consensusOdds: ReturnType<typeof findConsensusMatch> = null
  if (league && ODDS_API_LEAGUES.has(league.id) && league.sportKey) {
    try {
      const consensus = await getOddsApiConsensus(league.sportKey)
      if (consensus) consensusOdds = findConsensusMatch(consensus, fixture.teams.home.name, fixture.teams.away.name)
    } catch { /* si falla, seguimos sin este dato */ }
  }

  // Merge: The Odds API (consenso real, ligas grandes) > API-Football > FootyStats
  const mergedOdds = {
    oddsHome:   consensusOdds?.oddsHome   ?? apfOdds.oddsHome   ?? fsData?.oddsHome,
    oddsDraw:   consensusOdds?.oddsDraw   ?? apfOdds.oddsDraw   ?? fsData?.oddsDraw,
    oddsAway:   consensusOdds?.oddsAway   ?? apfOdds.oddsAway   ?? fsData?.oddsAway,
    oddsOver25: consensusOdds?.oddsOver25 ?? apfOdds.oddsOver25 ?? fsData?.oddsOver25,
    oddsBtts:   apfOdds.oddsBtts   ?? fsData?.oddsBtts,
    oddsOver15: fsData?.oddsOver15,
  }

  // Enriquecer homeStats/awayStats con xG prematch de FootyStats
  if (fsData?.xgHome) homeStats.xgScored = fsData.xgHome * (homeStats.matchesPlayed || 1)
  if (fsData?.xgAway) awayStats.xgScored = fsData.xgAway * (awayStats.matchesPlayed || 1)

  return { home: homeStats, away: awayStats, league: leagueStats, ...mergedOdds }
}
