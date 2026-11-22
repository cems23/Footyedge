export type ApiFootballInjury = {
  fixture?: { id?: number }
  team?: { id?: number; name?: string }
  player?: { id?: number; name?: string; type?: string; reason?: string }
}

export type InjuryAbsence = {
  playerId: number | null
  name: string
  reason: string
  availability: 'confirmed' | 'questionable'
}

const SUSPENSION = /suspend|sanci[oó]n|red card|yellow cards?/i
const QUESTIONABLE = /questionable|doubtful|duda/i

/**
 * API-Football groups injuries by fixture and team. We deliberately count only
 * confirmed injuries here: suspensions and doubtful players remain useful
 * context, but must not create a misleading "3 injured" alert.
 */
export function summarizeTeamInjuries(injuries: ApiFootballInjury[], teamId: number) {
  const confirmed: InjuryAbsence[] = []
  const questionable: InjuryAbsence[] = []
  const suspensions: InjuryAbsence[] = []
  const seen = new Set<string>()

  for (const injury of injuries) {
    if (injury.team?.id !== teamId || !injury.player?.name) continue
    const key = String(injury.player.id ?? injury.player.name)
    if (seen.has(key)) continue
    seen.add(key)

    const reason = injury.player.reason ?? injury.player.type ?? 'Baja reportada'
    const absence: InjuryAbsence = {
      playerId: injury.player.id ?? null,
      name: injury.player.name,
      reason,
      availability: QUESTIONABLE.test(injury.player.type ?? '') || QUESTIONABLE.test(reason) ? 'questionable' : 'confirmed',
    }

    if (SUSPENSION.test(reason)) suspensions.push(absence)
    else if (absence.availability === 'questionable') questionable.push(absence)
    else confirmed.push(absence)
  }

  return { confirmed, questionable, suspensions }
}
