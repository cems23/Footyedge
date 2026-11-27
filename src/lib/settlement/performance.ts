export type SettledMarket = 'home' | 'draw' | 'away' | 'over15' | 'over25' | 'btts'

// model_performance conserva fixture_id como identificador único. Un partido
// puede tener más de un mercado en daily_rankings, por lo que usar el id crudo
// para todos ellos provoca una colisión al liquidar el segundo mercado.
// Los ids negativos aíslan estas filas de los fixture_id históricos positivos.
const MARKET_CODE: Record<SettledMarket, number> = {
  home: 1,
  draw: 2,
  away: 3,
  over15: 4,
  over25: 5,
  btts: 6,
}

const MAX_INTEGER_ID = 214_748_364

export function performanceFixtureId(externalFixtureId: string, market: SettledMarket) {
  const fixtureId = Number(externalFixtureId)
  const marketCode = MARKET_CODE[market]
  if (!Number.isSafeInteger(fixtureId) || fixtureId < 1 || fixtureId > MAX_INTEGER_ID || !marketCode) {
    throw new Error(`Invalid fixture id for performance settlement: ${externalFixtureId}`)
  }
  return -((fixtureId * 10) + marketCode)
}
