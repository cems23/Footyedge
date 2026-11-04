import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runSignalCheck } from '@/lib/ai/signalCheck'
import { apf } from '@/lib/api/football'

// El trabajo contextual se limita estrictamente a cinco candidatos. 90s deja
// margen para API-Football y la IA sin convertir el cron en un trabajo masivo.
export const maxDuration = 90
export const dynamic = 'force-dynamic'

const MAX_AUTOMATIC_CONTEXTS = 5

function summarizeForm(fixtures: any[], teamId: number) {
  return (fixtures || []).slice(0, 5).map((fixture: any) => {
    const isHome = fixture.teams?.home?.id === teamId
    const winner = isHome ? fixture.teams?.home?.winner : fixture.teams?.away?.winner
    if (winner === true) return 'V'
    if (winner === false) return 'D'
    return 'E'
  }).join('')
}

function listedAbsences(injuries: any[], teamId: number) {
  const seen = new Set<string>()
  return (injuries || []).flatMap((injury: any) => {
    if (injury.team?.id !== teamId || !injury.player?.name) return []
    const key = String(injury.player?.id ?? injury.player.name)
    if (seen.has(key)) return []
    seen.add(key)
    return [{ name: injury.player.name, reason: injury.player?.reason ?? injury.player?.type ?? 'baja reportada' }]
  })
}

