'use client'

import { useState, useEffect, useCallback } from 'react'

const LEAGUES = [
  { id: 39, name: 'Premier League' },
  { id: 40, name: 'Championship' },
  { id: 140, name: 'La Liga' },
  { id: 141, name: 'La Liga 2' },
  { id: 135, name: 'Serie A' },
  { id: 136, name: 'Serie B' },
  { id: 78, name: 'Bundesliga' },
  { id: 79, name: '2. Bundesliga' },
  { id: 61, name: 'Ligue 1' },
  { id: 62, name: 'Ligue 2' },
  { id: 88, name: 'Eredivisie' },
]

const MARKETS = [
  { key: 'over05Pct', label: 'Over 0.5' },
  { key: 'over15Pct', label: 'Over 1.5' },
  { key: 'over25Pct', label: 'Over 2.5' },
  { key: 'over35Pct', label: 'Over 3.5' },
  { key: 'bttsPct', label: 'BTTS' },
] as const

type MarketKey = typeof MARKETS[number]['key']

interface TeamRanking {
  team: string
  total: Record<string, number>
  home: Record<string, number>
  away: Record<string, number>
}

export default function RankingsClient() {
  const [leagueId, setLeagueId] = useState(39)
  const [scope, setScope] = useState<'total' | 'home' | 'away'>('total')
  const [sortBy, setSortBy] = useState<MarketKey>('over25Pct')
  const [rankings, setRankings] = useState<TeamRanking[]>([])
  const [loading, setLoading] = useState(false)
  const [isPro, setIsPro] = useState(false)

  const load = useCallback(async (id: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stats/league-rankings?leagueId=${id}&matchLimit=10`)
      const data = await res.json()
      setRankings(data.rankings ?? [])
      setIsPro(data.isPro ?? false)
    } catch (e) {
      console.error(e)
      setRankings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(leagueId) }, [leagueId, load])

  const sorted = [...rankings].sort((a, b) => (b[scope][sortBy] ?? 0) - (a[scope][sortBy] ?? 0))

  return (
    <div style={{ minHeight: '100vh', background: '#0a1626', padding: '32px 16px', fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: '#00c878', letterSpacing: 6, textTransform: 'uppercase', marginBottom: 6 }}>◆ FOOTYEDGE</div>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 4, color: 'white', margin: 0 }}>
            LEAGUE <span style={{ color: '#00c878' }}>RANKINGS</span>
          </h1>
          <p style={{ color: '#4a6785', fontSize: 12, marginTop: 6 }}>
            Estadísticas de mercado por equipo — últimos 10 partidos {!isPro && '(vista gratis: últimos 90 días)'}
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
          <select
            value={leagueId}
            onChange={e => setLeagueId(parseInt(e.target.value))}
            style={selectStyle}
          >
            {LEAGUES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          <select value={scope} onChange={e => setScope(e.target.value as any)} style={selectStyle}>
            <option value="total">Total</option>
            <option value="home">Casa</option>
            <option value="away">Fuera</option>
          </select>

          <select value={sortBy} onChange={e => setSortBy(e.target.value as MarketKey)} style={selectStyle}>
            {MARKETS.map(m => <option key={m.key} value={m.key}>Ordenar: {m.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#4a6785' }}>Cargando...</div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#4a6785' }}>
            Sin datos históricos para esta liga todavía.
          </div>
        ) : (
          <div style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(0,200,120,0.08)', borderBottom: '1px solid #1a2e4a' }}>
                  <th style={thStyle}>Equipo</th>
                  <th style={thStyle}>PJ</th>
                  {MARKETS.map(m => <th key={m.key} style={thStyle}>{m.label}</th>)}
                  <th style={thStyle}>Goles P/C</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const s = r[scope]
                  return (
                    <tr key={r.team} style={{ borderBottom: '1px solid #14243d', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ ...tdStyle, textAlign: 'left', color: 'white', fontWeight: 500 }}>{r.team}</td>
                      <td style={tdStyle}>{s.played}</td>
                      {MARKETS.map(m => (
                        <td key={m.key} style={{ ...tdStyle, color: (s[m.key] ?? 0) >= 60 ? '#00c878' : '#8fa3bf' }}>
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
  border: '1px solid #1a2e4a',
  color: 'white',
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 13,
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'center',
  color: '#4a6785',
  fontSize: 10,
  letterSpacing: 1,
  textTransform: 'uppercase',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'center',
  color: '#8fa3bf',
}
