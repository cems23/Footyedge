// ═══════════════════════════════════════════════════════════
// FootyEdge 2.0 — Motor Matemático Poisson v3
// Dixon-Coles + Dynamic Home Advantage + Temporal Decay
// ═══════════════════════════════════════════════════════════

export interface TeamStats {
  goalsScored: number
  goalsConceded: number
  matchesPlayed: number
  recentGoalsScored: number[]
  recentGoalsConceded: number[]
  recentXgScored?: number[]
  recentXgConceded?: number[]
  xgScored?: number
  xgConceded?: number
  isHome: boolean
}

export interface LeagueStats {
  avgHomeGoals: number
  avgAwayGoals: number
  avgTotalGoals: number
}

export interface MatchInput {
  home: TeamStats
  away: TeamStats
  league: LeagueStats
  leagueId?: number
  oddsOver25?: number
  oddsOver15?: number
  oddsBtts?: number
  oddsHome?: number
  oddsDraw?: number
  oddsAway?: number
}

export interface PoissonResult {
  expectedGoalsHome: number
  expectedGoalsAway: number
  probOver15: number
  probOver25: number
  probBtts: number
  probHomeWin: number
  probDraw: number
  probAwayWin: number
  formFactorHome: number
  formFactorAway: number
}

export interface ValueBet {
  market: 'over25' | 'over15' | 'btts' | 'home' | 'draw' | 'away'
  label: string
  modelProb: number
  impliedProb: number
  edge: number
  ev: number
  odds: number
  confidence: number
}

export interface MatchAnalysis {
  poisson: PoissonResult
  valueBets: ValueBet[]
  topBet: ValueBet | null
  confidenceScore: number
}

const MIN_EDGE = 0.12
const MIN_EV   = 0.10

// Umbrales más estrictos por mercado
const MARKET_MIN_EDGE: Record<string, number> = {
  home:   0.13,
  away:   0.15,
  draw:   0.10,
  over25: 0.10,
  over15: 0.10,
  btts:   0.10,
}
const MARKET_MIN_EV: Record<string, number> = {
  home:   0.12,
  away:   0.12,
  draw:   0.08,
  over25: 0.08,
  over15: 0.08,
  btts:   0.08,
}

export function poissonPMF(lambda: number, k: number): number {
  if (k < 0) return 0
  if (lambda <= 0) return k === 0 ? 1 : 0
  let logFact = 0
  for (let i = 2; i <= k; i++) logFact += Math.log(i)
  return Math.exp(-lambda + k * Math.log(lambda) - logFact)
}

export function poissonCDF(lambda: number, maxK: number): number {
  let cdf = 0
  for (let k = 0; k <= maxK; k++) cdf += poissonPMF(lambda, k)
  return Math.min(1, cdf)
}

const LEAGUE_RHO: Record<number, number> = {
  39: -0.10,  // Premier League — ofensiva
  40: -0.11,  // Championship
  41: -0.11,  // League One
  78: -0.09,  // Bundesliga — muy ofensiva
  79: -0.08,  // 2. Bundesliga — muy ofensiva
  61: -0.11,  // Ligue 1
  62: -0.10,  // Ligue 2 — ofensiva
  88: -0.10,  // Eredivisie — ofensiva
  94: -0.12,  // Primeira Liga
  135: -0.13, // Serie A — defensiva
  136: -0.12, // Serie B
  140: -0.12, // La Liga
  141: -0.12, // Segunda División
  144: -0.10, // Jupiler Pro League
  203: -0.14, // Süper Lig
  307: -0.16, // Saudi Pro — defensiva
  2:   -0.13, // Champions League
  3:   -0.12, // Europa League
  848: -0.12, // Conference League
  71:  -0.15, // Brasileirao — defensiva
  128: -0.16, // Liga Argentina
  253: -0.11, // MLS
  262: -0.14, // Liga MX
  283: -0.17, // Liga BetPlay — muy defensiva
  239: -0.15, // Primera Chile
  242: -0.15, // Primera Uruguay
}

