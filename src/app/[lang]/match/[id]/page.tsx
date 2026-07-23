"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import AnimatedBackground from "@/components/AnimatedBackground"
import { createClient } from "@/lib/supabase/client"

const G = '#00c878'
const BG = '#070d1a'
const CARD = '#0d1e35'
const BORDER = '#1a2e4a'

const pColor = (p: number) => p >= 0.70 ? '#00c878' : p >= 0.55 ? '#ffb400' : p >= 0.40 ? '#6b7fa3' : '#3a4a5a'

export default function MatchPage() {
  const { id, lang } = useParams() as { id: string; lang: string }
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'analysis'|'compare'|'h2h'|'injuries'|'standings'|'form'|'lineups'|'stats'|'ai'>('analysis')
  const [userPlan, setUserPlan] = useState<string>('free')
  const isElite = userPlan === 'elite'
  const isPro = userPlan === 'pro' || userPlan === 'elite'
  const [aiContent, setAiContent] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiNeedsPayment, setAiNeedsPayment] = useState(false)
  const t: Record<string, any> = lang === 'en' ? {
    loading: 'Loading full analysis...', notFound: 'Match not found',
    home: 'Home', away: 'Away', expectedGoals: 'Expected Goals (λ)',
    modelProbs: 'Model Probabilities', over15: 'Over 1.5 Goals', over25: 'Over 2.5 Goals',
    homeWin: 'Home Win', draw: 'Draw', awayWin: 'Away Win',
    stats: '📊 Stats', form: '📈 Form', analysis: '🔍 Analysis',
    compare: '⚖️ Compare', h2h: '🔁 H2H', injuries: '🏥 Injuries',
    standings: '🏆 Standings', lineups: '👥 Lineups',
    goalsScored: 'Goals scored/match', goalsConceded: 'Goals conceded/match',
    matchesScoring: 'Matches scoring', cleanSheets: 'Clean sheets',
    balanced: 'Balanced match — draw is a viable option',
    valueDetected: 'Value detected',
    verdict: 'Model Verdict',
    bttsAvg: (pct: number) => `Both teams average ${pct}% BTTS — goals ${pct >= 60 ? 'very likely' : 'possible'}`,
    favHome: (name: string, pct: number) => `Clear favorite: ${name} (${pct}% win)`,
    favAway: (name: string, pct: number) => `Clear favorite: ${name} (${pct}% win)`,
    highGoals: (l: number) => `High goal output expected (λ total: ${l})`,
    bestAttack: (name: string) => `Best attack: ${name}`,
    bestDefense: (name: string) => `Best defense: ${name}`,
    unbeaten: (name: string, n: number) => `${name} on a ${n}-match unbeaten run`,
    unbeatenStreak: (n: number) => `${n} unbeaten`,
    bttsLabel: 'Both Score (BTTS)',
    unbeatenRow: 'Unbeaten streak',
    bttsRow: 'BTTS % (last 10)',
    wins: 'Wins (last 10)', ov25row: 'Over 2.5 % (last 10)', probWin: 'Win Probability',
    possession: 'Possession', shotsOn: 'Shots on target', shotsTotal: 'Total shots',
    corners: 'Corners', fouls: 'Fouls', yellowCards: 'Yellow cards', redCards: 'Red cards',
    xg: 'xG', passes: 'Passes', passAcc: 'Pass accuracy',
    noStats: 'No stats available for this match', noLineups: 'Lineups not available yet',
    noInjuries: 'No injuries reported', noH2H: 'No H2H data available',
    noForm: 'No form data available', noStandings: 'Standings not available',
    proOnly: 'Pro plan required', upgradeMsg: 'Upgrade to Pro to unlock this section',
    upgrade: 'Upgrade to Pro',
    additionalMarkets: 'Additional Markets',
    cornersPotential: 'Corner Potential',
    firstHalf: 'First Half',
    doubleChance: 'Double Chance',
    likelyScorecards: 'Most Likely Scorelines',
    seasonStats: 'Season',
    avgGoalsScored: 'Avg goals scored',
    avgGoalsConceded: 'Avg goals conceded',
    failedToScore: 'Failed to score',
    recentForm: 'Recent form',
  } : {
    loading: 'Cargando análisis completo...', notFound: 'Partido no encontrado',
    home: 'Local', away: 'Visitante', expectedGoals: 'Goles Esperados (λ)',
    modelProbs: 'Probabilidades del Modelo', over15: 'Over 1.5 Goles', over25: 'Over 2.5 Goles',
    homeWin: 'Victoria Local', draw: 'Empate', awayWin: 'Victoria Visita',
    stats: '📊 Estadísticas', form: '📈 Forma', analysis: '🔍 Análisis',
    compare: '⚖️ Comparar', h2h: '🔁 H2H', injuries: '🏥 Bajas',
    standings: '🏆 Clasificación', lineups: '👥 Alineaciones',
    goalsScored: 'Goles marcados/partido', goalsConceded: 'Goles recibidos/partido',
    matchesScoring: 'Partidos marcando', cleanSheets: 'Porterías a cero',
    balanced: 'Partido equilibrado — empate es opción viable',
    valueDetected: 'Valor detectado',
    verdict: 'Veredicto del Modelo',
    bttsAvg: (pct: number) => `Ambos equipos promedian ${pct}% BTTS — partido con goles ${pct >= 60 ? 'muy probable' : 'posible'}`,
    favHome: (name: string, pct: number) => `Favorito claro: ${name} (${pct}% victoria)`,
    favAway: (name: string, pct: number) => `Favorito claro: ${name} (${pct}% victoria)`,
    highGoals: (l: number) => `Alta producción de goles esperada (λ total: ${l})`,
    bestAttack: (name: string) => `Mejor ataque: ${name}`,
    bestDefense: (name: string) => `Mejor defensa: ${name}`,
    unbeaten: (name: string, n: number) => `${name} lleva ${n} partidos sin perder`,
    unbeatenStreak: (n: number) => `${n} sin perder`,
    bttsLabel: 'Ambos Anotan (BTTS)',
    unbeatenRow: 'Racha sin perder',
    bttsRow: 'BTTS % (últ 10)',
    wins: 'Victorias (últ 10)', ov25row: 'Over 2.5 % (últ 10)', probWin: 'Prob. Victoria',
    possession: 'Posesión', shotsOn: 'Tiros a puerta', shotsTotal: 'Tiros totales',
    corners: 'Córners', fouls: 'Faltas', yellowCards: 'Tarjetas amarillas', redCards: 'Tarjetas rojas',
    xg: 'xG', passes: 'Pases', passAcc: 'Precisión de pases',
    noStats: 'Sin estadísticas para este partido', noLineups: 'Alineaciones no disponibles aún',
    noInjuries: 'Sin bajas reportadas', noH2H: 'Sin datos H2H disponibles',
    noForm: 'Sin datos de forma', noStandings: 'Clasificación no disponible',
    proOnly: 'Plan Pro requerido', upgradeMsg: 'Actualiza a Pro para desbloquear esta sección',
    upgrade: 'Actualizar a Pro',
    additionalMarkets: '{t.additionalMarkets}',
    cornersPotential: '{t.cornersPotential}',
    firstHalf: 'Primer Tiempo',
    doubleChance: 'Doble Oportunidad',
    likelyScorecards: 'Marcadores Más Probables',
    seasonStats: 'Temporada',
    avgGoalsScored: 'Media goles marcados',
    avgGoalsConceded: 'Media goles recibidos',
    failedToScore: 'Sin marcar',
    recentForm: 'Forma reciente',
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.from('users').select('plan').single().then(({ data }) => {
      if (data?.plan) setUserPlan(data.plan)
    })
  }, [])

  useEffect(() => {
    fetch(`/api/match/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error === 'Unauthorized') {
          router.push(`/${lang}/auth/login`)
          return
        }
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const startAiCheckout = async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch(`/api/match/${id}/ai-analysis/checkout`, { method: 'POST' })
      const d = await res.json()
      if (d.alreadyPaid) {
        loadAiAnalysis()
        return
      }
      if (d.url) {
        window.location.href = d.url
      } else {
        setAiError(d.error ?? 'Error iniciando el pago')
        setAiLoading(false)
      }
    } catch (e: any) {
      setAiError(e.message)
      setAiLoading(false)
    }
  }

  const loadAiAnalysis = async () => {
    setAiLoading(true)
    setAiError(null)
    setAiNeedsPayment(false)
    try {
      const res = await fetch(`/api/match/${id}/ai-analysis`)
      if (res.status === 402) {
        setAiNeedsPayment(true)
        setAiLoading(false)
        return
      }
      const d = await res.json()
      if (d.error) {
        setAiError(d.error)
      } else {
        setAiContent(d.content)
      }
    } catch (e: any) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'ai' && !aiContent && !aiLoading) {
      loadAiAnalysis()
    }
  }, [tab])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div>
        <div style={{ color: G, fontSize: 13 }}>{t.loading}</div>
      </div>
    </div>
  )

  if (!data?.match) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#ff4d4d' }}>{t.notFound}</div>
    </div>
  )

  const { match, h2h, standings, injuries, homeForm, awayForm, scorePredictions, lineups, matchStats, seasonStats, fsData } = data
  const pred = match.model_predictions?.[0]
  const kickoff = new Date(match.kickoff_at)

  const lT = (pred?.expected_goals_home ?? 0) + (pred?.expected_goals_away ?? 0)
  const prob_over15 = pred ? 1 - Math.exp(-lT) * (1 + lT) : null

  const proTabs = ['h2h', 'injuries', 'form', 'compare', 'stats']
  const tabs = [
    { id: 'analysis', label: t.analysis },
    { id: 'compare',  label: t.compare },
    { id: 'h2h',      label: t.h2h },
    { id: 'injuries', label: t.injuries },
    { id: 'lineups',  label: t.lineups },
    ...(isElite ? [{ id: 'stats', label: t.stats }] : []),
    { id: 'standings',label: t.standings },
    { id: 'form',     label: t.form },
    { id: 'ai',       label: lang === 'en' ? '🤖 AI Analysis' : '🤖 Análisis IA' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: BG, color: 'white', fontFamily: "'DM Mono', monospace", position: 'relative' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ background: 'rgba(10,22,40,0.95)', borderBottom: `1px solid ${BORDER}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16, backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: G, cursor: 'pointer', fontSize: 18, padding: '4px 8px' }}>←</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#4a6785' }}>{match.league_name}</span>
            <span style={{ color: BORDER }}>·</span>
            <span style={{ fontSize: 11, color: '#4a6785' }}>{kickoff.toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
            <span style={{ color: BORDER }}>·</span>
            <span style={{ fontSize: 11, color: G }}>{kickoff.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {pred && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
              {prob_over15 !== null && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: pColor(prob_over15) }}>{Math.round(prob_over15 * 100)}%</div>
                  <div style={{ fontSize: 9, color: '#4a6785' }}>Ov1.5</div>
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: pColor(pred.prob_over25) }}>{Math.round(pred.prob_over25 * 100)}%</div>
                <div style={{ fontSize: 9, color: '#4a6785' }}>Ov2.5</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: pColor(pred.prob_btts) }}>{Math.round(pred.prob_btts * 100)}%</div>
                <div style={{ fontSize: 9, color: '#4a6785' }}>BTTS</div>
              </div>
            </div>
          )}
        </div>

        {/* Hero */}
        <div style={{ padding: '28px 24px 20px', textAlign: 'center', borderBottom: `1px solid ${BORDER}`, background: 'rgba(13,30,53,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, maxWidth: 600, margin: '0 auto' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <img src={match.home_team_logo} alt="" width={56} height={56} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{match.home_team_name}</div>
              <div style={{ fontSize: 10, color: '#4a6785', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{t.home}</div>
              {pred && <div style={{ fontSize: 24, fontWeight: 700, color: pColor(pred.prob_home_win), marginTop: 8 }}>{Math.round(pred.prob_home_win * 100)}%</div>}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#4a6785', marginBottom: 6 }}>VS</div>
              {pred && (
                <div style={{ fontSize: 18, fontWeight: 700, color: '#6b7fa3' }}>{Math.round(pred.prob_draw * 100)}%</div>
              )}
              <div style={{ fontSize: 9, color: '#4a6785', marginTop: 4 }}>EMPATE</div>
              {pred && (
                <div style={{ marginTop: 10, fontSize: 11, color: '#4a6785' }}>
                  λ {pred.expected_goals_home?.toFixed(2)} — {pred.expected_goals_away?.toFixed(2)}
                </div>
              )}
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <img src={match.away_team_logo} alt="" width={56} height={56} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{match.away_team_name}</div>
              <div style={{ fontSize: 10, color: '#4a6785', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{t.away}</div>
              {pred && <div style={{ fontSize: 24, fontWeight: 700, color: pColor(pred.prob_away_win), marginTop: 8 }}>{Math.round(pred.prob_away_win * 100)}%</div>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, padding: '0 24px', background: 'rgba(10,22,40,0.8)', overflowX: 'auto' }}>
          {tabs.map(t => {
            const locked = proTabs.includes(t.id) && !isPro
            return (
              <button key={t.id} onClick={() => {
                if (locked) { router.push(`/${lang}/pricing?reason=pro`); return }
                setTab(t.id as any)
              }}
                style={{ background: 'none', border: 'none', color: tab === t.id ? G : locked ? '#2a3a4a' : '#4a6785', cursor: locked ? 'not-allowed' : 'pointer', padding: '12px 16px', fontSize: 12, borderBottom: tab === t.id ? `2px solid ${G}` : '2px solid transparent', whiteSpace: 'nowrap' }}>
                {locked ? '🔒 ' : ''}{t.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>

          {/* ── ANÁLISIS ── */}
          {tab === 'analysis' && pred && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Goles esperados */}
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 11, color: '#4a6785', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>{t.expectedGoals}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 32, fontWeight: 700, color: G }}>{pred.expected_goals_home}</span>
                    <span style={{ fontSize: 12, color: '#4a6785', marginLeft: 8 }}>{match.home_team_name}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: '#4a6785', marginRight: 8 }}>{match.away_team_name}</span>
                    <span style={{ fontSize: 32, fontWeight: 700, color: G }}>{pred.expected_goals_away}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 12, height: 6, borderRadius: 3, overflow: 'hidden', background: '#0a1628' }}>
                  <div style={{ flex: pred.expected_goals_home, background: G, opacity: 0.7 }} />
                  <div style={{ flex: pred.expected_goals_away, background: '#4a6785' }} />
                </div>
              </div>

              {/* Probabilidades */}
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 11, color: '#4a6785', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>{t.modelProbs}</div>
                {[
                  { label: t.over15, prob: prob_over15 ?? 0 },
                  { label: t.over25, prob: pred.prob_over25 },
                  { label: t.bttsLabel, prob: pred.prob_btts },
                  { label: t.homeWin, prob: pred.prob_home_win },
                  { label: t.draw, prob: pred.prob_draw },
                  { label: t.awayWin, prob: pred.prob_away_win },
                ].map(p => (
                  <div key={p.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12 }}>{p.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: pColor(p.prob) }}>{(p.prob * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ background: '#0a1628', borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${p.prob * 100}%`, background: pColor(p.prob), height: 6, borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* FootyStats Markets */}
              {fsData && (
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 11, color: '#4a6785', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>{t.additionalMarkets}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Corners */}
                    {fsData.corners_potential != null && (
                      <div>
                        <div style={{ fontSize: 11, color: '#ff9944', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>🏁 {t.corners}</div>
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 12 }}>{t.cornersPotential}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: fsData.corners_potential >= 70 ? '#00c878' : fsData.corners_potential >= 50 ? '#ffb400' : '#6b7fa3' }}>{fsData.corners_potential}%</span>
                          </div>
                          <div style={{ background: '#0a1628', borderRadius: 4, height: 6 }}>
                            <div style={{ width: `${Math.min(fsData.corners_potential, 100)}%`, background: '#ff9944', height: 6, borderRadius: 4, transition: 'width 0.5s' }} />
                          </div>
                        </div>
                        {(fsData.odds_corners_over_85 || fsData.odds_corners_over_95 || fsData.odds_corners_over_105) && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {fsData.odds_corners_over_85 && <span style={{ fontSize: 12, background: 'rgba(255,153,68,0.1)', border: '1px solid rgba(255,153,68,0.3)', color: '#ff9944', borderRadius: 6, padding: '4px 10px' }}>Over 8.5 · <b>{fsData.odds_corners_over_85}</b></span>}
                            {fsData.odds_corners_over_95 && <span style={{ fontSize: 12, background: 'rgba(255,153,68,0.1)', border: '1px solid rgba(255,153,68,0.3)', color: '#ff9944', borderRadius: 6, padding: '4px 10px' }}>Over 9.5 · <b>{fsData.odds_corners_over_95}</b></span>}
                            {fsData.odds_corners_over_105 && <span style={{ fontSize: 12, background: 'rgba(255,153,68,0.1)', border: '1px solid rgba(255,153,68,0.3)', color: '#ff9944', borderRadius: 6, padding: '4px 10px' }}>Over 10.5 · <b>{fsData.odds_corners_over_105}</b></span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Primer Tiempo */}
                    {fsData.o15HT_potential != null && (
                      <div>
                        <div style={{ fontSize: 11, color: '#00bcd4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>⏱ {t.firstHalf}</div>
                        {[
                          { label: 'Over 0.5 HT', val: fsData.o05HT_potential },
                          { label: 'Over 1.5 HT', val: fsData.o15HT_potential },
                        ].filter(x => x.val != null).map(x => (
                          <div key={x.label} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontSize: 12 }}>{x.label}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: x.val >= 60 ? '#00c878' : x.val >= 45 ? '#ffb400' : '#6b7fa3' }}>{x.val}%</span>
                            </div>
                            <div style={{ background: '#0a1628', borderRadius: 4, height: 6 }}>
                              <div style={{ width: `${Math.min(x.val, 100)}%`, background: '#00bcd4', height: 6, borderRadius: 4, transition: 'width 0.5s' }} />
                            </div>
                          </div>
                        ))}
                        {(fsData.odds_1st_half_over05 || fsData.odds_1st_half_over15 || fsData.odds_1st_half_over25) && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {fsData.odds_1st_half_over05 && <span style={{ fontSize: 12, background: 'rgba(0,188,212,0.1)', border: '1px solid rgba(0,188,212,0.3)', color: '#00bcd4', borderRadius: 6, padding: '4px 10px' }}>O0.5 HT · <b>{fsData.odds_1st_half_over05}</b></span>}
                            {fsData.odds_1st_half_over15 && <span style={{ fontSize: 12, background: 'rgba(0,188,212,0.1)', border: '1px solid rgba(0,188,212,0.3)', color: '#00bcd4', borderRadius: 6, padding: '4px 10px' }}>O1.5 HT · <b>{fsData.odds_1st_half_over15}</b></span>}
                            {fsData.odds_1st_half_over25 && <span style={{ fontSize: 12, background: 'rgba(0,188,212,0.1)', border: '1px solid rgba(0,188,212,0.3)', color: '#00bcd4', borderRadius: 6, padding: '4px 10px' }}>O2.5 HT · <b>{fsData.odds_1st_half_over25}</b></span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Doble Oportunidad */}
                    {(fsData.odds_doublechance_1x || fsData.odds_doublechance_x2 || fsData.odds_doublechance_12) && (
                      <div>
                        <div style={{ fontSize: 11, color: '#ce93d8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>🎯 {t.doubleChance}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {fsData.odds_doublechance_1x && <span style={{ fontSize: 13, background: 'rgba(206,147,216,0.1)', border: '1px solid rgba(206,147,216,0.3)', color: '#ce93d8', borderRadius: 6, padding: '6px 14px' }}>1X · <b style={{fontSize:15}}>{fsData.odds_doublechance_1x}</b></span>}
                          {fsData.odds_doublechance_x2 && <span style={{ fontSize: 13, background: 'rgba(206,147,216,0.1)', border: '1px solid rgba(206,147,216,0.3)', color: '#ce93d8', borderRadius: 6, padding: '6px 14px' }}>X2 · <b style={{fontSize:15}}>{fsData.odds_doublechance_x2}</b></span>}
                          {fsData.odds_doublechance_12 && <span style={{ fontSize: 13, background: 'rgba(206,147,216,0.1)', border: '1px solid rgba(206,147,216,0.3)', color: '#ce93d8', borderRadius: 6, padding: '6px 14px' }}>12 · <b style={{fontSize:15}}>{fsData.odds_doublechance_12}</b></span>}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}


              {/* Marcadores más probables */}
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 11, color: '#4a6785', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>{t.likelyScorecards}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {scorePredictions?.slice(0, 6).map((s: any, i: number) => (
                    <div key={i} style={{ background: '#0a1829', border: `1px solid ${i === 0 ? G : BORDER}`, borderRadius: 8, padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: i === 0 ? G : 'white' }}>{s.home} - {s.away}</div>
                      <div style={{ fontSize: 11, color: '#4a6785', marginTop: 4 }}>{(s.prob * 100).toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── COMPARADOR ── */}
          {tab === 'compare' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Team headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr', alignItems: 'center', textAlign: 'center', padding: '16px 0' }}>
                <div>
                  <img src={match.home_team_logo} alt="" width={48} height={48} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#00bfff', marginTop: 8 }}>{match.home_team_name}</div>
                  <div style={{ fontSize: 10, color: '#4a6785', marginTop: 2 }}>LOCAL</div>
                </div>
                <div style={{ fontSize: 11, color: '#4a6785' }}>vs</div>
                <div>
                  <img src={match.away_team_logo} alt="" width={48} height={48} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#ffd700', marginTop: 8 }}>{match.away_team_name}</div>
                  <div style={{ fontSize: 10, color: '#4a6785', marginTop: 2 }}>VISITANTE</div>
                </div>
              </div>

              {/* Stats rows */}
              {pred && (() => {
                const hf = homeForm?.results ?? []
                const af = awayForm?.results ?? []
                const hWins = hf.filter((r: any) => r.result === 'W').length
                const aWins = af.filter((r: any) => r.result === 'W').length
                const hGoals = hf.reduce((s: number, r: any) => s + (r.scored ?? 0), 0)
                const aGoals = af.reduce((s: number, r: any) => s + (r.scored ?? 0), 0)
                const hCon = hf.reduce((s: number, r: any) => s + (r.conceded ?? 0), 0)
                const aCon = af.reduce((s: number, r: any) => s + (r.conceded ?? 0), 0)
                const hBtts = hf.filter((r: any) => r.scored > 0 && r.conceded > 0).length
                const aBtts = af.filter((r: any) => r.scored > 0 && r.conceded > 0).length
                const hOv25 = hf.filter((r: any) => (r.scored + r.conceded) > 2).length
                const aOv25 = af.filter((r: any) => (r.scored + r.conceded) > 2).length

                const rows = [
                  { label: 'PPG (últ 10)', h: hf.length ? ((hWins * 3 + hf.filter((r: any) => r.result === 'D').length) / hf.length).toFixed(2) : '-', a: af.length ? ((aWins * 3 + af.filter((r: any) => r.result === 'D').length) / af.length).toFixed(2) : '-', higherBetter: true },
                  { label: t.wins, h: hWins, a: aWins, higherBetter: true },
                  { label: t.goalsScored, h: hf.length ? (hGoals / hf.length).toFixed(2) : '-', a: af.length ? (aGoals / af.length).toFixed(2) : '-', higherBetter: true },
                  { label: t.goalsConceded, h: hf.length ? (hCon / hf.length).toFixed(2) : '-', a: af.length ? (aCon / af.length).toFixed(2) : '-', higherBetter: false },
                  { label: 'xG a favor (λ)', h: pred.expected_goals_home, a: pred.expected_goals_away, higherBetter: true },
                  { label: 'xG en contra', h: pred.expected_goals_away, a: pred.expected_goals_home, higherBetter: false },
                  { label: t.bttsRow, h: hf.length ? Math.round(hBtts / hf.length * 100) + '%' : '-', a: af.length ? Math.round(aBtts / af.length * 100) + '%' : '-', higherBetter: true },
                  { label: t.ov25row, h: hf.length ? Math.round(hOv25 / hf.length * 100) + '%' : '-', a: af.length ? Math.round(aOv25 / af.length * 100) + '%' : '-', higherBetter: true },
                  { label: t.probWin, h: (pred.prob_home_win * 100).toFixed(1) + '%', a: (pred.prob_away_win * 100).toFixed(1) + '%', higherBetter: true },
                  { label: lang === 'en' ? '% Wins (last 10)' : '% Victorias (últ 10)', h: hf.length ? Math.round(hWins / hf.length * 100) + '%' : '-', a: af.length ? Math.round(aWins / af.length * 100) + '%' : '-', higherBetter: true },
                  { label: t.unbeatenRow, h: homeForm?.unbeaten ?? 0, a: awayForm?.unbeaten ?? 0, higherBetter: true },
                  { label: t.matchesScoring, h: homeForm?.scoring ?? 0, a: awayForm?.scoring ?? 0, higherBetter: true },
                ]

                return rows.map(row => {
                  const hv = parseFloat(String(row.h))
                  const av = parseFloat(String(row.a))
                  const hBetter = !isNaN(hv) && !isNaN(av) && (row.higherBetter ? hv > av : hv < av)
                  const aBetter = !isNaN(hv) && !isNaN(av) && (row.higherBetter ? av > hv : av < hv)
                  return (
                    <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr', alignItems: 'center', padding: '10px 16px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: hBetter ? '#00bfff' : aBetter ? '#4a6785' : 'white' }}>{row.h}</span>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 10, color: '#4a6785', padding: '0 8px' }}>{row.label}</div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: aBetter ? '#ffd700' : hBetter ? '#4a6785' : 'white' }}>{row.a}</span>
                      </div>
                    </div>
                  )
                })
              })()}

              {/* Veredicto */}
              {pred && (
                <div style={{ background: '#0a1e10', border: `1px solid #00c87830`, borderRadius: 12, padding: 16, marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: '#4a6785', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{t.verdict}</div>
                  {(() => {
                    const insights = []
                    const lT = pred.expected_goals_home + pred.expected_goals_away
                    const hf = homeForm?.results ?? []
                    const af = awayForm?.results ?? []
                    const hBtts = hf.filter((r: any) => r.scored > 0 && r.conceded > 0).length
                    const aBtts = af.filter((r: any) => r.scored > 0 && r.conceded > 0).length
                    const avgBtts = hf.length && af.length ? Math.round(((hBtts / hf.length) + (aBtts / af.length)) / 2 * 100) : null

                    if (avgBtts) insights.push(t.bttsAvg(avgBtts))
                    if (pred.prob_home_win > 0.55) insights.push(t.favHome(match.home_team_name, Math.round(pred.prob_home_win * 100)))
                    else if (pred.prob_away_win > 0.55) insights.push(t.favAway(match.away_team_name, Math.round(pred.prob_away_win * 100)))
                    else insights.push(t.balanced)
                    if (lT > 3.0) insights.push(t.highGoals(lT.toFixed(2)))
                    if (pred.expected_goals_home > pred.expected_goals_away) insights.push(t.bestAttack(match.home_team_name))
                    else insights.push(t.bestAttack(match.away_team_name))
                    const hCon = hf.reduce((s: number, r: any) => s + (r.conceded ?? 0), 0)
                    const aCon = af.reduce((s: number, r: any) => s + (r.conceded ?? 0), 0)
                    if (hf.length && af.length) {
                      const hDefense = hCon / hf.length
                      const aDefense = aCon / af.length
                      insights.push(t.bestDefense(hDefense < aDefense ? match.home_team_name : match.away_team_name))
                    }
                    if (homeForm?.unbeaten >= 3) insights.push(t.unbeaten(match.home_team_name, homeForm.unbeaten))
                    if (awayForm?.unbeaten >= 3) insights.push(t.unbeaten(match.away_team_name, awayForm.unbeaten))

                    return insights.map((ins, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#a0cfb0', marginBottom: 6, display: 'flex', gap: 8 }}>
                        <span style={{ color: G }}>▶</span> {ins}
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ── H2H ── */}
          {tab === 'h2h' && (
            <div>
              <div style={{ fontSize: 12, color: '#4a6785', marginBottom: 12 }}>Últimos enfrentamientos directos</div>
              {!h2h?.length && <div style={{ color: '#4a6785', textAlign: 'center', padding: 32 }}>{t.noH2H}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {h2h?.map((m: any, i: number) => {
                  const homeWon = m.homeGoals > m.awayGoals
                  const awayWon = m.awayGoals > m.homeGoals
                  return (
                    <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: homeWon ? G : '#6b7fa3', textAlign: 'right' }}>{m.home}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: G, textAlign: 'center', minWidth: 60 }}>{m.homeGoals} - {m.awayGoals}</span>
                      <span style={{ fontSize: 12, color: awayWon ? G : '#6b7fa3' }}>{m.away}</span>
                      <span style={{ fontSize: 10, color: '#4a6785', whiteSpace: 'nowrap' }}>{m.date ? new Date(m.date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES') : ''}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── INJURIES ── */}
          {tab === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Match Stats */}
            <div style={{ gridColumn: '1 / -1', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 11, color: G, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>Estadísticas del Partido</div>
              {matchStats?.available ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: t.possession, home: matchStats.home?.possession, away: matchStats.away?.possession, unit: '' },
                    { label: t.shotsOn, home: matchStats.home?.shotsOn, away: matchStats.away?.shotsOn, unit: '' },
                    { label: t.shotsTotal, home: matchStats.home?.shotsTotal, away: matchStats.away?.shotsTotal, unit: '' },
                    { label: t.corners, home: matchStats.home?.corners, away: matchStats.away?.corners, unit: '' },
                    { label: t.fouls, home: matchStats.home?.fouls, away: matchStats.away?.fouls, unit: '' },
                    { label: t.yellowCards, home: matchStats.home?.yellowCards, away: matchStats.away?.yellowCards, unit: '' },
                    { label: t.redCards, home: matchStats.home?.redCards, away: matchStats.away?.redCards, unit: '' },
                    { label: 'xG', home: matchStats.home?.xg, away: matchStats.away?.xg, unit: '' },
                  ].filter(s => s.home !== null && s.away !== null).map((s, i) => {
                    const hv = parseFloat(String(s.home)) || 0
                    const av = parseFloat(String(s.away)) || 0
                    const total = hv + av || 1
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#00c878' }}>{s.home}{s.unit}</span>
                          <span style={{ fontSize: 11, color: '#4a6785' }}>{s.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#64b5f6' }}>{s.away}{s.unit}</span>
                        </div>
                        <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#0a1628' }}>
                          <div style={{ width: `${(hv/total)*100}%`, background: '#00c878', transition: 'width 0.5s' }} />
                          <div style={{ width: `${(av/total)*100}%`, background: '#64b5f6', transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#4a6785', fontSize: 13, padding: 32 }}>
                  {lang === 'en' ? '⏳ Stats available during and after the match' : '⏳ Estadísticas disponibles durante y después del partido'}
                </div>
              )}
            </div>

            {/* Season Stats Home */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 11, color: '#00c878', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>{match.home_team_name} — {t.seasonStats}</div>
              {seasonStats?.home ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: t.avgGoalsScored, value: seasonStats.home.avgGoalsScored },
                    { label: t.avgGoalsConceded, value: seasonStats.home.avgGoalsConceded },
                    { label: t.cleanSheets, value: seasonStats.home.cleanSheets },
                    { label: t.failedToScore, value: seasonStats.home.failedToScore },
                    { label: t.recentForm, value: seasonStats.home.form?.slice(-5) },
                  ].filter(s => s.value !== null && s.value !== undefined).map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #0a1628' }}>
                      <span style={{ fontSize: 12, color: '#6b7fa3' }}>{s.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color: '#4a6785', fontSize: 12 }}>{lang === 'en' ? 'No data' : 'Sin datos'}</div>}
            </div>

            {/* Season Stats Away */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 11, color: '#64b5f6', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>{match.away_team_name} — {t.seasonStats}</div>
              {seasonStats?.away ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: t.avgGoalsScored, value: seasonStats.away.avgGoalsScored },
                    { label: t.avgGoalsConceded, value: seasonStats.away.avgGoalsConceded },
                    { label: t.cleanSheets, value: seasonStats.away.cleanSheets },
                    { label: t.failedToScore, value: seasonStats.away.failedToScore },
                    { label: t.recentForm, value: seasonStats.away.form?.slice(-5) },
                  ].filter(s => s.value !== null && s.value !== undefined).map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #0a1628' }}>
                      <span style={{ fontSize: 12, color: '#6b7fa3' }}>{s.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color: '#4a6785', fontSize: 12 }}>{lang === 'en' ? 'No data' : 'Sin datos'}</div>}
            </div>
          </div>
        )}

        {tab === 'lineups' && (
            <div>
              {!lineups?.available ? (
                <div style={{ background: '#0d1e35', border: '1px solid #1a2e4a', borderRadius: 12, padding: 32, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                  <div style={{ fontSize: 14, color: '#4a6785' }}>{lang === 'en' ? 'Lineups available ~1h before kickoff' : 'Alineaciones disponibles ~1h antes del partido'}</div>
                  <div style={{ fontSize: 11, color: '#3a5578', marginTop: 8 }}>El entrenador confirma el XI oficial poco antes del kickoff</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[{ side: 'home', lineup: lineups.home, name: match.home_team_name, logo: match.home_team_logo, color: '#00bfff' },
                    { side: 'away', lineup: lineups.away, name: match.away_team_name, logo: match.away_team_logo, color: '#ffd700' }
                  ].map(({ lineup, name, logo, color }) => (
                    <div key={name} style={{ background: '#0d1e35', border: '1px solid #1a2e4a', borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        {logo && <img src={logo} width={20} height={20} alt="" />}
                        <span style={{ fontSize: 14, fontWeight: 700, color }}>{name}</span>
                        {lineup?.formation && <span style={{ fontSize: 11, color: '#4a6785', marginLeft: 'auto' }}>{lineup.formation}</span>}
                      </div>
                      {lineup?.coach && <div style={{ fontSize: 11, color: '#4a6785', marginBottom: 10 }}>🎽 DT: {lineup.coach}</div>}
                      <div style={{ fontSize: 11, color: '#6b7fa3', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>XI Titular</div>
                      {(lineup?.startXI || []).map((p: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #0a1628' }}>
                          <span style={{ fontSize: 11, color: color, width: 20, textAlign: 'center', fontWeight: 700 }}>{p.number}</span>
                          <span style={{ fontSize: 12, flex: 1 }}>{p.name}</span>
                          <span style={{ fontSize: 10, color: '#4a6785', background: '#0a1628', padding: '2px 6px', borderRadius: 4 }}>{p.pos}</span>
                        </div>
                      ))}
                      {lineup?.substitutes?.length > 0 && <>
                        <div style={{ fontSize: 11, color: '#6b7fa3', margin: '10px 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Suplentes</div>
                        {lineup.substitutes.map((p: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid #0a1628' }}>
                            <span style={{ fontSize: 11, color: '#4a6785', width: 20, textAlign: 'center' }}>{p.number}</span>
                            <span style={{ fontSize: 11, color: '#6b7fa3', flex: 1 }}>{p.name}</span>
                            <span style={{ fontSize: 10, color: '#4a6785', background: '#0a1628', padding: '2px 6px', borderRadius: 4 }}>{p.pos}</span>
                          </div>
                        ))}
                      </>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'injuries' && (
            <div>
              {!injuries?.length && <div style={{ color: '#4a6785', textAlign: 'center', padding: 32, background: CARD, borderRadius: 12 }}>{lang === 'en' ? '✅ No confirmed injuries' : '✅ Sin bajas confirmadas'}</div>}
              {[match.home_team_name, match.away_team_name].map((team: string) => {
                const teamInjuries = injuries?.filter((i: any) => i.team === team)
                if (!teamInjuries?.length) return null
                return (
                  <div key={team} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#4a6785', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{team}</div>
                    {teamInjuries.map((inj: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: i < teamInjuries.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                        <img src={inj.photo} alt="" width={32} height={32} style={{ borderRadius: '50%' }} onError={(e: any) => e.target.style.display = 'none'} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{inj.player}</div>
                          <div style={{ fontSize: 11, color: '#ff4d4d', marginTop: 2 }}>{inj.type} — {inj.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── STANDINGS ── */}
          {tab === 'standings' && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 40px 40px 40px 40px 40px 50px', gap: 6, padding: '10px 16px', fontSize: 9, color: '#4a6785', borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase', letterSpacing: 1 }}>
                <span>#</span><span>Equipo</span><span style={{ textAlign: 'center' }}>PJ</span><span style={{ textAlign: 'center' }}>G</span><span style={{ textAlign: 'center' }}>E</span><span style={{ textAlign: 'center' }}>P</span><span style={{ textAlign: 'center' }}>GD</span><span style={{ textAlign: 'center' }}>Pts</span>
              </div>
              {standings?.slice(0, 20).map((s: any) => (
                <div key={s.rank} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 40px 40px 40px 40px 40px 50px', gap: 6, padding: '9px 16px', fontSize: 12, background: s.isHome || s.isAway ? 'rgba(0,200,120,0.05)' : 'transparent', borderLeft: s.isHome || s.isAway ? `2px solid ${G}` : '2px solid transparent', borderBottom: `1px solid #0a1628` }}>
                  <span style={{ color: '#4a6785' }}>{s.rank}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <img src={s.logo} alt="" width={14} height={14} onError={(e: any) => e.target.style.display = 'none'} />
                    <span style={{ color: s.isHome || s.isAway ? G : 'white', fontWeight: s.isHome || s.isAway ? 700 : 400 }}>{s.team}</span>
                  </span>
                  <span style={{ textAlign: 'center', color: '#6b7fa3' }}>{s.played}</span>
                  <span style={{ textAlign: 'center', color: '#6b7fa3' }}>{s.won}</span>
                  <span style={{ textAlign: 'center', color: '#6b7fa3' }}>{s.drawn}</span>
                  <span style={{ textAlign: 'center', color: '#6b7fa3' }}>{s.lost}</span>
                  <span style={{ textAlign: 'center', color: '#6b7fa3' }}>{(s.gf ?? 0) - (s.ga ?? 0) >= 0 ? '+' : ''}{(s.gf ?? 0) - (s.ga ?? 0)}</span>
                  <span style={{ textAlign: 'center', fontWeight: 700, color: G }}>{s.points}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── FORM ── */}
          {tab === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: match.home_team_name, form: homeForm, logo: match.home_team_logo },
                { label: match.away_team_name, form: awayForm, logo: match.away_team_logo },
              ].map(({ label, form, logo }) => (
                <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <img src={logo} alt="" width={24} height={24} />
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    {form?.results?.slice(0, 10).map((r: any, i: number) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: r.result === 'W' ? '#00c87820' : r.result === 'D' ? '#6b7fa320' : '#ff4d4d20', border: `1px solid ${r.result === 'W' ? G : r.result === 'D' ? '#6b7fa3' : '#ff4d4d'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: r.result === 'W' ? G : r.result === 'D' ? '#6b7fa3' : '#ff4d4d' }}>
                          {r.result}
                        </div>
                        <div style={{ fontSize: 9, color: '#4a6785', marginTop: 3 }}>{r.scored}-{r.conceded}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
                    {form?.unbeaten > 0 && <span style={{ color: G }}>🔥 {t.unbeatenStreak(form.unbeaten)}</span>}
                    {form?.scoring > 0 && <span style={{ color: '#6b7fa3' }}>⚽ {form.scoring} marcando seguidos</span>}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    {form?.results?.map((r: any, i: number) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr auto', fontSize: 11, padding: '6px 0', borderBottom: `1px solid #0a1628`, gap: 8, alignItems: 'center' }}>
                        <span style={{ color: '#4a6785' }}>{r.isHome ? '🏠 Casa' : '✈️ Fuera'}</span>
                        <span style={{ color: '#8090a0' }}>{r.opponent}</span>
                        <span style={{ color: r.result === 'W' ? G : r.result === 'D' ? '#6b7fa3' : '#ff4d4d', fontWeight: 700 }}>{r.scored}-{r.conceded}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ANÁLISIS IA ── */}
          {tab === 'ai' && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: G, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>◆ Powered by Claude AI</div>
                <h3 style={{ fontSize: 20, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2, margin: 0 }}>
                  {lang === 'en' ? <>DEEP <span style={{ color: G }}>ANALYSIS</span></> : <>ANÁLISIS <span style={{ color: G }}>PROFUNDO</span></>}
                </h3>
                <p style={{ color: '#4a6785', fontSize: 12, marginTop: 8 }}>
                  {lang === 'en'
                    ? 'Real-time web context: injuries, form, motivation — beyond what the statistical model sees'
                    : 'Contexto cualitativo con búsqueda web en tiempo real: lesiones, forma, motivación — más allá de lo que ve el modelo estadístico'}
                </p>
              </div>

              {aiLoading && (
                <div style={{ textAlign: 'center', padding: 40, color: '#4a6785' }}>
                  {lang === 'en' ? 'Analyzing match with AI (may take 15-30s)...' : 'Analizando partido con IA (puede tardar 15-30s)...'}
                </div>
              )}

              {!aiLoading && aiNeedsPayment && (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                  <p style={{ color: '#8fa3bf', fontSize: 13, marginBottom: 20, maxWidth: 420, margin: '0 auto 20px' }}>
                    {lang === 'en'
                      ? 'Unlock an AI-generated narrative analysis for this specific match, with current news and context.'
                      : 'Desbloquea un análisis narrativo generado por IA para este partido específico, con noticias y contexto actualizado.'}
                  </p>
                  <button
                    onClick={startAiCheckout}
                    style={{ background: G, border: 'none', color: '#0a1628', padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {lang === 'en' ? 'Unlock for $1.39' : 'Desbloquear por $1.39'}
                  </button>
                </div>
              )}

              {!aiLoading && aiError && (
                <div style={{ textAlign: 'center', padding: 20, color: '#ff4d4d', fontSize: 13 }}>
                  {aiError}
                </div>
              )}

              {!aiLoading && aiContent && (
                <div style={{ color: '#c5d3e8', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {aiContent}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 24px', textAlign: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 10, color: '#2a3f5a' }}>FootyEdge 2.0 · Modelo Poisson Híbrido · No garantiza ganancias · Apuesta responsablemente</span>
        </div>

      </div>
    </div>
  )
}