function listedLineup(lineups: any[], teamId: number) {
  const lineup = (lineups || []).find((item: any) => item.team?.id === teamId)
  if (!lineup?.startXI?.length) return { published: false, formation: null, players: [] as string[] }
  return {
    published: true,
    formation: lineup.formation ?? null,
    players: lineup.startXI.slice(0, 11).map((item: any) => item.player?.name).filter(Boolean),
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow authenticated admin users too
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: userData } = await supabase.from('users').select('email').eq('id', user.id).single()
    const adminEmails = ['admin@footyedge.com', 'carlosmartens8@gmail.com']
    if (!adminEmails.includes(userData?.email || '')) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // Leer staging
  const { data: staging } = await supabase
    .from('staging_rankings')
    .select('*')
    .eq('date', today)
    .order('rank_score', { ascending: false })

  if (!staging?.length) {
    // A day without qualifying value bets is a valid result, not a pipeline failure.
    return NextResponse.json({ success: true, status: 'no_rankings', message: 'No rankings found' })
  }

  // Obtener predicciones y odds actuales para recalcular EV
  const matchIds = Array.from(new Set(staging.map((r: any) => r.match_id)))
  const [{ data: preds }, { data: snaps }, { data: todayMatches }] = await Promise.all([
    supabase.from('model_predictions').select('match_id,prob_home_win,prob_draw,prob_away_win,prob_over25,prob_btts').in('match_id', matchIds),
    supabase.from('odds_snapshots').select('match_id,odds_home,odds_draw,odds_away,odds_over25').in('match_id', matchIds),
    // Ventana ampliada hasta las 06:00 UTC del dia siguiente (no el dia completo) —
    // cubre partidos que arrancan entre 23:00-05:00 UTC, muy comunes en futbol
    // latinoamericano, que con el corte exacto a medianoche UTC nunca llegaban a
    // tiempo a convertirse en Value Bet antes del kickoff. No se amplia mas que eso
    // para no adelantar partidos de mañana a la tarde como si fueran "de hoy".
    supabase.from('matches').select('id,kickoff_at,league_id,home_team_id,away_team_id,home_team_name,away_team_name,season,external_id').in('id', matchIds)
      .gte('kickoff_at', today + 'T00:00:00.000Z')
      .lt('kickoff_at', new Date(new Date(today).getTime() + 86400000).toISOString().split('T')[0] + 'T06:00:00.000Z'),
  ])
  const todayMatchIds = new Set((todayMatches ?? []).map((m: any) => m.id))
  const leagueIdByMatch = Object.fromEntries((todayMatches ?? []).map((m: any) => [m.id, m.league_id]))
  const matchDataById = Object.fromEntries((todayMatches ?? []).map((m: any) => [m.id, m]))

  // Ligas grandes con mercados más eficientes/líquidos — el mercado merece más peso
  // ahí. Ligas chicas suelen tener menos dinero circulando y odds menos afinadas,
  // así que confiamos más en el modelo. Pesos de partida, a recalibrar con datos
  // reales una vez haya suficientes apuestas liquidadas bajo este sistema.
  const MAJOR_LEAGUES = new Set([2, 39, 140, 135, 78, 61]) // Champions, PL, LaLiga, SerieA, Bundesliga, Ligue1
  const MODEL_WEIGHT_MAJOR = 0.6
  const MODEL_WEIGHT_MINOR = 0.8

  const predMap = Object.fromEntries((preds ?? []).map(p => [p.match_id, p]))
  const snapMap = Object.fromEntries((snaps ?? []).map(s => [s.match_id, s]))

  const recalcEV = (r: any) => {
    const pred = predMap[r.match_id]
    const snap = snapMap[r.match_id]
    if (!pred) return { ev: r.ev, edge: r.edge, odds: r.odds }
    const probMap: Record<string, number> = {
      home: pred.prob_home_win, away: pred.prob_away_win,
      draw: pred.prob_draw, over25: pred.prob_over25, btts: pred.prob_btts,
    }
    const oddsMap: Record<string, number | null> = snap ? {
      home: snap.odds_home, away: snap.odds_away,
      draw: snap.odds_draw, over25: snap.odds_over25,
    } : {}
    const modelProb = probMap[r.market]
    const odds = oddsMap[r.market] || r.odds
    if (!modelProb || !odds || odds <= 1) return { ev: r.ev, edge: r.edge, odds: r.odds, modelProb: null, marketImpliedProb: null }

    // Mezcla modelo-mercado: reduce falsos positivos donde el modelo diverge mucho
    // del mercado por datos escasos/ruidosos, en vez de por una ventaja real.
    const leagueId = leagueIdByMatch[r.match_id]
    const modelWeight = MAJOR_LEAGUES.has(leagueId) ? MODEL_WEIGHT_MAJOR : MODEL_WEIGHT_MINOR
    const marketImpliedProb = 1 / odds
    const prob = modelWeight * modelProb + (1 - modelWeight) * marketImpliedProb

    return { ev: prob * odds - 1, edge: prob - marketImpliedProb, odds, modelProb, marketImpliedProb }
  }

  // Deduplicar, recalcular y filtrar EVs negativos y sin odds reales
  const seen = new Set<string>()
  const unique = staging
    .map(r => ({ ...r, ...recalcEV(r) }))
    .filter(r => {
      // Solo partidos de hoy
      if (!todayMatchIds.has(r.match_id)) return false
      const snap = snapMap[r.match_id]
      // Requiere odds reales del mercado para ser value bet válida
      if (!snap || (!snap.odds_home && !snap.odds_over25)) return false
      // Además de EV/edge mínimos, exigimos confianza mínima (rating 6+/10).
      // Un EV altísimo con datos poco confiables (rating bajo) es más probable que
      // sea ruido que una oportunidad real — no vale la pena mostrarlo como destacado.
      return r.ev > 0.08 && r.edge > 0.08 && (r.confidence_score ?? 0) >= 50
    })
    .filter(r => {
      const key = `${r.match_id}_${r.market}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.ev * b.confidence_score - a.ev * a.confidence_score)

  // Una sola value bet por partido (la de mejor calidad) — evita que un mismo
  // partido con valor en varios mercados infle el conteo y se sienta repetido.
  const seenMatch = new Set<string>()
  const onePerMatch = unique.filter(r => {
    if (seenMatch.has(r.match_id)) return false
    seenMatch.add(r.match_id)
    return true
  })

  // Primero se eligen cinco candidatos puramente estadísticos. Solo ellos
  // consumen la capa automática API-Football + web/IA; nunca se escanea un
  // listado entero por detrás ni se cobra una consulta por abrir una tarjeta.
  const candidates = onePerMatch.slice(0, MAX_AUTOMATIC_CONTEXTS)

  const assessCandidate = async (candidate: any) => {
    const match = matchDataById[candidate.match_id]
    if (!match?.external_id) return { candidate, intelligence: null }

    try {
      const readProvider = async <T,>(request: Promise<T>) => {
        try {
          return { value: await request, available: true }
        } catch {
          return { value: [] as unknown as T, available: false }
        }
      }
      const [injuriesResult, lineupsResult, homeFormResult, awayFormResult] = await Promise.all([
        readProvider(apf<any[]>('/injuries', { fixture: match.external_id })),
        readProvider(apf<any[]>('/fixtures/lineups', { fixture: match.external_id })),
        readProvider(apf<any[]>('/fixtures', { team: match.home_team_id, league: match.league_id, season: match.season, last: 5 })),
        readProvider(apf<any[]>('/fixtures', { team: match.away_team_id, league: match.league_id, season: match.season, last: 5 })),
      ])
      const injuries = injuriesResult.value
      const lineups = lineupsResult.value
      const homeForm = homeFormResult.value
      const awayForm = awayFormResult.value

      const providerData = {
        retrieved_at: new Date().toISOString(),
        api_football: {
          injuries_available: injuriesResult.available,
          lineups_available: lineupsResult.available,
          home_form_available: homeFormResult.available,
          away_form_available: awayFormResult.available,
        },
        home: {
          team: match.home_team_name,
          absences: listedAbsences(injuries, match.home_team_id),
          lineup: listedLineup(lineups, match.home_team_id),
          form_last_5: summarizeForm(homeForm, match.home_team_id),
        },
        away: {
          team: match.away_team_name,
          absences: listedAbsences(injuries, match.away_team_id),
          lineup: listedLineup(lineups, match.away_team_id),
          form_last_5: summarizeForm(awayForm, match.away_team_id),
        },
      }
      // No se incluye retrieved_at: un mismo dato confirmado debe reutilizar la
      // investigación web ya guardada en vez de repetirla cada cuatro horas.
      const providerFingerprint = JSON.stringify({ ...providerData, retrieved_at: undefined, model_prob: candidate.modelProb })
      const intelligence = await runSignalCheck({
        matchId: candidate.match_id,
        market: candidate.market,
        modelProb: candidate.modelProb ?? 0,
        homeTeam: match.home_team_name,
        awayTeam: match.away_team_name,
        formHome: providerData.home.form_last_5,
        formAway: providerData.away.form_last_5,
        goalsForHome: null,
        goalsAgainstHome: null,
        goalsForAway: null,
        goalsAgainstAway: null,
        injuriesHome: providerData.home.absences.map((item) => `${item.name} (${item.reason})`).join(', '),
        injuriesAway: providerData.away.absences.map((item) => `${item.name} (${item.reason})`).join(', '),
        h2hSummary: '',
        providerData,
        providerFingerprint,
      })
      return { candidate, intelligence }
    } catch (error) {
      console.error('automatic pick intelligence failed (non-fatal):', error)
      return { candidate, intelligence: null }
    }
  }

  // API-Football limita las ráfagas. Dos partidos a la vez mantienen ocho
  // solicitudes como máximo, en vez de disparar veinte simultáneas.
  const assessed: Array<{ candidate: any; intelligence: Awaited<ReturnType<typeof runSignalCheck>> | null }> = []
  for (let index = 0; index < candidates.length; index += 2) {
    const batch = await Promise.all(candidates.slice(index, index + 2).map(assessCandidate))
    assessed.push(...batch)
  }

  // La IA no sustituye el modelo ni "inventa" una probabilidad nueva. Solo
  // penaliza la puntuación cuando el contexto contradice el pick. Un rechazo
  // fuerte evita publicar una recomendación que el control contextual descartó.
  const selected = assessed
    .filter(({ intelligence }) => !intelligence?.rejected)
    .map(({ candidate, intelligence }) => {
      const penalty = intelligence?.confidencePenalty ?? 0
      const adjustment = intelligence?.adjustment ?? 0
      const contextMultiplier = Math.max(0.55, 1 - penalty / 100 + adjustment / 100)
      return {
        ...candidate,
        confidence_score: Math.max(0, Math.round((candidate.confidence_score ?? 0) * contextMultiplier)),
        rank_score: (candidate.rank_score ?? 0) * contextMultiplier,
      }
    })
    .sort((a, b) => b.rank_score - a.rank_score)

  // Limpiar daily_rankings de hoy y reescribir
  await supabase.from('daily_rankings').delete().eq('date', today)

  for (let i = 0; i < selected.length; i++) {
    const r = selected[i]
    await supabase.from('daily_rankings').insert({
      date:             today,
      rank:             i + 1,
      match_id:         r.match_id,
      market:           r.market,
      market_label:     r.market_label,
      odds:             r.odds,
      ev:               r.ev,
      edge:             r.edge,
      confidence_score: r.confidence_score,
      rank_score:       r.rank_score,
      is_pro_only:      i >= 3,
      model_prob_raw:      r.modelProb,
      market_implied_prob: r.marketImpliedProb,
    })
  }

  // CLV tracking (solo ligas grandes con Odds API): guardar la cuota de
  // "apertura" la primera vez que una value bet aparece — ignoreDuplicates
  // evita pisarla en corridas posteriores del mismo día (consolidate corre
  // 4x/día y reescribe daily_rankings completo, pero la apertura debe quedar
  // fija en el primer momento en que se publicó).
  const clvCandidates = selected
    .filter(r => MAJOR_LEAGUES.has(matchDataById[r.match_id]?.league_id))
    .map(r => ({
      match_id: r.match_id,
      market: r.market,
      league_id: matchDataById[r.match_id]?.league_id,
      kickoff_at: matchDataById[r.match_id]?.kickoff_at,
      opening_odds: r.odds,
    }))
    .filter(c => c.kickoff_at && c.opening_odds)

  if (clvCandidates.length) {
    await supabase.from('clv_tracking').upsert(clvCandidates, { onConflict: 'match_id,market', ignoreDuplicates: true })
  }

  return NextResponse.json({ success: true, top5: selected.length, rankings: selected.map((r, i) => ({
    rank: i + 1,
    match_id: r.match_id,
    market: r.market,
    rank_score: r.rank_score,
  }))})
}
