// ═══════════════════════════════════════════════════════════
// FootyEdge 2.0 — Team & League Stats Aggregator
// Rankings de mercados por equipo, inspirado en BetMines
// Funciones puras: entrada = partidos históricos, salida = stats
// ═══════════════════════════════════════════════════════════

export interface RawMatch {
  home_team_name: string
  away_team_name: string
  home_goals: number
  away_goals: number
  result: 'home' | 'away' | 'draw'
  over25_result: boolean
  btts_result: boolean
  kickoff_at: string
}

export interface MarketStats {
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  avgGoalsFor: number
  avgGoalsAgainst: number
  over05Pct: number
  over15Pct: number
  over25Pct: number
  over35Pct: number
  bttsPct: number
  cleanSheetPct: number
}

const emptyStats = (): MarketStats => ({
  played: 0, wins: 0, draws: 0, losses: 0,
  goalsFor: 0, goalsAgainst: 0, avgGoalsFor: 0, avgGoalsAgainst: 0,
  over05Pct: 0, over15Pct: 0, over25Pct: 0, over35Pct: 0,
  bttsPct: 0, cleanSheetPct: 0,
})

export function computeTeamMarketStats(matches: RawMatch[], teamName: string): MarketStats {
  if (matches.length === 0) return emptyStats()

  let wins = 0, draws = 0, losses = 0
  let goalsFor = 0, goalsAgainst = 0
  let over05 = 0, over15 = 0, over25 = 0, over35 = 0
  let btts = 0, cleanSheets = 0

  for (const m of matches) {
    const isHome = m.home_team_name === teamName
    const gf = isHome ? m.home_goals : m.away_goals
    const ga = isHome ? m.away_goals : m.home_goals
    const totalGoals = m.home_goals + m.away_goals

    goalsFor += gf
    goalsAgainst += ga

    if (ga === 0) cleanSheets++
    if (totalGoals > 0.5) over05++
    if (totalGoals > 1.5) over15++
    if (totalGoals > 2.5) over25++
    if (totalGoals > 3.5) over35++
    if (m.btts_result) btts++

    const won = (isHome && m.result === 'home') || (!isHome && m.result === 'away')
    if (m.result === 'draw') draws++
    else if (won) wins++
    else losses++
  }

  const n = matches.length
  return {
    played: n,
    wins, draws, losses,
    goalsFor, goalsAgainst,
    avgGoalsFor: round2(goalsFor / n),
    avgGoalsAgainst: round2(goalsAgainst / n),
    over05Pct: pct(over05, n),
    over15Pct: pct(over15, n),
    over25Pct: pct(over25, n),
    over35Pct: pct(over35, n),
    bttsPct: pct(btts, n),
    cleanSheetPct: pct(cleanSheets, n),
  }
}

export interface TeamRanking {
  team: string
  total: MarketStats
  home: MarketStats
  away: MarketStats
}

export function buildLeagueRankings(allMatches: RawMatch[], matchLimit = 10): TeamRanking[] {
  const teams = new Set<string>()
  for (const m of allMatches) {
    teams.add(m.home_team_name)
    teams.add(m.away_team_name)
  }

  const sorted = [...allMatches].sort(
    (a, b) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime()
  )

  const rankings: TeamRanking[] = []
  for (const team of Array.from(teams)) {
    const teamMatches = sorted.filter(
      m => m.home_team_name === team || m.away_team_name === team
    )
    const homeMatches = teamMatches.filter(m => m.home_team_name === team).slice(0, matchLimit)
    const awayMatches = teamMatches.filter(m => m.away_team_name === team).slice(0, matchLimit)
    const totalMatches = teamMatches.slice(0, matchLimit)

    rankings.push({
      team,
      total: computeTeamMarketStats(totalMatches, team),
      home: computeTeamMarketStats(homeMatches, team),
      away: computeTeamMarketStats(awayMatches, team),
    })
  }

  return rankings.sort((a, b) => b.total.over25Pct - a.total.over25Pct)
}

function pct(count: number, total: number): number {
  return total === 0 ? 0 : round1((count / total) * 100)
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function round2(n: number): number {
  return Math.round(n * 100) / 100
}
