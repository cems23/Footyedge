// ═══════════════════════════════════════════════════════════
// FootyEdge 2.0 — FootyStats API Client
// Fallback para odds + xG prematch
// ═══════════════════════════════════════════════════════════

const FOOTYSTATS_API = 'https://api.football-data-api.com'

export interface FootyStatsMatch {
  id: number
  homeID: number
  awayID: number
  home_name: string
  away_name: string
  date_unix: number
  status: string
  homeGoalCount?: number
  awayGoalCount?: number
  odds_ft_1?: number
  odds_ft_x?: number
  odds_ft_2?: number
  odds_ft_over15?: number
  odds_ft_over25?: number
  odds_btts_yes?: number
  odds_btts_no?: number
  odds_doublechance_1x?: number
  odds_doublechance_x2?: number
  odds_doublechance_12?: number
  odds_1st_half_over05?: number
  odds_1st_half_over15?: number
  odds_1st_half_over25?: number
  odds_corners_over_85?: number
  odds_corners_over_95?: number
  odds_corners_over_105?: number
  team_a_xg_prematch?: number
  team_b_xg_prematch?: number
  o25_potential?: number
  o15_potential?: number
  o05HT_potential?: number
  o15HT_potential?: number
  btts_potential?: number
  corners_potential?: number
  corners_o85_potential?: number
  corners_o95_potential?: number
  corners_o105_potential?: number
  pre_match_home_ppg?: number
  pre_match_away_ppg?: number
}

function isFootyStatsMatch(value: unknown): value is FootyStatsMatch {
  if (!value || typeof value !== 'object') return false
  const match = value as Partial<FootyStatsMatch>
  return typeof match.id === 'number'
    && typeof match.homeID === 'number'
    && typeof match.awayID === 'number'
    && typeof match.home_name === 'string'
    && typeof match.away_name === 'string'
    && typeof match.status === 'string'
}

let _todayCache: FootyStatsMatch[] | null = null
let _todayCacheTime = 0
const CACHE_MS = 30 * 60 * 1000 // 30 min

export async function getFootyStatsToday(): Promise<FootyStatsMatch[]> {
  const now = Date.now()
  if (_todayCache && now - _todayCacheTime < CACHE_MS) return _todayCache

  const key = process.env.FOOTYSTATS_API_KEY
  if (!key) return []

  try {
    const res = await fetch(
      `${FOOTYSTATS_API}/todays-matches?key=${key}`,
      { next: { revalidate: 1800 }, signal: AbortSignal.timeout(15000) }
    )
    if (!res.ok) {
      console.warn(`[footystats] todays-matches returned HTTP ${res.status}`)
      return []
    }
    const json: unknown = await res.json()
    if (!json || typeof json !== 'object' || !Array.isArray((json as { data?: unknown }).data)) {
      console.warn('[footystats] todays-matches returned an invalid response shape')
      return []
    }
    const data = (json as { data: unknown[] }).data
    _todayCache = data.filter(isFootyStatsMatch)
    if (_todayCache.length !== data.length) {
      console.warn(`[footystats] discarded ${data.length - _todayCache.length} malformed match records`)
    }
    _todayCacheTime = now
    return _todayCache
  } catch (error) {
    const reason = error instanceof Error && error.name === 'TimeoutError' ? 'timed out after 15s' : 'network request failed'
    console.warn(`[footystats] todays-matches ${reason}`)
    return []
  }
}

// Busca un partido por nombre de equipos (fuzzy match)
export function findFootyStatsMatch(
  matches: FootyStatsMatch[],
  homeName: string,
  awayName: string
): FootyStatsMatch | null {
  const aliases: Record<string, string> = {
    'psg': 'paris', 'paris': 'paris',
    'westbromwich': 'westbrom', 'westbromwichalbion': 'westbrom', 'westbrom': 'westbrom',
  }
  const normalize = (s: string) => {
    const stopwords = ['fc','cf','sc','ac','afc','city','united','utd','albion','athletic',
      'rovers','wanderers','wednesday','county','town','hotspur','saint','germain',
      'club','de','cp','north','south','east']
    const n = s.toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(' ')
      .filter((w: string) => w.length > 1 && !stopwords.includes(w))
      .join('')
    return aliases[n] ?? n
  }

  const h = normalize(homeName)
  const a = normalize(awayName)

  // Exact match primero
  let match = matches.find(m =>
    normalize(m.home_name) === h && normalize(m.away_name) === a
  )
  if (match) return match

  // Partial match (includes)
  match = matches.find(m =>
    (normalize(m.home_name).includes(h) || h.includes(normalize(m.home_name))) &&
    (normalize(m.away_name).includes(a) || a.includes(normalize(m.away_name)))
  )
  return match ?? null
}

export interface FootyStatsOdds {
  oddsHome?: number
  oddsDraw?: number
  oddsAway?: number
  oddsOver25?: number
  oddsOver15?: number
  oddsBtts?: number
  xgHome?: number
  xgAway?: number
  o25Potential?: number
  o15Potential?: number
  bttsPotential?: number
}

export function extractFootyStatsData(match: FootyStatsMatch): FootyStatsOdds {
  return {
    oddsHome:     match.odds_ft_1    || undefined,
    oddsDraw:     match.odds_ft_x    || undefined,
    oddsAway:     match.odds_ft_2    || undefined,
    oddsOver25:   match.odds_ft_over25 || undefined,
    oddsOver15:   match.odds_ft_over15 || undefined,
    oddsBtts:     match.odds_btts_yes  || undefined,
    xgHome:       match.team_a_xg_prematch || undefined,
    xgAway:       match.team_b_xg_prematch || undefined,
    o25Potential: match.o25_potential  || undefined,
    o15Potential: match.o15_potential  || undefined,
    bttsPotential: match.btts_potential || undefined,
  }
}
