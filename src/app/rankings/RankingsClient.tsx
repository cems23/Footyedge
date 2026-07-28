'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRef } from 'react'
import { animate, stagger } from 'animejs'

const BG = '#070d1a'
const CARD = 'rgba(13,30,53,0.6)'
const BORDER = '#1a2e4a'
const G = '#00c878'
const MUTE = '#8ba2c0'

const LEAGUES = [
  { id: 39,  name: 'Premier League' },
  { id: 40,  name: 'Championship' },
  { id: 41,  name: 'League One' },
  { id: 42,  name: 'League Two' },
  { id: 140, name: 'La Liga' },
  { id: 141, name: 'Segunda División' },
  { id: 135, name: 'Serie A' },
  { id: 136, name: 'Serie B' },
  { id: 78,  name: 'Bundesliga' },
  { id: 79,  name: '2. Bundesliga' },
  { id: 61,  name: 'Ligue 1' },
  { id: 62,  name: 'Ligue 2' },
  { id: 88,  name: 'Eredivisie' },
  { id: 94,  name: 'Primeira Liga' },
  { id: 203, name: 'Süper Lig' },
  { id: 144, name: 'Pro League (Bélgica)' },
  { id: 169, name: 'Scottish Premiership' },
  { id: 106, name: 'Ekstraklasa (Polonia)' },
  { id: 119, name: 'Superliga (Dinamarca)' },
  { id: 218, name: 'Bundesliga (Austria)' },
  { id: 197, name: 'Super League (Grecia)' },
  { id: 235, name: 'RPL (Rusia)' },
  { id: 207, name: 'Super League (Suiza)' },
  { id: 128, name: 'Liga Argentina' },
  { id: 71,  name: 'Brasileirão' },
  { id: 253, name: 'MLS' },
  { id: 262, name: 'Liga MX' },
  { id: 239, name: 'Primera División (Chile)' },
  { id: 242, name: 'Primera División (Uruguay)' },
  { id: 283, name: 'Liga BetPlay (Colombia)' },
  { id: 113, name: 'Allsvenskan (Suecia)' },
  { id: 103, name: 'Eliteserien (Noruega)' },
  { id: 164, name: 'Úrvalsdeild (Islandia)' },
  { id: 307, name: 'Saudi Pro League' },
  { id: 332, name: 'Persian Gulf Pro (Irán)' },
  { id: 188, name: 'J1 League (Japón)' },
  { id: 292, name: 'K League 1 (Corea)' },
]

const MARKETS = [
  { key: 'over05Pct', label: 'Ov 0.5' },
  { key: 'over15Pct', label: 'Ov 1.5' },
  { key: 'over25Pct', label: 'Ov 2.5' },
  { key: 'over35Pct', label: 'Ov 3.5' },
  { key: 'bttsPct',   label: 'BTTS' },
] as const

type MarketKey = typeof MARKETS[number]['key']

interface TeamRanking {
  team: string
  total: Record<string, number>
  home: Record<string, number>
  away: Record<string, number>
}

const T = {
  es: {
    title1: 'RANKINGS', title2: 'POR LIGA',
    subtitle: (isPro: boolean) => `Estadísticas de mercado por equipo, últimos 10 partidos${!isPro ? ' (vista gratis: últimos 90 días)' : ''}`,
    explainer: 'Qué es esto: para cada equipo de la liga seleccionada, calculamos con qué frecuencia sus partidos superan cada línea de goles (Over 0.5–3.5) y con qué frecuencia ambos equipos anotan (BTTS) — separado por Total, en Casa, o de Visita. Útil para encontrar equipos con patrones consistentes antes de revisar el partido específico.',
    team: 'Equipo', played: 'PJ', goals: 'Goles P/C',
    total: 'Total', home: 'Casa', away: 'Fuera',
    sortBy: 'Ordenar', loading: 'Cargando...',
    empty: 'Sin datos históricos para esta liga todavía.',
  },
  en: {
    title1: 'LEAGUE', title2: 'RANKINGS',
    subtitle: (isPro: boolean) => `Per-team market stats, last 10 matches${!isPro ? ' (free view: last 90 days)' : ''}`,
    explainer: "What this is: for every team in the selected league, we calculate how often their matches go over each goal line (Over 0.5–3.5) and how often both teams score (BTTS) — split by Total, Home, or Away. Useful for spotting consistent team patterns before checking a specific match.",
    team: 'Team', played: 'MP', goals: 'Goals For/Against',
    total: 'Total', home: 'Home', away: 'Away',
    sortBy: 'Sort by', loading: 'Loading...',
    empty: 'No historical data for this league yet.',
  },
}

