export type MomentumEvent = {
  minute: number
  type: 'goal' | 'red_card' | 'yellow_card' | 'var' | 'substitution'
  detail: string
  team: 'home' | 'away' | null
  player?: string | null
}

export type MomentumPoint = { minute: number; value: number }

export type PressureStats = {
  possession: number | null
  shotsOn: number | null
  shotsTotal: number | null
  corners: number | null
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace('%', ''))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function buildEventMomentum(events: MomentumEvent[], matchMinute: number | null): MomentumPoint[] {
  let current = 0
  const points: MomentumPoint[] = [{ minute: 0, value: 0 }]
  const ordered = [...events].sort((a, b) => a.minute - b.minute)

  for (const event of ordered) {
    if (!event.team) continue
    const side = event.team === 'home' ? 1 : -1
    const impact = event.type === 'goal' ? 42
      : event.type === 'red_card' ? -30
        : event.type === 'yellow_card' ? -6
          : event.type === 'var' ? 8
            : 0
    if (!impact) continue
    current = clamp(current + side * impact, -100, 100)
    points.push({ minute: clamp(event.minute, 0, 130), value: current })
  }

  const endMinute = clamp(matchMinute ?? 90, 1, 130)
  if (points[points.length - 1].minute < endMinute) points.push({ minute: endMinute, value: current })
  return points
}

export function calculatePressure(homeStats: PressureStats, awayStats: PressureStats) {
  const score = (stats: PressureStats) =>
    (stats.shotsOn ?? 0) * 3 + (stats.shotsTotal ?? 0) + (stats.corners ?? 0) * 1.5 + (stats.possession ?? 0) * 0.08
  const homeScore = score(homeStats)
  const awayScore = score(awayStats)
  const total = homeScore + awayScore
  const homeShare = total > 0 ? Math.round((homeScore / total) * 100) : 50
  return { home: homeShare, away: 100 - homeShare, available: total > 0 }
}
