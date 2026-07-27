'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const EloChart = dynamic(() => import('./EloChart'), { ssr: false })
const TeamRadar = dynamic(() => import('./TeamRadar'), { ssr: false })

const BG = '#070d1a'
const CARD = 'rgba(13,30,53,0.6)'
const BORDER = '#1a2e4a'
const G = '#00c878'
const GOLD = '#ffb400'
const MUTE = '#8ba2c0'

interface TeamElo {
  team_id: number
  team_name: string
  elo_rating: number
  matches_played: number
  league_id: number | null
  league_name: string | null
  logo_url: string | null
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: G, textTransform: 'uppercase', letterSpacing: '0.06em', transform: 'skewX(-6deg)', display: 'inline-block' }}>
      ◆ {children}
    </span>
  )
}

export default function EloPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<TeamElo[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<TeamElo | null>(null)
  const [history, setHistory] = useState<{ elo_rating: number; match_date: string }[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [favorites, setFavorites] = useState<Set<number>>(new Set())

  const loadTeams = useCallback(async (q: string) => {
    const res = await fetch(`/api/stats/elo-teams?search=${encodeURIComponent(q)}`, { cache: 'no-store' })
    const data = await res.json()
    setTeams(data.teams ?? [])
  }, [])

  const loadFavorites = useCallback(async () => {
    const res = await fetch('/api/user/favorite-teams', { cache: 'no-store' })
    const data = await res.json()
    setFavorites(new Set((data.favorites ?? []).map((f: any) => f.team_id)))
  }, [])

  useEffect(() => { loadTeams(search) }, [search, loadTeams])
  useEffect(() => { loadFavorites() }, [loadFavorites])

  const toggleFavorite = async (e: React.MouseEvent, team: TeamElo) => {
    e.stopPropagation()
    const isFav = favorites.has(team.team_id)
    const next = new Set(favorites)
    if (isFav) { next.delete(team.team_id) } else { next.add(team.team_id) }
    setFavorites(next)
    if (isFav) {
      await fetch(`/api/user/favorite-teams?teamId=${team.team_id}`, { method: 'DELETE' })
    } else {
      await fetch('/api/user/favorite-teams', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team.team_id, teamName: team.team_name }),
      })
    }
  }

  const selectTeam = async (team: TeamElo) => {
    setSelected(team)
    setLoading(true)
    setProfile(null)
    try {
      const [histRes, profRes] = await Promise.all([
        fetch(`/api/stats/elo-history?teamId=${team.team_id}`),
        fetch(`/api/stats/team-profile?teamId=${team.team_id}&teamName=${encodeURIComponent(team.team_name)}`),
      ])
      const histData = await histRes.json()
      const profData = await profRes.json()
      setHistory(histData.history ?? [])
      if (profData.hasData) setProfile(profData.profile)
    } finally {
      setLoading(false)
    }
  }

  const chartData = history.map(h => ({
    date: new Date(h.match_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    elo: Math.round(h.elo_rating),
  }))

  const favTeams = teams.filter(t => favorites.has(t.team_id))
  const rest = teams.filter(t => !favorites.has(t.team_id))

  const grouped = new Map<string, TeamElo[]>()
  for (const t of rest) {
    const key = t.league_name ?? 'Sin liga'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(t)
  }

  const TeamRow = ({ t }: { t: TeamElo }) => (
    <div key={t.team_id} onClick={() => selectTeam(t)}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #14243d', cursor: 'pointer', background: selected?.team_id === t.team_id ? 'rgba(0,200,120,0.1)' : 'transparent', transition: 'background .15s ease' }}
      onMouseEnter={e => { if (selected?.team_id !== t.team_id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if (selected?.team_id !== t.team_id) e.currentTarget.style.background = 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <button onClick={e => toggleFavorite(e, t)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 26, padding: 0, lineHeight: 1, color: favorites.has(t.team_id) ? GOLD : '#3a5578', flexShrink: 0, transition: 'transform .15s ease', textShadow: favorites.has(t.team_id) ? '0 0 12px rgba(255,180,0,0.6)' : 'none' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
          {favorites.has(t.team_id) ? '★' : '☆'}
        </button>
        {t.logo_url && <img src={t.logo_url} width={22} height={22} alt="" style={{ flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'white', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.team_name}</div>
          <div style={{ color: MUTE, fontSize: 10 }}>{t.matches_played} partidos</div>
        </div>
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: G, flexShrink: 0 }}>{Math.round(t.elo_rating)}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 16px', fontFamily: "'DM Mono', monospace" }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button onClick={() => router.push('/es/dashboard')} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: MUTE, padding: '8px 16px', borderRadius: 999, fontSize: 12, cursor: 'pointer' }}>
            ← Volver al Dashboard
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: G, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 6 }}>◆ FOOTYEDGE</div>
          <h1 style={{ fontSize: 'clamp(42px, 8vw, 84px)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.02em', color: 'white', margin: 0, textTransform: 'uppercase', lineHeight: 0.95 }}>
            <span style={{ transform: 'skewX(-8deg)', display: 'inline-block' }}>ELO</span>{' '}
            <span style={{ color: G, transform: 'skewX(-8deg)', display: 'inline-block', textShadow: '0 0 40px rgba(0,200,120,0.5)' }}>RATINGS</span>
          </h1>
          <p style={{ color: MUTE, fontSize: 12, marginTop: 6 }}>
            Fuerza real de cada equipo, calculada 100% con tus propios datos de partidos liquidados
          </p>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar equipo..."
          style={{ width: '100%', background: '#0d1e35', border: `1px solid ${BORDER}`, color: 'white', padding: '10px 16px', borderRadius: 8, fontSize: 14, marginBottom: 20, boxSizing: 'border-box', fontFamily: "'DM Mono', monospace" }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.4fr' : '1fr', gap: 20 }}>
          <div style={{ maxHeight: 560, overflowY: 'auto' }}>
            {favTeams.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ padding: '0 4px 8px' }}><SectionHeader>Favoritos</SectionHeader></div>
                <div style={{ background: CARD, border: `1px solid ${GOLD}55`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 14px 40px rgba(0,0,0,0.3), 0 0 30px rgba(255,180,0,0.06)' }}>
                  {favTeams.map(t => <TeamRow key={t.team_id} t={t} />)}
                </div>
              </div>
            )}

            {teams.length === 0 && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 40, textAlign: 'center', color: MUTE, fontSize: 13 }}>
                Sin equipos todavía — se van llenando a medida que se liquidan partidos
              </div>
            )}

            {Array.from(grouped.entries()).map(([league, list]) => (
              <div key={league} style={{ marginBottom: 16 }}>
                <div style={{ padding: '0 4px 8px' }}><SectionHeader>{league}</SectionHeader></div>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 14px 40px rgba(0,0,0,0.3)' }}>
                  {list.map(t => <TeamRow key={t.team_id} t={t} />)}
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, alignSelf: 'flex-start', boxShadow: '0 14px 40px rgba(0,0,0,0.3), 0 0 30px rgba(0,200,120,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                {selected.logo_url && <img src={selected.logo_url} width={32} height={32} alt="" />}
                <div>
                  <div style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>{selected.team_name}</div>
                  <div style={{ color: MUTE, fontSize: 12 }}>Evolución del rating Elo</div>
                </div>
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

              {!loading && profile && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ color: MUTE, fontSize: 12, marginBottom: 8 }}>Perfil actual del equipo (últimos partidos)</div>
                  <TeamRadar profile={profile} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
