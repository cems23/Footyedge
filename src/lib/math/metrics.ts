// ═══════════════════════════════════════════════════════════
// FootyEdge 2.0 — Motor de Métricas
// ROI · Yield · Drawdown · Kelly · Rankings
// ═══════════════════════════════════════════════════════════

export interface Pick {
  id: string
  matchId: string
  market: string
  odds: number
  stake: number
  modelProb: number
  ev: number
  edge: number
  confidence: number
  result: 'win' | 'loss' | 'void' | 'pending'
  profit: number
  createdAt: string
  settledAt?: string
}

export interface EquityPoint {
  betNumber: number
  date: string
  equity: number
  drawdown: number
  isNewHigh: boolean
}

export interface PerformanceMetrics {
  totalBets: number
  settledBets: number
  wins: number
  losses: number
  winRate: number
  totalStaked: number
  totalProfit: number
  roi: number
  yield: number
  avgOdds: number
  avgEV: number
  avgEdge: number
  maxDrawdown: number
  currentDrawdown: number
  peakEquity: number
  currentEquity: number
  equityCurve: EquityPoint[]
  streak: { current: number; type: 'win' | 'loss' | 'none'; best: number; worst: number }
}

export interface RankedBet {
  matchId: string
  matchLabel: string
  leagueName: string
  kickoffAt: string
  market: string
  marketLabel: string
  odds: number
  ev: number
  edge: number
  confidence: number
  kellyStake: number
  rankScore: number
  expectedGoalsHome?: number
  expectedGoalsAway?: number
  probModel?: number
}

// ── MÉTRICAS CORE ────────────────────────────────────────────

export function calcROI(profit: number, staked: number): number {
  return staked === 0 ? 0 : (profit / staked) * 100
}

export function calcYield(profit: number, bets: number, avgStake: number): number {
  const d = bets * avgStake
  return d === 0 ? 0 : (profit / d) * 100
}

export function calcWinRate(wins: number, settled: number): number {
  return settled === 0 ? 0 : (wins / settled) * 100
}

// ── EQUITY CURVE ─────────────────────────────────────────────

export function calcEquityCurve(picks: Pick[], initialBankroll = 100): EquityPoint[] {
  const settled = picks
    .filter(p => p.result === 'win' || p.result === 'loss')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  let equity = initialBankroll
  let peak   = initialBankroll
  const curve: EquityPoint[] = []

  settled.forEach((p, i) => {
    equity += p.profit
    const isNewHigh = equity > peak
    if (isNewHigh) peak = equity
    curve.push({
      betNumber: i + 1,
      date: p.settledAt || p.createdAt,
      equity:   +equity.toFixed(2),
      drawdown: peak > 0 ? +((peak - equity) / peak * 100).toFixed(2) : 0,
      isNewHigh,
    })
  })

  return curve
}

export function calcMaxDrawdown(curve: EquityPoint[]): number {
  return curve.length === 0 ? 0 : Math.max(...curve.map(p => p.drawdown))
}

// ── STREAK ───────────────────────────────────────────────────

export function calcStreak(picks: Pick[]): PerformanceMetrics['streak'] {
  const settled = picks
    .filter(p => p.result === 'win' || p.result === 'loss')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  if (!settled.length) return { current: 0, type: 'none', best: 0, worst: 0 }

  const lastType = settled[settled.length - 1].result as 'win' | 'loss'
  let current = 1
  for (let i = settled.length - 2; i >= 0; i--) {
    if (settled[i].result === lastType) current++
    else break
  }

  let best = 1, worst = 1, temp = 1
  for (let i = 1; i < settled.length; i++) {
    if (settled[i].result === settled[i - 1].result) { temp++ }
    else {
      if (settled[i - 1].result === 'win')  best  = Math.max(best,  temp)
      if (settled[i - 1].result === 'loss') worst = Math.max(worst, temp)
      temp = 1
    }
  }
  if (settled[settled.length - 1].result === 'win')  best  = Math.max(best,  temp)
  if (settled[settled.length - 1].result === 'loss') worst = Math.max(worst, temp)

  return { current, type: lastType, best, worst }
}

// ── PERFORMANCE COMPLETO ─────────────────────────────────────

export function calcPerformance(picks: Pick[], initialBankroll = 100): PerformanceMetrics {
  const settled = picks.filter(p => p.result !== 'pending' && p.result !== 'void')
  const wins    = settled.filter(p => p.result === 'win')

  const totalStaked  = settled.reduce((s, p) => s + p.stake, 0)
  const totalProfit  = settled.reduce((s, p) => s + p.profit, 0)
  const avgStake     = settled.length > 0 ? totalStaked / settled.length : 1

  const curve        = calcEquityCurve(picks, initialBankroll)
  const last         = curve[curve.length - 1]

  return {
    totalBets: picks.length,
    settledBets: settled.length,
    wins: wins.length,
    losses: settled.length - wins.length,
    winRate: calcWinRate(wins.length, settled.length),
    totalStaked,
    totalProfit,
    roi:   calcROI(totalProfit, totalStaked),
    yield: calcYield(totalProfit, settled.length, avgStake),
    avgOdds:  settled.length > 0 ? settled.reduce((s, p) => s + p.odds, 0) / settled.length : 0,
    avgEV:    settled.length > 0 ? settled.reduce((s, p) => s + p.ev,   0) / settled.length : 0,
    avgEdge:  settled.length > 0 ? settled.reduce((s, p) => s + p.edge, 0) / settled.length : 0,
    maxDrawdown:     calcMaxDrawdown(curve),
    currentDrawdown: last?.drawdown ?? 0,
    peakEquity:      curve.reduce((m, p) => Math.max(m, p.equity), initialBankroll),
    currentEquity:   last?.equity ?? initialBankroll,
    equityCurve:     curve,
    streak:          calcStreak(picks),
  }
}

// ── KELLY CRITERION (Quarter Kelly por defecto) ──────────────

export function calcKelly(modelProb: number, odds: number, fraction = 0.25): number {
  if (odds <= 1 || modelProb <= 0 || modelProb >= 1) return 0
  const b = odds - 1
  const kelly = (modelProb * b - (1 - modelProb)) / b
  return Math.max(0, kelly * fraction)
}

// ── RANKING DIARIO ───────────────────────────────────────────
// rankScore = EV×0.40 + edge×0.35 + conf/100×0.15 + leagueWeight×0.10

export function calcRankScore(ev: number, edge: number, conf: number, leagueW = 1.0): number {
  return ev * 0.40 + edge * 0.35 + (conf / 100) * 0.15 + leagueW * 0.10
}

export function getTop5(bets: RankedBet[]): RankedBet[] {
  return [...bets].sort((a, b) => b.rankScore - a.rankScore).slice(0, 5)
}