function dixonColesRho(_lH: number, _lA: number, rho = -0.13, leagueId?: number): number {
  if (leagueId && LEAGUE_RHO[leagueId] !== undefined) return LEAGUE_RHO[leagueId]
  return rho
}

function dixonColesTau(h: number, a: number, lH: number, lA: number, rho: number): number {
  if (h === 0 && a === 0) return 1 - lH * lA * rho
  if (h === 0 && a === 1) return 1 + lH * rho
  if (h === 1 && a === 0) return 1 + lA * rho
  if (h === 1 && a === 1) return 1 - rho
  return 1
}

function weightedAvg(values: number[]): number {
  if (!values.length) return 0
  const recent = values.slice(-8)
  let sumW = 0, sumV = 0
  for (let i = 0; i < recent.length; i++) {
    const d = (recent.length - 1 - i) * 7
    const w = Math.exp(-0.023 * d)
    sumW += w
    sumV += w * recent[i]
  }
  return sumW > 0 ? sumV / sumW : 0
}

export function calcFormFactor(recentGoals: number[], seasonAvg: number): number {
  if (!recentGoals.length || seasonAvg === 0) return 1
  const weightedRecent = weightedAvg(recentGoals)
  const blended = 0.5 * weightedRecent + 0.5 * seasonAvg
  return Math.max(0.6, Math.min(1.4, blended / seasonAvg))
}

function blendWithXg(goalsAvg: number, xgAvg: number | undefined): number {
  if (!xgAvg || xgAvg <= 0) return goalsAvg
  return 0.3 * goalsAvg + 0.7 * xgAvg
}

export function attackStrength(teamAvg: number, leagueAvg: number): number {
  if (leagueAvg === 0) return 1
  return Math.min(2.5, Math.max(0.3, teamAvg / leagueAvg))
}

export function defenseWeakness(concededAvg: number, leagueAvg: number): number {
  if (leagueAvg === 0) return 1
  return Math.min(2.5, Math.max(0.3, concededAvg / leagueAvg))
}

export function calcLambdas(input: MatchInput) {
  const { home, away, league } = input

  const hMatchesPlayed = Math.max(1, home.matchesPlayed)
  const aMatchesPlayed = Math.max(1, away.matchesPlayed)

  // Sin partidos jugados esta temporada (ej. clasificatorias tempranas) —
  // usar el promedio de la liga en vez de dejar que el cálculo colapse a ~0,
  // que producía lambdas absurdamente bajas y EVs irreales.
  const hGoalsAvgRaw = home.matchesPlayed > 0 ? home.goalsScored / hMatchesPlayed : league.avgHomeGoals
  const hConAvgRaw   = home.matchesPlayed > 0 ? home.goalsConceded / hMatchesPlayed : league.avgAwayGoals
  const aGoalsAvgRaw = away.matchesPlayed > 0 ? away.goalsScored / aMatchesPlayed : league.avgAwayGoals
  const aConAvgRaw   = away.matchesPlayed > 0 ? away.goalsConceded / aMatchesPlayed : league.avgHomeGoals

  const hXgAvg    = home.xgScored   ? home.xgScored   / hMatchesPlayed : undefined
  const aXgAvg    = away.xgScored   ? away.xgScored   / aMatchesPlayed : undefined
  const hConXgAvg = home.xgConceded ? home.xgConceded / hMatchesPlayed : undefined
  const aConXgAvg = away.xgConceded ? away.xgConceded / aMatchesPlayed : undefined

  const hGoalsAvg = blendWithXg(hGoalsAvgRaw, hXgAvg)
  const aGoalsAvg = blendWithXg(aGoalsAvgRaw, aXgAvg)
  const hConAvg   = blendWithXg(hConAvgRaw,   hConXgAvg)
  const aConAvg   = blendWithXg(aConAvgRaw,   aConXgAvg)

  const formHome = calcFormFactor(home.recentGoalsScored, hGoalsAvg || 1)
  const formAway = calcFormFactor(away.recentGoalsScored, aGoalsAvg || 1)

  // Home advantage dinámico por liga (clampado 1.05-1.35)
  const dynamicHomeAdv = league.avgAwayGoals > 0
    ? Math.min(1.35, Math.max(1.05, league.avgHomeGoals / league.avgAwayGoals))
    : 1.15

  const rawLambdaHome =
    attackStrength(hGoalsAvg, league.avgHomeGoals) *
    defenseWeakness(aConAvg,  league.avgHomeGoals) *
    league.avgHomeGoals * formHome

  // Visitante penalizado por ventaja local de la liga
  const rawLambdaAway =
    attackStrength(aGoalsAvg, league.avgAwayGoals) *
    defenseWeakness(hConAvg,  league.avgAwayGoals) *
    (league.avgAwayGoals / dynamicHomeAdv) * formAway

  return {
    lambdaHome: Math.min(3.5, Math.max(0.3, rawLambdaHome)),
    lambdaAway: Math.min(3.5, Math.max(0.3, rawLambdaAway)),
    formHome,
    formAway,
    homeAdvantage: dynamicHomeAdv,
  }
}

