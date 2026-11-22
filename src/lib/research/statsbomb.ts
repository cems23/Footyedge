/**
 * StatsBomb Open Data is deliberately isolated from FootyEdge production data.
 *
 * The upstream agreement is research-only. Do not persist raw payloads, expose
 * them to public routes, or use the returned summaries to alter live picks.
 */

const RAW_BASE = 'https://raw.githubusercontent.com/hudl/open-data/master/data'
export const STATSBOMB_SOURCE_URL = 'https://github.com/hudl/open-data'
export const STATSBOMB_TERMS_URL = 'https://github.com/hudl/open-data/blob/master/README.md'

type ProviderNamedValue = { name?: string | null }

type StatsBombCompetitionRow = {
  competition_id?: number
  competition_name?: string
  country_name?: string | null
  season_id?: number
  season_name?: string
  match_updated?: string | null
  match_available?: string | null
  match_available_360?: string | null
}

type StatsBombMatchRow = {
  match_id?: number
  match_date?: string
  kick_off?: string | null
  home_team?: ProviderNamedValue
  away_team?: ProviderNamedValue
  home_score?: number | null
  away_score?: number | null
  competition?: ProviderNamedValue
  season?: ProviderNamedValue
}

type StatsBombEventRow = {
  type?: ProviderNamedValue
  team?: ProviderNamedValue
  shot?: {
    statsbomb_xg?: number | null
    outcome?: ProviderNamedValue
  }
  pass?: { outcome?: ProviderNamedValue }
}

export type StatsBombCompetition = {
  competitionId: number
  seasonId: number
  competitionName: string
  countryName: string | null
  seasonName: string
  updatedAt: string | null
  has360: boolean
}

export type StatsBombMatch = {
  matchId: number
  date: string
  kickOff: string | null
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
}

export type TeamEventProfile = {
  team: string
  shots: number
  shotsOnTarget: number
  goals: number
  xg: number
  pressures: number
  completedPasses: number
  passAttempts: number
  passCompletion: number | null
}

export type StatsBombMatchProfile = {
  matchId: number
  source: 'statsbomb-open-data'
  teams: TeamEventProfile[]
  eventCount: number
  note: string
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${RAW_BASE}/${path}`, {
    next: { revalidate: 60 * 60 * 6 },
    headers: { accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`StatsBomb Open Data respondió HTTP ${response.status}`)
  return response.json() as Promise<T>
}

function toFiniteInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

export function isSafeStatsBombId(value: string | null) {
  return Boolean(value && /^\d{1,12}$/.test(value) && Number(value) > 0)
}

export async function getStatsBombCatalog(): Promise<StatsBombCompetition[]> {
  const rows = await getJson<StatsBombCompetitionRow[]>('competitions.json')
  if (!Array.isArray(rows)) throw new Error('El catálogo de StatsBomb no tiene el formato esperado.')

  return rows.flatMap((row) => {
    const competitionId = toFiniteInteger(row.competition_id)
    const seasonId = toFiniteInteger(row.season_id)
    if (!competitionId || !seasonId || !row.competition_name || !row.season_name) return []
    return [{
      competitionId,
      seasonId,
      competitionName: row.competition_name,
      countryName: row.country_name ?? null,
      seasonName: row.season_name,
      updatedAt: row.match_updated ?? row.match_available ?? null,
      has360: Boolean(row.match_available_360),
    }]
  }).sort((a, b) => a.competitionName.localeCompare(b.competitionName) || b.seasonName.localeCompare(a.seasonName))
}

export async function getStatsBombMatches(competitionId: number, seasonId: number): Promise<StatsBombMatch[]> {
  if (!Number.isInteger(competitionId) || !Number.isInteger(seasonId) || competitionId < 1 || seasonId < 1) {
    throw new Error('La competición o temporada de StatsBomb no es válida.')
  }
  const rows = await getJson<StatsBombMatchRow[]>(`matches/${competitionId}/${seasonId}.json`)
  if (!Array.isArray(rows)) throw new Error('La lista de partidos de StatsBomb no tiene el formato esperado.')

  return rows.flatMap((row) => {
    const matchId = toFiniteInteger(row.match_id)
    const homeTeam = row.home_team?.name?.trim()
    const awayTeam = row.away_team?.name?.trim()
    if (!matchId || !homeTeam || !awayTeam || !row.match_date) return []
    return [{
      matchId,
      date: row.match_date,
      kickOff: row.kick_off ?? null,
      homeTeam,
      awayTeam,
      homeScore: typeof row.home_score === 'number' ? row.home_score : null,
      awayScore: typeof row.away_score === 'number' ? row.away_score : null,
    }]
  }).sort((a, b) => b.date.localeCompare(a.date))
}

export function summarizeStatsBombEvents(events: StatsBombEventRow[]): TeamEventProfile[] {
  const teams = new Map<string, Omit<TeamEventProfile, 'passCompletion'>>()
  const getTeam = (name?: string | null) => {
    const key = name?.trim() || 'Equipo sin identificar'
    const existing = teams.get(key)
    if (existing) return existing
    const created = { team: key, shots: 0, shotsOnTarget: 0, goals: 0, xg: 0, pressures: 0, completedPasses: 0, passAttempts: 0 }
    teams.set(key, created)
    return created
  }

  for (const event of events) {
    const type = event.type?.name?.toLowerCase()
    if (!type) continue
    const team = getTeam(event.team?.name)
    if (type === 'shot') {
      team.shots++
      const xg = event.shot?.statsbomb_xg
      if (typeof xg === 'number' && Number.isFinite(xg)) team.xg += xg
      const outcome = event.shot?.outcome?.name?.toLowerCase()
      if (outcome === 'goal') { team.goals++; team.shotsOnTarget++ }
      else if (outcome === 'saved' || outcome === 'saved to post') team.shotsOnTarget++
    } else if (type === 'pressure') {
      team.pressures++
    } else if (type === 'pass') {
      team.passAttempts++
      if (!event.pass?.outcome?.name) team.completedPasses++
    }
  }

  return Array.from(teams.values())
    .map((team) => ({ ...team, xg: Number(team.xg.toFixed(2)), passCompletion: team.passAttempts ? Math.round((team.completedPasses / team.passAttempts) * 100) : null }))
    .sort((a, b) => b.xg - a.xg || b.shots - a.shots)
}

export async function getStatsBombMatchProfile(matchId: number): Promise<StatsBombMatchProfile> {
  if (!Number.isInteger(matchId) || matchId < 1) throw new Error('El partido de StatsBomb no es válido.')
  const events = await getJson<StatsBombEventRow[]>(`events/${matchId}.json`)
  if (!Array.isArray(events)) throw new Error('Los eventos de StatsBomb no tienen el formato esperado.')
  return {
    matchId,
    source: 'statsbomb-open-data',
    teams: summarizeStatsBombEvents(events),
    eventCount: events.length,
    note: 'Resumen de investigación histórico. No modifica picks ni predicciones en producción.',
  }
}
