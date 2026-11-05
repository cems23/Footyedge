'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RADAR_COMPETITIONS } from '@/lib/football/radarCompetitions'
import { isAdminEmail } from '@/lib/permissions'

type Match = {
  id: string; league_id?: number; league_name: string; home_team_name: string; away_team_name: string
  home_team_logo?: string; away_team_logo?: string; kickoff_at: string; status?: string
}

const DONE_STATUSES = new Set(['FT', 'AET', 'PEN', 'PST', 'CANC', 'SUSP', 'ABD'])

export default function ValueLeagueRadar({ lang, plan, email }: { lang: string; plan: string; email?: string }) {
  const router = useRouter()
  const [leagueToAdd, setLeagueToAdd] = useState('2')
  const [leagueIds, setLeagueIds] = useState<number[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<any[]>([])
  const isEn = lang === 'en'
  const isAllowed = plan === 'pro' || plan === 'elite' || isAdminEmail(email)
  const selectedLeagues = useMemo(() => RADAR_COMPETITIONS.filter((competition) => leagueIds.includes(competition.id)), [leagueIds])
  const upcoming = useMemo(() => matches.filter((match) => !DONE_STATUSES.has(match.status ?? '') && new Date(match.kickoff_at).getTime() > Date.now()), [matches])

  const addLeague = () => {
    const id = Number(leagueToAdd)
    if (!leagueIds.includes(id)) {
      setLeagueIds((current) => [...current, id])
      setMatches([]); setSelected([]); setResults([]); setHasSearched(false)
    }
  }
  const addAllLeagues = () => {
    setLeagueIds(RADAR_COMPETITIONS.map((competition) => competition.id))
    setMatches([]); setSelected([]); setResults([]); setHasSearched(false)
  }
  const removeLeague = (id: number) => {
    setLeagueIds((current) => current.filter((value) => value !== id))
    setMatches([]); setSelected([]); setResults([]); setHasSearched(false)
  }
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < 5 ? [...current, id] : current)

  const fetchMatches = async () => {
    if (!leagueIds.length || loadingMatches) return
    setLoadingMatches(true); setError(''); setResults([]); setSelected([])
    try {
      const response = await fetch(`/api/radar/matches?leagueIds=${leagueIds.join(',')}`)
      const data = await response.json()
      if (!response.ok) {
        if (data.error === 'RADAR_PRO_REQUIRED') { router.push(`/${lang}/pricing?reason=radar`); return }
        throw new Error(data.error ?? (isEn ? 'Unable to find matches.' : 'No se pudieron buscar los partidos.'))
      }
      setMatches(data.matches ?? [])
      setHasSearched(true)
    } catch (err: any) { setError(err.message ?? (isEn ? 'Unable to find matches.' : 'No se pudieron buscar los partidos.')) }
    finally { setLoadingMatches(false) }
  }

  const analyze = async () => {
    if (!selected.length || loadingAnalysis) return
    setLoadingAnalysis(true); setError(''); setResults([])
    try {
      const response = await fetch('/api/radar/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ matchIds: selected }) })
      const data = await response.json()
      if (!response.ok) {
        if (data.error === 'RADAR_PRO_REQUIRED') { router.push(`/${lang}/pricing?reason=radar`); return }
        throw new Error(data.error ?? (isEn ? 'Unable to analyze the selection.' : 'No se pudo analizar la selección.'))
      }
      setResults(data.results ?? [])
    } catch (err: any) { setError(err.message ?? (isEn ? 'Unable to analyze the selection.' : 'No se pudo analizar la selección.')) }
    finally { setLoadingAnalysis(false) }
  }

  return <section aria-labelledby="value-league-radar" style={{ background: 'rgba(13,30,53,.72)', border: '1px solid rgba(100,181,246,.34)', borderRadius: 16, boxShadow: '0 14px 40px rgba(0,0,0,.28)', padding: 18, marginBottom: 12 }}>
    <div>
      <div style={{ color: '#64b5f6', fontSize: 10, letterSpacing: '.18em', marginBottom: 5 }}>MATCH INTELLIGENCE RADAR</div>
      <h2 id="value-league-radar" style={{ margin: 0, fontFamily: '"Bebas Neue", sans-serif', fontSize: 25, color: '#f2f6ff', letterSpacing: '.04em' }}>{isEn ? 'Search any monitored competition' : 'Busca en cualquier competición monitorizada'}</h2>
      <p style={{ color: '#8ba2c0', fontSize: 11, lineHeight: 1.55, maxWidth: 700, margin: '7px 0 0' }}>{isEn ? 'Add the competitions you want, find their next seven days of fixtures, then choose up to five matches. Only then do we check confirmed absences, lineups, current news and available odds.' : 'Añade las competiciones que quieras, busca sus partidos de los próximos siete días y elige hasta cinco. Solo entonces revisamos bajas confirmadas, alineaciones, noticias actuales y cuotas disponibles.'}</p>
    </div>

    {!isAllowed && <p style={{ color: '#ffb400', fontSize: 11, margin: '13px 0 0' }}>{isEn ? 'Available with Pro or Elite.' : 'Disponible con Pro o Elite.'}</p>}

    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end', marginTop: 15 }}>
      <label style={{ display: 'grid', gap: 5, minWidth: 230, flex: '1 1 260px', color: '#8ba2c0', fontSize: 10, letterSpacing: '.05em' }}>
        {isEn ? 'COMPETITION' : 'COMPETICIÓN'}
        <select value={leagueToAdd} onChange={(event) => setLeagueToAdd(event.target.value)} disabled={loadingMatches || loadingAnalysis} style={{ minHeight: 38, background: '#09172a', color: '#e8eaf6', border: '1px solid #315271', borderRadius: 8, padding: '0 10px', fontFamily: 'inherit', fontSize: 12 }}>
          {RADAR_COMPETITIONS.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}
        </select>
      </label>
      <button type="button" onClick={addLeague} disabled={loadingMatches || loadingAnalysis || leagueIds.includes(Number(leagueToAdd))} style={{ minHeight: 38, background: 'transparent', border: '1px solid #315271', color: '#b7c7dc', borderRadius: 8, padding: '0 12px', cursor: leagueIds.includes(Number(leagueToAdd)) ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700 }}>{isEn ? 'Add league' : 'Añadir liga'}</button>
      <button type="button" onClick={addAllLeagues} disabled={loadingMatches || loadingAnalysis || leagueIds.length === RADAR_COMPETITIONS.length} style={{ minHeight: 38, background: 'transparent', border: '1px solid #315271', color: '#64b5f6', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>{isEn ? 'All competitions' : 'Todas'}</button>
      <button type="button" disabled={!leagueIds.length || loadingMatches || loadingAnalysis} onClick={fetchMatches} style={{ minWidth: 155, minHeight: 38, background: leagueIds.length && !loadingMatches && !loadingAnalysis ? '#64b5f6' : '#254159', color: leagueIds.length && !loadingMatches && !loadingAnalysis ? '#061019' : '#86a2ba', border: 'none', borderRadius: 8, padding: '0 14px', cursor: leagueIds.length && !loadingMatches && !loadingAnalysis ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 800 }}>{loadingMatches ? (isEn ? 'Searching…' : 'Buscando…') : (isEn ? 'Find matches' : 'Buscar partidos')}</button>
    </div>

    {selectedLeagues.length > 0 && <div aria-label={isEn ? 'Selected competitions' : 'Competiciones seleccionadas'} style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
      {selectedLeagues.map((competition) => <button key={competition.id} type="button" onClick={() => removeLeague(competition.id)} disabled={loadingMatches || loadingAnalysis} aria-label={`${isEn ? 'Remove' : 'Quitar'} ${competition.name}`} style={{ background: 'rgba(100,181,246,.1)', border: '1px solid rgba(100,181,246,.4)', borderRadius: 999, color: '#b8dbff', padding: '5px 9px', cursor: 'pointer', fontSize: 10 }}>{competition.name} <span aria-hidden="true">×</span></button>)}
    </div>}

    {leagueIds.length === 0 && <p role="status" style={{ color: '#8ba2c0', fontSize: 11, margin: '13px 0 0' }}>{isEn ? 'Choose one or more competitions to search their upcoming fixtures.' : 'Elige una o varias competiciones para buscar sus próximos partidos.'}</p>}
    {leagueIds.length > 0 && !loadingMatches && !hasSearched && !error && <p role="status" style={{ color: '#8ba2c0', fontSize: 11, margin: '13px 0 0' }}>{isEn ? 'Choose “Find matches” to load fixtures with a model prediction.' : 'Pulsa “Buscar partidos” para cargar los partidos con predicción del modelo.'}</p>}
    {leagueIds.length > 0 && !loadingMatches && hasSearched && upcoming.length === 0 && <p role="status" style={{ color: '#8ba2c0', fontSize: 12, padding: '14px 0 2px', margin: 0 }}>{isEn ? 'No upcoming model-ready fixtures were found in the next seven days for these competitions.' : 'No hay partidos próximos con predicción del modelo para estas competiciones en los próximos siete días.'}</p>}

    {upcoming.length > 0 && <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#8ba2c0', fontSize: 10 }}>{isEn ? `${upcoming.length} matches found · choose up to 5` : `${upcoming.length} partidos encontrados · elige hasta 5`}</span>
        <button type="button" disabled={!selected.length || loadingAnalysis || loadingMatches} onClick={analyze} style={{ minWidth: 178, minHeight: 38, background: selected.length && !loadingAnalysis ? '#00c878' : '#254159', color: selected.length && !loadingAnalysis ? '#061019' : '#86a2ba', border: 'none', borderRadius: 8, padding: '0 14px', cursor: selected.length && !loadingAnalysis ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 800 }}>
          {loadingAnalysis ? (isEn ? 'Analyzing…' : 'Analizando…') : (isEn ? `Analyze selected (${selected.length}/5)` : `Analizar seleccionados (${selected.length}/5)`)}</button>
      </div>
      {upcoming.map((match) => {
        const active = selected.includes(match.id); const blocked = !active && selected.length >= 5
        return <label key={match.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 10, border: `1px solid ${active ? 'rgba(0,200,120,.68)' : '#1a2e4a'}`, background: active ? 'rgba(0,200,120,.08)' : 'rgba(7,13,26,.55)', cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? .55 : 1 }}>
          <input type="checkbox" checked={active} disabled={blocked || loadingAnalysis || loadingMatches} onChange={() => toggle(match.id)} aria-label={`${match.home_team_name} vs ${match.away_team_name}`} />
          <span><span style={{ display: 'block', color: '#f2f6ff', fontSize: 13, fontWeight: 700 }}>{match.home_team_name} <span style={{ color: '#00c878', fontWeight: 400 }}>vs</span> {match.away_team_name}</span><span style={{ display: 'block', color: '#8ba2c0', fontSize: 10, marginTop: 4 }}>{match.league_name} · {new Intl.DateTimeFormat(isEn ? 'en-GB' : 'es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(match.kickoff_at))}</span></span>
          <span style={{ color: active ? '#00c878' : '#64b5f6', fontSize: 10 }}>{active ? (isEn ? 'Selected' : 'Seleccionado') : (isEn ? 'Select' : 'Seleccionar')}</span>
        </label>
      })}
    </div>}

    {error && <p role="alert" style={{ color: '#ff7373', fontSize: 12, margin: '13px 0 0' }}>{error}</p>}
    {results.length > 0 && <div aria-live="polite" style={{ display: 'grid', gap: 9, marginTop: 16, borderTop: '1px solid #1a2e4a', paddingTop: 14 }}>{results.map((result: any) => <article key={result.matchId} style={{ border: '1px solid #24425f', borderRadius: 10, padding: 13, background: 'rgba(7,13,26,.5)' }}>
      <div style={{ color: '#f2f6ff', fontWeight: 700, fontSize: 13 }}>{result.match?.home} vs {result.match?.away}</div>
      {result.status === 'reviewed' && <><div style={{ color: '#00c878', fontSize: 12, marginTop: 7 }}>{result.pick.market} · {Math.round(result.pick.probability * 100)}% · {isEn ? 'odds' : 'cuota'} {Number(result.pick.odds).toFixed(2)} · EV +{Math.round(result.pick.ev * 100)}%</div><p style={{ color: '#b7c7dc', fontSize: 11, lineHeight: 1.55, margin: '8px 0 0' }}>{result.reason}</p><button type="button" onClick={() => router.push(`/${lang}/match/${result.matchId}`)} style={{ marginTop: 9, padding: 0, border: 0, color: '#64b5f6', background: 'transparent', cursor: 'pointer', fontSize: 11 }}>{isEn ? 'Read saved context →' : 'Leer contexto guardado →'}</button></>}
      {result.status !== 'reviewed' && <p style={{ color: '#ffb400', fontSize: 11, margin: '8px 0 0' }}>{result.reason ?? (isEn ? 'Context rejected this match.' : 'El contexto descartó este partido.')}</p>}
    </article>)}</div>}
  </section>
}
