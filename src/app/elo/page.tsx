'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'

const EloChart = dynamic(() => import('./EloChart'), { ssr: false })

const BG = '#070d1a'
const CARD = 'rgba(13,30,53,0.6)'
const BORDER = '#1a2e4a'
const G = '#00c878'
const MUTE = '#8ba2c0'

interface TeamElo {
  team_id: number
  team_name: string
  elo_rating: number
  matches_played: number
}

export default function EloPage() {
  const [teams, setTeams] = useState<TeamElo[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<TeamElo | null>(null)
  const [history, setHistory] = useState<{ elo_rating: number; match_date: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('sin intentar todavía')

  const loadTeams = useCallback(async (q: string, attempt = 0) => {
    try {
      setDebugInfo(attempt === 0 ? 'haciendo fetch...' : `reintentando (${attempt})...`)
      const res = await fetch(`/api/stats/elo-teams?search=${encodeURIComponent(q)}`, { cache: 'no-store' })
      const data = await res.json()
      const count = data.teams?.length ?? 0
      setDebugInfo(`status: ${res.status} — recibidos: ${count}`)
      setTeams(data.teams ?? [])
      // Si viene vacío pero esperábamos datos, reintentar unas veces —
      // puede ser una instancia de servidor recién iniciada con conexión desincronizada.
      if (count === 0 && attempt < 3) {
        setTimeout(() => loadTeams(q, attempt + 1), 2000)
      }
    } catch (e: any) {
      setDebugInfo(`ERROR: ${e.message}`)
    }
  }, [])

  useEffect(() => { loadTeams(search) }, [search, loadTeams])

  const selectTeam = async (team: TeamElo) => {
    setSelected(team)
    setLoading(true)
    try {
      const res = await fetch(`/api/stats/elo-history?teamId=${team.team_id}`)
      const data = await res.json()
      setHistory(data.history ?? [])
    } finally {
      setLoading(false)
    }
  }

  const chartData = history.map(h => ({
    date: new Date(h.match_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    elo: Math.round(h.elo_rating),
  }))

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 16px', fontFamily: "'DM Mono', monospace" }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: G, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 6 }}>◆ FOOTYEDGE</div>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 4, color: 'white', margin: 0 }}>
            ELO <span style={{ color: G }}>RATINGS</span>
          </h1>
          <p style={{ color: MUTE, fontSize: 12, marginTop: 6 }}>
            Fuerza real de cada equipo, calculada 100% con tus propios datos de partidos liquidados — sin depender de fuentes externas
          </p>
        </div>

        <div style={{ background: 'rgba(255,180,0,0.1)', border: '1px solid #ffb400', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ffb400', fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all' }}>
          DEBUG: {debugInfo}
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar equipo..."
          style={{ width: '100%', background: '#0d1e35', border: `1px solid ${BORDER}`, color: 'white', padding: '10px 16px', borderRadius: 8, fontSize: 14, marginBottom: 20, boxSizing: 'border-box', fontFamily: "'DM Mono', monospace" }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.4fr' : '1fr', gap: 20 }}>
          {/* Leaderboard */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', maxHeight: 520, overflowY: 'auto' }}>
            {teams.map((t, i) => (
              <div key={t.team_id} onClick={() => selectTeam(t)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < teams.length - 1 ? '1px solid #14243d' : 'none', cursor: 'pointer', background: selected?.team_id === t.team_id ? 'rgba(0,200,120,0.08)' : 'transparent' }}>
                <div>
                  <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>{t.team_name}</div>
                  <div style={{ color: MUTE, fontSize: 10 }}>{t.matches_played} partidos</div>
                </div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: G }}>{Math.round(t.elo_rating)}</div>
              </div>
            ))}
            {teams.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: MUTE, fontSize: 13 }}>
                Sin equipos todavía — se van llenando a medida que se liquidan partidos
              </div>
            )}
          </div>

          {/* Gráfico */}
          {selected && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>{selected.team_name}</div>
                <div style={{ color: MUTE, fontSize: 12 }}>Evolución del rating Elo</div>
              </div>
              {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: MUTE }}>Cargando...</div>
              ) : chartData.length < 2 ? (
                <div style={{ padding: 60, textAlign: 'center', color: MUTE, fontSize: 13 }}>
                  Todavía no hay suficiente historial para graficar la evolución de este equipo — vuelve en unos días.
                </div>
              ) : (
                <EloChart data={chartData} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