export function prob1X2DixonColes(lH: number, lA: number, maxG = 8, leagueId?: number) {
  const rho = dixonColesRho(lH, lA, -0.13, leagueId)
  let home = 0, draw = 0, away = 0
  for (let h = 0; h <= maxG; h++) {
    for (let a = 0; a <= maxG; a++) {
      const tau = dixonColesTau(h, a, lH, lA, rho)
      const p = tau * poissonPMF(lH, h) * poissonPMF(lA, a)
      if (h > a) home += p
      else if (h === a) draw += p
      else away += p
    }
  }
  const total = home + draw + away || 1
  return {
    home: Math.max(0, Math.min(1, home / total)),
    draw: Math.max(0, Math.min(1, draw / total)),
    away: Math.max(0, Math.min(1, away / total)),
  }
}

export function probOver25DixonColes(lH: number, lA: number, leagueId?: number): number {
  const rho = dixonColesRho(lH, lA, -0.13, leagueId)
  let probUnder = 0
  for (let h = 0; h <= 2; h++) {
    for (let a = 0; a <= 2 - h; a++) {
      const tau = dixonColesTau(h, a, lH, lA, rho)
      probUnder += tau * poissonPMF(lH, h) * poissonPMF(lA, a)
    }
  }
  return Math.max(0, Math.min(1, 1 - probUnder))
}

export function probBTTSDixonColes(lH: number, lA: number, leagueId?: number): number {
  const rho = dixonColesRho(lH, lA, -0.13, leagueId)
  let pHome0 = 0, pAway0 = 0
  for (let a = 0; a <= 8; a++) {
    pHome0 += dixonColesTau(0, a, lH, lA, rho) * poissonPMF(lH, 0) * poissonPMF(lA, a)
  }
  for (let h = 0; h <= 8; h++) {
    pAway0 += dixonColesTau(h, 0, lH, lA, rho) * poissonPMF(lH, h) * poissonPMF(lA, 0)
  }
  const p00 = dixonColesTau(0, 0, lH, lA, rho) * poissonPMF(lH, 0) * poissonPMF(lA, 0)
  return Math.max(0, Math.min(1, 1 - pHome0 - pAway0 + p00))
}

export function probOver25(lH: number, lA: number): number { return probOver25DixonColes(lH, lA) }
export function probBTTS(lH: number, lA: number): number { return probBTTSDixonColes(lH, lA) }
export function prob1X2(lH: number, lA: number, maxG = 8) { return prob1X2DixonColes(lH, lA, maxG) }

export function valueMetrics(modelProb: number, odds: number) {
  if (odds <= 1) return { impliedProb: 1, edge: -1, ev: -1 }
  const impliedProb = 1 / odds
  return { impliedProb, edge: modelProb - impliedProb, ev: modelProb * odds - 1 }
}