export default function RankingsClient() {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [leagueId, setLeagueId] = useState(39)
  const [scope, setScope] = useState<'total' | 'home' | 'away'>('total')
  const [sortBy, setSortBy] = useState<MarketKey>('over25Pct')
  const [rankings, setRankings] = useState<TeamRanking[]>([])
  const [loading, setLoading] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [season, setSeason] = useState<number | null>(null)
  const [presets, setPresets] = useState<any[]>([])
  const [presetsLoaded, setPresetsLoaded] = useState(false)
  const [savingPreset, setSavingPreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const presetsListRef = useRef<HTMLDivElement>(null)
  const t = T[lang]

  const load = useCallback(async (id: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stats/league-rankings?leagueId=${id}&matchLimit=10`)
      const data = await res.json()
      setRankings(data.rankings ?? [])
      setIsPro(data.isPro ?? false)
      setSeason(data.season ?? null)
    } catch (e) {
      console.error(e)
      setRankings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(leagueId) }, [leagueId, load])

  useEffect(() => {
    fetch('/api/rankings-presets')
      .then(r => r.json())
      .then(d => { setPresets(d.presets ?? []); setPresetsLoaded(true) })
      .catch(() => setPresetsLoaded(true))
  }, [])

  const animatePresetsIn = () => {
    requestAnimationFrame(() => {
      const items = presetsListRef.current?.querySelectorAll('.preset-chip')
      if (!items || !items.length) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        items.forEach(el => { (el as HTMLElement).style.opacity = '1'; (el as HTMLElement).style.transform = 'none' })
        return
      }
      animate(items, { opacity: [0, 1], scale: [0.85, 1], duration: 350, delay: stagger(60), ease: 'outBack' })
    })
  }

  const savePreset = async () => {
    if (!presetName.trim()) return
    setSavingPreset(true)
    try {
      const res = await fetch('/api/rankings-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: presetName.trim(), leagueId, scope, sortBy }),
      })
      const data = await res.json()
      if (data.preset) {
        setPresets(prev => [data.preset, ...prev])
        setPresetName('')
        animatePresetsIn()
      }
    } finally {
      setSavingPreset(false)
    }
  }

  const applyPreset = (p: any) => {
    setLeagueId(p.league_id)
    setScope(p.scope)
    setSortBy(p.sort_by)
  }

  const deletePreset = async (id: number) => {
    setPresets(prev => prev.filter(p => p.id !== id))
    await fetch(`/api/rankings-presets?id=${id}`, { method: 'DELETE' })
  }

  const sorted = [...rankings].sort((a, b) => (b[scope][sortBy] ?? 0) - (a[scope][sortBy] ?? 0))

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 16px', fontFamily: "'DM Mono', monospace" }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: MUTE, padding: '6px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer' }}>
            {lang === 'es' ? '🇬🇧 EN' : '🇪🇸 ES'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: G, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 6 }}>◆ FOOTYEDGE</div>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 4, color: 'white', margin: 0 }}>
            {t.title1} <span style={{ color: G }}>{t.title2}</span>
          </h1>
          <p style={{ color: MUTE, fontSize: 12, marginTop: 6 }}>{t.subtitle(isPro)}</p>
          {season != null && (
            <p style={{ color: G, fontSize: 11, marginTop: 4 }}>
              {lang === 'es' ? `Temporada ${season}/${(season + 1).toString().slice(-2)}` : `${season}/${(season + 1).toString().slice(-2)} season`}
            </p>
          )}
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20, fontSize: 12, color: MUTE, lineHeight: 1.6 }}>
          💡 {t.explainer}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
          <select value={leagueId} onChange={e => setLeagueId(parseInt(e.target.value))} style={selectStyle}>
            {LEAGUES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          <select value={scope} onChange={e => setScope(e.target.value as any)} style={selectStyle}>
            <option value="total">{t.total}</option>
            <option value="home">{t.home}</option>
            <option value="away">{t.away}</option>
          </select>

          <select value={sortBy} onChange={e => setSortBy(e.target.value as MarketKey)} style={selectStyle}>
            {MARKETS.map(m => <option key={m.key} value={m.key}>{t.sortBy}: {m.label}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
          <input
            type="text"
            value={presetName}
            onChange={e => setPresetName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && savePreset()}
            placeholder={lang === 'es' ? 'Nombre del preset...' : 'Preset name...'}
            style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 12, outline: 'none', width: 180 }}
          />
          <button
            onClick={savePreset}
            disabled={savingPreset || !presetName.trim()}
            style={{ background: 'rgba(0,200,120,0.14)', border: `1px solid ${G}`, color: G, padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: savingPreset || !presetName.trim() ? 'not-allowed' : 'pointer', opacity: savingPreset || !presetName.trim() ? 0.5 : 1 }}
          >
            💾 {lang === 'es' ? 'Guardar' : 'Save'}
          </button>
        </div>

        {presetsLoaded && presets.length > 0 && (
          <div ref={presetsListRef} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
            {presets.map((p) => (
              <div key={p.id} className="preset-chip" style={{ display: 'flex', alignItems: 'center', gap: 6, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 999, padding: '4px 6px 4px 12px' }}>
                <button onClick={() => applyPreset(p)} style={{ background: 'transparent', border: 'none', color: MUTE, fontSize: 12, cursor: 'pointer' }}>
                  ⭐ {p.name}
                </button>
                <button onClick={() => deletePreset(p.id)} style={{ background: 'transparent', border: 'none', color: '#ff4d4d', fontSize: 11, cursor: 'pointer', padding: '2px 6px' }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: MUTE }}>{t.loading}</div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: MUTE }}>{t.empty}</div>
        ) : (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(0,200,120,0.08)', borderBottom: `1px solid ${BORDER}` }}>
                  <th style={thStyle}>{t.team}</th>
                  <th style={thStyle}>{t.played}</th>
                  {MARKETS.map(m => <th key={m.key} style={thStyle}>{m.label}</th>)}
                  <th style={thStyle}>{t.goals}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const s = r[scope]
                  return (
                    <tr key={r.team} style={{ borderBottom: '1px solid #14243d', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ ...tdStyle, textAlign: 'left', color: 'white', fontWeight: 700 }}>{r.team}</td>
                      <td style={tdStyle}>{s.played}</td>
                      {MARKETS.map(m => (
                        <td key={m.key} style={{ ...tdStyle, color: (s[m.key] ?? 0) >= 60 ? G : MUTE, fontWeight: (s[m.key] ?? 0) >= 60 ? 700 : 400 }}>
                          {s[m.key] ?? 0}%
                        </td>
                      ))}
                      <td style={tdStyle}>{s.avgGoalsFor} / {s.avgGoalsAgainst}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  background: '#0d1e35',
  border: `1px solid ${BORDER}`,
  color: 'white',
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "'DM Mono', monospace",
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'center',
  color: MUTE,
  fontSize: 10,
  letterSpacing: 1,
  textTransform: 'uppercase',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'center',
  color: MUTE,
}
