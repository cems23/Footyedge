// Sistema de rating Elo para fútbol, inspirado en el World Football Elo Ratings
// (eloratings.net) — ventaja local, factor K adaptativo, y multiplicador por
// margen de goles. Complementa al modelo Poisson/Dixon-Coles, no lo reemplaza.

const HOME_ADV_ELO = 60          // ventaja local típica en puntos Elo (~60-100 es estándar en la literatura)
const DEFAULT_ELO = 1500

// K más alto al principio (el rating se ajusta rápido con pocos partidos),
// se estabiliza según se acumula historial — evita que un equipo recién creado
// tarde eternidades en reflejar su nivel real, pero tampoco sobre-reaccione
// una vez ya tiene una muestra decente.
function kFactor(matchesPlayed: number): number {
  if (matchesPlayed < 10) return 40
  if (matchesPlayed < 30) return 28
  return 20
}

// Multiplicador por margen de gol — un 4-0 mueve más el rating que un 1-0,
// pero con retornos decrecientes (no queremos que goleadas absurdas distorsionen todo).
function goalDiffMultiplier(goalDiff: number): number {
  const g = Math.abs(goalDiff)
  if (g <= 1) return 1
  if (g === 2) return 1.5
  return (11 + g) / 8
}

export function expectedScore(eloHome: number, eloAway: number): number {
  const diff = (eloAway - (eloHome + HOME_ADV_ELO))
  return 1 / (1 + Math.pow(10, diff / 400))
}

export interface EloUpdateResult {
  newEloHome: number
  newEloAway: number
}

/**
 * Actualiza los ratings Elo de local y visitante tras un resultado real.
 * homeGoals/awayGoals: marcador final. matchesPlayedHome/Away: partidos ya jugados
 * ANTES de este (para elegir el K factor correcto de cada equipo).
 */
export function updateElo(
  eloHome: number, eloAway: number,
  homeGoals: number, awayGoals: number,
  matchesPlayedHome: number, matchesPlayedAway: number
): EloUpdateResult {
  const actualHome = homeGoals > awayGoals ? 1 : homeGoals === awayGoals ? 0.5 : 0
  const expectedHome = expectedScore(eloHome, eloAway)
  const mult = goalDiffMultiplier(homeGoals - awayGoals)

  const kHome = kFactor(matchesPlayedHome)
  const kAway = kFactor(matchesPlayedAway)

  const delta = mult * (actualHome - expectedHome)

  return {
    newEloHome: eloHome + kHome * delta,
    newEloAway: eloAway - kAway * delta,
  }
}

/** Probabilidad 1X2 derivada puramente de Elo (sin considerar goles/forma) — útil
 * para mezclar con el modelo Poisson como señal complementaria, especialmente
 * cuando hay poco historial de goles para un equipo. */
export function eloProb1X2(eloHome: number, eloAway: number): { home: number; draw: number; away: number } {
  const expHome = expectedScore(eloHome, eloAway)
  // Aproximación estándar: convertir "expected score" (que ya mezcla victoria+empate)
  // en probabilidades 1X2 separadas usando una curva empírica de fútbol —
  // el empate es más probable cuando los equipos están parejos.
  const eloDiff = eloHome + HOME_ADV_ELO - eloAway
  const drawProb = Math.max(0.18, 0.32 - Math.abs(eloDiff) / 1000)
  const homeProb = expHome * (1 - drawProb) + drawProb * 0.5 * (expHome > 0.5 ? 1.15 : 0.85)
  const awayProb = 1 - homeProb - drawProb
  return {
    home: Math.max(0.02, Math.min(0.96, homeProb)),
    draw: Math.max(0.02, drawProb),
    away: Math.max(0.02, Math.min(0.96, awayProb)),
  }
}

export const DEFAULT_ELO_RATING = DEFAULT_ELO
