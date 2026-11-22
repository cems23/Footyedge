'use client'

import { useMemo, useState } from 'react'

type Competition = {
  competitionId: number
  seasonId: number
  competitionName: string
  countryName: string | null
  seasonName: string
  updatedAt: string | null
  has360: boolean
}

type Match = {
  matchId: number
  date: string
  kickOff: string | null
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
}

type TeamProfile = {
  team: string
  shots: number
  shotsOnTarget: number
  goals: number
  xg: number
  pressures: number
  completedPasses: number
  passAttempts: number
  passCompletion: number | null
}

type Profile = { matchId: number; teams: TeamProfile[]; eventCount: number; note: string }

const BG = 'rgba(13,30,53,0.6)'
const BORDER = '#1a2e4a'
const INFO = '#64b5f6'
const MUTE = '#8ba2c0'
const GOLD = '#ffb400'

async function request(path: string) {
  const response = await fetch(path)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Error ${response.status}`)
  return body
}

export default function StatsBombResearchLab() {
  const [catalog, setCatalog] = useState<Competition[]>([])
  const [competitionKey, setCompetitionKey] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [matchId, setMatchId] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sourceUrl, setSourceUrl] = useState('https://github.com/hudl/open-data')
  const [termsUrl, setTermsUrl] = useState('https://github.com/hudl/open-data/blob/master/README.md')
  const [loading, setLoading] = useState<'catalog' | 'matches' | 'profile' | null>(null)
  const [error, setError] = useState('')

  const selectedCompetition = useMemo(
    () => catalog.find((item) => `${item.competitionId}:${item.seasonId}` === competitionKey) ?? null,
    [catalog, competitionKey],
  )

  const loadCatalog = async () => {
    if (loading) return
    setLoading('catalog'); setError('')
    try {
      const data = await request('/api/admin/research/statsbomb')
      setCatalog(data.competitions ?? [])
      setSourceUrl(data.sourceUrl ?? sourceUrl)
      setTermsUrl(data.termsUrl ?? termsUrl)
    } catch (err: any) {
      setError(err.message ?? 'No se pudo cargar el catálogo.')
    } finally { setLoading(null) }
  }

  const loadMatches = async () => {
    if (!selectedCompetition || loading) return
    setLoading('matches'); setError(''); setMatches([]); setMatchId(''); setProfile(null)
    try {
      const data = await request(`/api/admin/research/statsbomb?competitionId=${selectedCompetition.competitionId}&seasonId=${selectedCompetition.seasonId}`)
      setMatches(data.matches ?? [])
      setSourceUrl(data.sourceUrl ?? sourceUrl)
      setTermsUrl(data.termsUrl ?? termsUrl)
    } catch (err: any) {
      setError(err.message ?? 'No se pudieron cargar los partidos.')
    } finally { setLoading(null) }
  }

  const analyzeMatch = async () => {
    if (!matchId || loading) return
    setLoading('profile'); setError(''); setProfile(null)
    try {
      const data = await request(`/api/admin/research/statsbomb?matchId=${encodeURIComponent(matchId)}`)
      setProfile(data.profile ?? null)
      setSourceUrl(data.sourceUrl ?? sourceUrl)
      setTermsUrl(data.termsUrl ?? termsUrl)
    } catch (err: any) {
      setError(err.message ?? 'No se pudo resumir el partido.')
    } finally { setLoading(null) }
  }

  const isBusy = loading !== null

  return (
    <section aria-labelledby="statsbomb-lab-title" style={{ marginTop: 30, padding: 20, borderRadius: 14, background: BG, border: `1px solid rgba(100,181,246,.45)` }}>
      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: INFO, fontSize: 10, letterSpacing: '.16em', marginBottom: 6 }}>ADMIN · RESEARCH LAB</div>
          <h2 id="statsbomb-lab-title" style={{ margin: 0, color: 'white', fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: '.04em' }}>StatsBomb Open Data</h2>
          <p style={{ maxWidth: 740, margin: '7px 0 0', color: MUTE, lineHeight: 1.55, fontSize: 12 }}>
            Laboratorio histórico para contrastar xG, presión y calidad de pase. No altera picks, predicciones, cuotas ni datos de usuarios. No se guardan ni se muestran eventos en bruto.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
          <a href={sourceUrl} target="_blank" rel="noreferrer" style={{ color: '#9dd4ff' }}>Repositorio ↗</a>
          <a href={termsUrl} target="_blank" rel="noreferrer" style={{ color: '#ffcf69' }}>Uso y atribución ↗</a>
        </div>
      </div>

      <div role="note" style={{ borderLeft: `3px solid ${GOLD}`, background: 'rgba(255,180,0,.07)', borderRadius: 7, color: '#dbc78f', lineHeight: 1.5, fontSize: 11, marginTop: 14, padding: '9px 11px' }}>
        Solo investigación interna. El catálogo es histórico y selectivo; no es un feed live ni cubre todas las ligas. Cualquier uso externo requiere comprobar el acuerdo de datos de StatsBomb.
      </div>

      {catalog.length === 0 ? (
        <div style={{ marginTop: 14 }}>
          <button type="button" onClick={() => void loadCatalog()} disabled={isBusy} style={{ minHeight: 38, border: `1px solid ${INFO}`, borderRadius: 8, background: isBusy ? '#254159' : 'rgba(100,181,246,.12)', color: isBusy ? MUTE : '#bce1ff', padding: '0 13px', cursor: isBusy ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 11 }}>
            {loading === 'catalog' ? 'Cargando catálogo…' : 'Cargar catálogo de investigación'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.3fr) auto', gap: 10, alignItems: 'end', marginTop: 15 }}>
          <label style={{ display: 'grid', gap: 5, color: MUTE, fontSize: 10, letterSpacing: '.05em' }}>
            COMPETICIÓN Y TEMPORADA DISPONIBLE
            <select value={competitionKey} onChange={(event) => { setCompetitionKey(event.target.value); setMatches([]); setMatchId(''); setProfile(null) }} disabled={isBusy} style={{ minHeight: 38, background: '#09172a', border: '1px solid #315271', borderRadius: 8, color: '#e8eaf6', padding: '0 10px', font: 'inherit', fontSize: 12 }}>
              <option value="">Selecciona una competición</option>
              {catalog.map((item) => <option key={`${item.competitionId}:${item.seasonId}`} value={`${item.competitionId}:${item.seasonId}`}>{item.competitionName} · {item.seasonName}{item.countryName ? ` · ${item.countryName}` : ''}{item.has360 ? ' · 360° parcial' : ''}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => void loadMatches()} disabled={!selectedCompetition || isBusy} style={{ minHeight: 38, border: 0, borderRadius: 8, background: selectedCompetition && !isBusy ? INFO : '#254159', color: selectedCompetition && !isBusy ? '#07101b' : MUTE, padding: '0 13px', cursor: selectedCompetition && !isBusy ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: 11 }}>
            {loading === 'matches' ? 'Cargando…' : 'Ver partidos'}
          </button>
        </div>
      )}

      {selectedCompetition && matches.length === 0 && loading !== 'matches' && <p role="status" style={{ color: MUTE, margin: '11px 0 0', fontSize: 11 }}>Elige “Ver partidos” para consultar únicamente los metadatos de esa temporada.</p>}

      {matches.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.3fr) auto', gap: 10, alignItems: 'end', marginTop: 14 }}>
          <label style={{ display: 'grid', gap: 5, color: MUTE, fontSize: 10, letterSpacing: '.05em' }}>
            PARTIDO HISTÓRICO ({matches.length})
            <select value={matchId} onChange={(event) => { setMatchId(event.target.value); setProfile(null) }} disabled={isBusy} style={{ minHeight: 38, background: '#09172a', border: '1px solid #315271', borderRadius: 8, color: '#e8eaf6', padding: '0 10px', font: 'inherit', fontSize: 12 }}>
              <option value="">Selecciona un partido</option>
              {matches.map((match) => <option key={match.matchId} value={match.matchId}>{match.date} · {match.homeTeam} {match.homeScore ?? '—'}–{match.awayScore ?? '—'} {match.awayTeam}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => void analyzeMatch()} disabled={!matchId || isBusy} style={{ minHeight: 38, border: 0, borderRadius: 8, background: matchId && !isBusy ? '#00c878' : '#254159', color: matchId && !isBusy ? '#061019' : MUTE, padding: '0 13px', cursor: matchId && !isBusy ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: 11 }}>
            {loading === 'profile' ? 'Calculando…' : 'Calcular resumen'}
          </button>
        </div>
      )}

      {loading && <div role="status" style={{ minHeight: 28, paddingTop: 11, color: '#bce1ff', fontSize: 11 }}>Consultando la fuente de investigación…</div>}
      {error && <p role="alert" style={{ margin: '12px 0 0', color: '#ff8585', fontSize: 12 }}>{error}</p>}

      {profile && <div aria-live="polite" style={{ marginTop: 15 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', color: MUTE, fontSize: 10, marginBottom: 8 }}>
          <span>{profile.eventCount.toLocaleString('es-ES')} eventos procesados solo en memoria</span>
          <span>{profile.note}</span>
        </div>
        <div style={{ overflowX: 'auto', border: `1px solid ${BORDER}`, borderRadius: 10 }}>
          <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', fontSize: 11 }}>
            <thead><tr style={{ color: MUTE, textAlign: 'left', background: 'rgba(7,13,26,.48)' }}>
              {['Equipo', 'xG', 'Tiros', 'A puerta', 'Goles', 'Presiones', 'Pases', '% pase'].map((head) => <th key={head} scope="col" style={{ padding: '9px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>{head}</th>)}
            </tr></thead>
            <tbody>{profile.teams.map((team) => <tr key={team.team} style={{ borderTop: `1px solid ${BORDER}` }}>
              <th scope="row" style={{ padding: '10px', textAlign: 'left', color: 'white' }}>{team.team}</th>
              <td style={{ padding: '10px', color: '#00c878', fontWeight: 700 }}>{team.xg.toFixed(2)}</td>
              <td style={{ padding: '10px' }}>{team.shots}</td><td style={{ padding: '10px' }}>{team.shotsOnTarget}</td><td style={{ padding: '10px' }}>{team.goals}</td><td style={{ padding: '10px' }}>{team.pressures}</td><td style={{ padding: '10px' }}>{team.completedPasses}/{team.passAttempts}</td><td style={{ padding: '10px' }}>{team.passCompletion == null ? '—' : `${team.passCompletion}%`}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>}
    </section>
  )
}