export function calcConfidence(edge: number, ev: number, fH: number, fA: number, prob: number, matchesH = 10, matchesA = 10): number {
  const e = Math.min(1, Math.max(0, (edge - MIN_EDGE) / 0.20)) * 40
  const v = Math.min(1, Math.max(0, (ev   - MIN_EV)   / 0.40)) * 30
  const f = Math.min(1, Math.max(0, 1 - Math.abs((fH + fA) / 2 - 1) / 0.4)) * 20
  const s = Math.min(1, Math.max(0, 1 - Math.abs(prob - 0.5) / 0.5)) * 10
  // Penalizar por pocos partidos jugados
  const minMatches = Math.min(matchesH, matchesA)
  const dataPenalty = minMatches < 5 ? 0.5 : minMatches < 10 ? 0.75 : 1.0
  return Math.round((e + v + f + s) * dataPenalty)
}

export function analyzeMatch(input: MatchInput): MatchAnalysis {
  const { lambdaHome, lambdaAway, formHome, formAway } = calcLambdas(input)
  const lid = input.leagueId
  const p1x2 = prob1X2DixonColes(lambdaHome, lambdaAway, 8, lid)
  const lT = lambdaHome + lambdaAway

  const poisson: PoissonResult = {
    expectedGoalsHome: +lambdaHome.toFixed(3),
    expectedGoalsAway: +lambdaAway.toFixed(3),
    probOver15:  Math.max(0, Math.min(1, 1 - poissonCDF(lT, 1))),
    probOver25:  probOver25DixonColes(lambdaHome, lambdaAway, lid),
    probBtts:    probBTTSDixonColes(lambdaHome, lambdaAway, lid),
    probHomeWin: p1x2.home,
    probDraw:    p1x2.draw,
    probAwayWin: p1x2.away,
    formFactorHome: formHome,
    formFactorAway: formAway,
  }

  const markets: Array<{ market: ValueBet['market']; label: string; prob: number; odds?: number }> = [
    { market: 'over25', label: 'Over 2.5 Goles', prob: poisson.probOver25,  odds: input.oddsOver25 },
    { market: 'over15', label: 'Over 1.5 Goles', prob: poisson.probOver15,  odds: input.oddsOver15 },
    { market: 'btts',   label: 'Ambos Anotan',   prob: poisson.probBtts,    odds: input.oddsBtts   },
    { market: 'home',   label: 'Victoria Local',  prob: poisson.probHomeWin, odds: input.oddsHome   },
    { market: 'draw',   label: 'Empate',          prob: poisson.probDraw,    odds: input.oddsDraw   },
    { market: 'away',   label: 'Victoria Visita', prob: poisson.probAwayWin, odds: input.oddsAway   },
  ]

  const valueBets: ValueBet[] = markets
    .filter(m => m.odds && m.odds > 1.05 && m.odds < 15.0)
    .filter(m => !(m.market === 'draw' && m.odds! > 5.0))
    .map(m => {
      const { impliedProb, edge, ev } = valueMetrics(m.prob, m.odds!)
      return {
        market: m.market, label: m.label,
        modelProb: m.prob, impliedProb, edge, ev,
        odds: m.odds!,
        confidence: calcConfidence(edge, ev, formHome, formAway, m.prob, input.home.matchesPlayed, input.away.matchesPlayed)
      }
    })
    .filter(b => b.edge > (MARKET_MIN_EDGE[b.market] ?? MIN_EDGE) && b.ev > (MARKET_MIN_EV[b.market] ?? MIN_EV))
    // Bloquear apuestas con muy poco historial real — datos insuficientes para confiar,
    // sin importar qué tan alto se vea el EV (previene EVs absurdos por lambdas basados en 0 partidos)
    .filter(() => Math.min(input.home.matchesPlayed, input.away.matchesPlayed) >= 3)
    .sort((a, b) => b.ev * b.confidence - a.ev * a.confidence)

  return {
    poisson,
    valueBets,
    topBet: valueBets[0] ?? null,
    confidenceScore: valueBets[0]?.confidence ?? 0
  }
}
