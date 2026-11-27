import { getInjuriesForFixtures } from '@/lib/api/football'
import { summarizeTeamInjuries } from '@/lib/football/injuries'
import { isRadarCompetition } from '@/lib/football/radarCompetitions'
import { createServiceClient } from '@/lib/supabase/server'

const SETTINGS_ID = 'global'
const SOURCE_URL = 'https://www.api-football.com/documentation_v3'
const MAX_LEAGUES = 50

type WatchFixture = {
  id: string
  external_id: string
  league_id: number
  league_name: string
  kickoff_at: string
  home_team_id: number
  home_team_name: string
  away_team_id: number
  away_team_name: string
}

export function normalizeWatchLeagueIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map(Number).filter((id) => Number.isInteger(id) && isRadarCompetition(id)))).slice(0, MAX_LEAGUES)
}

export async function getInjuryWatchSettings() {
  const service = createServiceClient()
  const { data, error } = await service.from('injury_watch_settings').select('*').eq('id', SETTINGS_ID).single()
  if (error) throw error
  return data
}

export async function saveInjuryWatchSettings({ leagueIds, enabled, updatedBy }: { leagueIds: number[]; enabled: boolean; updatedBy: string }) {
  const service = createServiceClient()
  const { data, error } = await service.from('injury_watch_settings').upsert({
    id: SETTINGS_ID,
    league_ids: leagueIds,
    enabled,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
    last_daily_scan_on: null,
  }, { onConflict: 'id' }).select().single()
  if (error) throw error
  return data
}

export async function getLatestInjuryWatch() {
  const service = createServiceClient()
  const settings = await getInjuryWatchSettings()
  const { data: scan, error: scanError } = await service
    .from('injury_watch_scans')
    .select('*')
    .in('status', ['completed', 'partial'])
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (scanError) throw scanError

  const { data: alerts, error: alertsError } = scan
    ? await service.from('injury_watch_alerts')
      .select('id,match_id,team_id,team_name,confirmed_injuries,questionable_count,suspension_count,players,source,retrieved_at,matches(home_team_name,away_team_name,league_name,kickoff_at)')
      .eq('scan_id', scan.id)
      .order('confirmed_injuries', { ascending: false })
      .order('created_at', { ascending: false })
    : { data: [], error: null }
  if (alertsError) throw alertsError

  return { settings, scan, alerts: alerts ?? [], sourceUrl: SOURCE_URL }
}

/** Clears only saved scan output. The selected competitions and daily setting
 * stay intact, and this never calls API-Football. */
export async function clearInjuryWatchHistory() {
  const service = createServiceClient()
  // The alerts reference scans with ON DELETE CASCADE, so this removes both
  // the stale cards and their historical scan rows in one deliberate action.
  const { error } = await service
    .from('injury_watch_scans')
    .delete()
    .in('status', ['running', 'completed', 'partial', 'failed'])
  if (error) throw error
}

export async function runInjuryWatch({ leagueIds, trigger }: { leagueIds: number[]; trigger: 'manual' | 'daily' }) {
  const service = createServiceClient()
  const selectedLeagueIds = normalizeWatchLeagueIds(leagueIds)
  if (!selectedLeagueIds.length) throw new Error('Selecciona al menos una competición válida.')

  const { data: scan, error: scanError } = await service.from('injury_watch_scans').insert({
    trigger,
    selected_league_ids: selectedLeagueIds,
    status: 'running',
    started_at: new Date().toISOString(),
  }).select().single()
  if (scanError || !scan) throw scanError ?? new Error('No se pudo crear el barrido.')

  try {
    const now = new Date()
    const until = new Date(now)
    until.setDate(until.getDate() + 7)
    const { data: rawFixtures, error: fixturesError } = await service.from('matches')
      .select('id,external_id,league_id,league_name,kickoff_at,home_team_id,home_team_name,away_team_id,away_team_name')
      .in('league_id', selectedLeagueIds)
      .gt('kickoff_at', now.toISOString())
      .lte('kickoff_at', until.toISOString())
      .not('external_id', 'is', null)
      .order('kickoff_at', { ascending: true })
      .limit(300)
    if (fixturesError) throw fixturesError

    const fixtures = (rawFixtures ?? []).filter((fixture: any) => fixture.home_team_id && fixture.away_team_id) as WatchFixture[]
    const provider = await getInjuriesForFixtures(fixtures.map((fixture) => fixture.external_id))
    const alerts = fixtures.flatMap((fixture) => {
      const fixtureInjuries = provider.injuries.filter((injury) => String(injury.fixture?.id ?? '') === String(fixture.external_id))
      const teams = [
        { id: fixture.home_team_id, name: fixture.home_team_name },
        { id: fixture.away_team_id, name: fixture.away_team_name },
      ]
      return teams.flatMap((team) => {
        const summary = summarizeTeamInjuries(fixtureInjuries, team.id)
        if (summary.confirmed.length < 3) return []
        return [{
          scan_id: scan.id,
          match_id: fixture.id,
          team_id: team.id,
          team_name: team.name,
          confirmed_injuries: summary.confirmed.length,
          questionable_count: summary.questionable.length,
          suspension_count: summary.suspensions.length,
          players: { confirmed: summary.confirmed, questionable: summary.questionable, suspensions: summary.suspensions },
          source: 'API-Football /injuries',
          retrieved_at: new Date().toISOString(),
        }]
      })
    })

    if (alerts.length) {
      const { error: alertsError } = await service.from('injury_watch_alerts').insert(alerts)
      if (alertsError) throw alertsError
    }

    const status = provider.failedBatches ? 'partial' : 'completed'
    const { error: doneError } = await service.from('injury_watch_scans').update({
      status,
      completed_at: new Date().toISOString(),
      fixtures_scanned: fixtures.length,
      provider_calls: provider.providerCalls,
      cache_hits: provider.cacheHits,
      failed_batches: provider.failedBatches,
      alerts_found: alerts.length,
    }).eq('id', scan.id)
    if (doneError) throw doneError

    return { success: true, status, scanId: scan.id, fixturesScanned: fixtures.length, providerCalls: provider.providerCalls, cacheHits: provider.cacheHits, failedBatches: provider.failedBatches, alertsFound: alerts.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    await service.from('injury_watch_scans').update({ status: 'failed', completed_at: new Date().toISOString(), error: message }).eq('id', scan.id)
    throw error
  }
}

export async function runScheduledInjuryWatch() {
  const settings = await getInjuryWatchSettings()
  if (!settings.enabled || !settings.league_ids?.length) return { success: true, status: 'skipped_disabled' }

  const today = new Date().toISOString().slice(0, 10)
  if (settings.last_daily_scan_on === today) return { success: true, status: 'skipped_already_scanned' }

  const result = await runInjuryWatch({ leagueIds: settings.league_ids, trigger: 'daily' })
  if (result.status === 'completed') {
    const service = createServiceClient()
    await service.from('injury_watch_settings').update({ last_daily_scan_on: today, updated_at: new Date().toISOString() }).eq('id', SETTINGS_ID)
  }
  return result
}
