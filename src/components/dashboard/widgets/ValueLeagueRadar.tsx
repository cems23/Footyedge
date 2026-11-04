'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

const LEAGUES: Record<number, string> = {
  40: 'Championship', 103: 'Noruega', 106: 'Polonia', 113: 'Suecia',
  144: 'Bélgica', 179: 'Escocia', 203: 'Turquía', 253: 'MLS',
}

type Match = {
  id: string; league_id?: number; league_name: string; home_team_name: string; away_team_name: string
  home_team_logo?: string; away_team_logo?: string; kickoff_at: string; status?: string
}

export default function ValueLeagueRadar({ matches, lang, plan }: { matches: Match[]; lang: string; plan: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<any[]>([])
  const isEn = lang === 'en'
  const isAllowed = plan === 'pro' || plan === 'elite'
  const upcoming = useMemo(() => matches.filter(match => LEAGUES[match.league_id ?? -1] && !['FT', 'AET', 'PEN', 'PST', 'CANC', 'SUSP', 'ABD'].includes(match.status ?? '') && new Date(match.kickoff_at).getTime() > Date.now()), [matches])

  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 5 ? [...current, id] : current)
  const analyze = async () => {
    if (!selected.length || loading) return
    setLoading(true); setError(''); setResults([])
    try {
      const response = await fetch('/api/radar/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ matchIds: selected }) })
      const data = await response.json()
      if (!response.ok) {
        if (data.error === 'RADAR_PRO_REQUIRED') { router.push(`/${lang}/pricing?reason=radar`); return }
        throw new Error(data.error ?? 'No se pudo analizar la selección.')
      }
      setResults(data.results ?? [])
    } catch (err: any) { setError(err.message ?? 'No se pudo analizar la selección.') }
    finally { setLoading(false) }
  }

  return <section aria-labelledby="value-league-radar" style={{ background: 'rgba(13,30,53,.72)', border: '1px solid rgba(100,181,246,.34)', borderRadius: 16, boxShadow: '0 14px 40px rgba(0,0,0,.28)', padding: 18, marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'start' }}>
      <div>
        <div style={{ color: '#64b5f6', fontSize: 10, letterSpacing: '.18em', marginBottom: 5 }}>VALUE LEAGUE RADAR</div>
        <h2 id="value-league-radar" style={{ margin: 0, fontFamily: '"Bebas Neue", sans-serif', fontSize: 25, color: '#f2f6ff', letterSpacing: '.04em' }}>{isEn ? 'Choose matches to investigate' : 'Elige los partidos que quieres investigar'}</h2>
        <p style={{ color: '#8ba2c0', fontSize: 11, lineHeight: 1.55, maxWidth: 660, margin: '7px 0 0' }}>{isEn ? 'Focus on less efficient leagues. Select up to five upcoming matches; FootyEdge checks confirmed absences, lineups, current news and available odds before suggesting a pick.' : 'Busca valor en ligas menos eficientes. Selecciona hasta cinco partidos próximos; FootyEdge revisará bajas confirmadas, alineaciones, noticias actuales y cuotas disponibles antes de proponerte un pick.'}</p>
      </div>
      <button type="button" disabled={!selected.length || loading} onClick={analyze} style={{ minWidth: 178, background: selected.length && !loading ? '#00c878' : '#254159', color: selected.length && !loading ? '#061019' : '#86a2ba', border: 'none', borderRadius: 9, padding: '11px 14px', cursor: selected.length && !loading ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 800 }}>
        {loading ? (isEn ? 'Analyzing…' : 'Analizando…') : (isEn ? `Analyze selected (${selected.length}/5)` : `Analizar seleccionados (${selected.length}/5)`)}
      </button>
    </div>
    {!isAllowed && <p style={{ color: '#ffb400', fontSize: 11, margin: '13px 0 0' }}>{isEn ? 'Available with Pro or Elite.' : 'Disponible con Pro o Elite.'}</p>}
    {upcoming.length === 0 ? <p style={{ color: '#8ba2c0', fontSize: 12, padding: '18px 0 2px', margin: 0 }}>{isEn ? 'No upcoming matches in the selected value leagues today.' : 'No hay partidos próximos de las ligas de valor seleccionadas hoy.'}</p> : <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
      {upcoming.map(match => {
        const active = selected.includes(match.id); const blocked = !active && selected.length >= 5
        return <label key={match.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 10, border: `1px solid ${active ? 'rgba(0,200,120,.68)' : '#1a2e4a'}`, background: active ? 'rgba(0,200,120,.08)' : 'rgba(7,13,26,.55)', cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? .55 : 1 }}>
          <input type="checkbox" checked={active} disabled={blocked || loading} onChange={() => toggle(match.id)} aria-label={`${match.home_team_name} vs ${match.away_team_name}`} />
          <span><span style={{ display: 'block', color: '#f2f6ff', fontSize: 13, fontWeight: 700 }}>{match.home_team_name} <span style={{ color: '#00c878', fontWeight: 400 }}>vs</span> {match.away_team_name}</span><span style={{ display: 'block', color: '#8ba2c0', fontSize: 10, marginTop: 4 }}>{LEAGUES[match.league_id ?? -1] ?? match.league_name} · {new Intl.DateTimeFormat(isEn ? 'en-GB' : 'es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(match.kickoff_at))}</span></span>
          <span style={{ color: active ? '#00c878' : '#64b5f6', fontSize: 10 }}>{active ? (isEn ? 'Selected' : 'Seleccionado') : (isEn ? 'Select' : 'Seleccionar')}</span>
        </label>
      })}
    </div>}
    {error && <p role="alert" style={{ color: '#ff7373', fontSize: 12, margin: '13px 0 0' }}>{error}</p>}
    {results.length > 0 && <div aria-live="polite" style={{ display: 'grid', gap: 9, marginTop: 16, borderTop: '1px solid #1a2e4a', paddingTop: 14 }}>{results.map((result: any) => <article key={result.matchId} style={{ border: '1px solid #24425f', borderRadius: 10, padding: 13, background: 'rgba(7,13,26,.5)' }}>
      <div style={{ color: '#f2f6ff', fontWeight: 700, fontSize: 13 }}>{result.match?.home} vs {result.match?.away}</div>
      {result.status === 'reviewed' && <><div style={{ color: '#00c878', fontSize: 12, marginTop: 7 }}>{result.pick.market} · {Math.round(result.pick.probability * 100)}% · cuota {Number(result.pick.odds).toFixed(2)} · EV +{Math.round(result.pick.ev * 100)}%</div><p style={{ color: '#b7c7dc', fontSize: 11, lineHeight: 1.55, margin: '8px 0 0' }}>{result.reason}</p><button type="button" onClick={() => router.push(`/${lang}/match/${result.matchId}`)} style={{ marginTop: 9, padding: 0, border: 0, color: '#64b5f6', background: 'transparent', cursor: 'pointer', fontSize: 11 }}>{isEn ? 'Read saved context →' : 'Leer contexto guardado →'}</button></>}
      {result.status !== 'reviewed' && <p style={{ color: '#ffb400', fontSize: 11, margin: '8px 0 0' }}>{result.reason ?? (isEn ? 'Context rejected this match.' : 'El contexto descartó este partido.')}</p>}
    </article>)}</div>}
  </section>
}
