import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runSignalCheck } from '@/lib/ai/signalCheck'
import { apf } from '@/lib/api/football'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

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

  const top30 = onePerMatch.slice(0, 30)

  // Limpiar daily_rankings de hoy y reescribir
  await supabase.from('daily_rankings').delete().eq('date', today)

  for (let i = 0; i < top30.length; i++) {
    const r = top30[i]
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
      is_pro_only:      i >= 10,
      model_prob_raw:      r.modelProb,
      market_implied_prob: r.marketImpliedProb,
    })
  }

  // CLV tracking (solo ligas grandes con Odds API): guardar la cuota de
  // "apertura" la primera vez que una value bet aparece — ignoreDuplicates
  // evita pisarla en corridas posteriores del mismo día (consolidate corre
  // 4x/día y reescribe daily_rankings completo, pero la apertura debe quedar
  // fija en el primer momento en que se publicó).
  const clvCandidates = top30
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

  // AI signal check — modo observar: corre en paralelo con limite de concurrencia,
  // nunca bloquea ni afecta el resultado del consolidate si falla.
  const AI_CONCURRENCY = 3
  for (let i = 0; i < top30.length; i += AI_CONCURRENCY) {
    const batch = top30.slice(i, i + AI_CONCURRENCY)
    await Promise.allSettled(batch.map(async (r: any) => {
      try {
        const m = matchDataById[r.match_id]
        if (!m || !m.external_id) return

        const [injuriesRes, formHomeRes, formAwayRes] = await Promise.all([
          apf<any[]>('/injuries', { fixture: m.external_id }).catch(() => []),
          apf<any[]>('/fixtures', { team: m.home_team_id, league: m.league_id, season: m.season, last: 5 }).catch(() => []),
          apf<any[]>('/fixtures', { team: m.away_team_id, league: m.league_id, season: m.season, last: 5 }).catch(() => []),
        ])

        const summarizeForm = (fixtures: any[], teamId: number) => {
          return (fixtures || []).map((f: any) => {
            const isHome = f.teams?.home?.id === teamId
            const won = isHome ? f.teams?.home?.winner : f.teams?.away?.winner
            if (won === true) return 'V'
            if (won === false) return 'D'
            return 'E'
          }).join('')
        }

        const injuriesText = (list: any[]) =>
          (list || []).slice(0, 5).map((inj: any) => `${inj.player?.name ?? '?'} (${inj.player?.reason ?? 'baja'})`).join(', ')

        const homeInjuries = (injuriesRes || []).filter((inj: any) => inj.team?.id === m.home_team_id)
        const awayInjuries = (injuriesRes || []).filter((inj: any) => inj.team?.id === m.away_team_id)

        await runSignalCheck({
          matchId: r.match_id,
          market: r.market,
          modelProb: r.modelProb,
          homeTeam: m.home_team_name,
          awayTeam: m.away_team_name,
          formHome: summarizeForm(formHomeRes, m.home_team_id),
          formAway: summarizeForm(formAwayRes, m.away_team_id),
          goalsForHome: null,
          goalsAgainstHome: null,
          goalsForAway: null,
          goalsAgainstAway: null,
          injuriesHome: injuriesText(homeInjuries),
          injuriesAway: injuriesText(awayInjuries),
          h2hSummary: '',
        })
      } catch (e) {
        console.error('signal check batch item failed (non-fatal):', e)
      }
    }))
  }

  return NextResponse.json({ success: true, top5: top30.length, rankings: top30.map((r, i) => ({
    rank: i + 1,
    match_id: r.match_id,
    market: r.market,
    rank_score: r.rank_score,
  }))})
}
