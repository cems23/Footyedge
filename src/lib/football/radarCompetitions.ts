export type RadarCompetition = {
  id: number
  name: string
}

// Catálogo disponible para el scouting manual. Es deliberadamente el mismo
// universo que procesa el pipeline; la UI y la API comparten esta fuente para
// que una competición seleccionable siempre pueda analizarse en servidor.
export const RADAR_COMPETITIONS: RadarCompetition[] = [
  { id: 2, name: 'Champions League' },
  { id: 3, name: 'Europa League' },
  { id: 848, name: 'Conference League' },
  { id: 13, name: 'Libertadores' },
  { id: 11, name: 'Sudamericana' },
  { id: 39, name: 'Premier League' },
  { id: 40, name: 'Championship' },
  { id: 41, name: 'League One' },
  { id: 42, name: 'League Two' },
  { id: 140, name: 'La Liga' },
  { id: 141, name: 'Segunda División' },
  { id: 135, name: 'Serie A' },
  { id: 136, name: 'Serie B' },
  { id: 78, name: 'Bundesliga' },
  { id: 79, name: 'Bundesliga 2' },
  { id: 61, name: 'Ligue 1' },
  { id: 62, name: 'Ligue 2' },
  { id: 88, name: 'Eredivisie' },
  { id: 94, name: 'Primeira Liga' },
  { id: 203, name: 'Süper Lig' },
  { id: 144, name: 'Pro League' },
  { id: 128, name: 'Liga Argentina' },
  { id: 71, name: 'Brasileirao' },
  { id: 253, name: 'MLS' },
  { id: 262, name: 'Liga MX' },
  { id: 113, name: 'Allsvenskan' },
  { id: 164, name: 'Úrvalsdeild' },
  { id: 103, name: 'Eliteserien' },
  { id: 106, name: 'Ekstraklasa' },
  { id: 207, name: 'Super League Suiza' },
  { id: 179, name: 'Scottish Premiership' },
  { id: 307, name: 'Saudi Pro' },
  { id: 235, name: 'RPL' },
  { id: 119, name: 'Superliga Dinamarca' },
  { id: 218, name: 'Bundesliga Austria' },
  { id: 197, name: 'Super League Grecia' },
  { id: 239, name: 'Liga BetPlay' },
  { id: 265, name: 'Primera Chile' },
  { id: 268, name: 'Primera Uruguay' },
  { id: 332, name: 'Persian Gulf' },
  { id: 299, name: 'Venezuela Primera' },
  { id: 98, name: 'J1 League' },
  { id: 292, name: 'K League 1' },
]

export const RADAR_COMPETITION_IDS = new Set(RADAR_COMPETITIONS.map((competition) => competition.id))

export function isRadarCompetition(leagueId: number | null | undefined) {
  return typeof leagueId === 'number' && RADAR_COMPETITION_IDS.has(leagueId)
}
