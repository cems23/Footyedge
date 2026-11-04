'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type ModelPick = {
  rank: number
  match_id: string
  market_label: string
  ev: number
  confidence_score: number
  matches?: {
    home_team_name: string
    away_team_name: string
    home_team_logo?: string
    away_team_logo?: string
    league_name: string
    kickoff_at: string
  }
}

function formatKickoff(value: string, lang: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'es-ES', {
    weekday: 'short', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
  }).format(date)
}

/**
 * Local search over matches which passed the model's value thresholds. It does
 * not call a provider while the user types, so contextual data and AI quota are
 * only spent after the user explicitly opens a selected match.
 */
export default function TeamIntelSearch({ picks, lang }: { picks: ModelPick[]; lang: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  const selectedMatches = useMemo(() => {
    const unique = new Map<string, ModelPick>()
    for (const pick of picks) {
      if (!pick.matches || unique.has(pick.match_id)) continue
      unique.set(pick.match_id, pick)
    }
    return Array.from(unique.values()).sort((a, b) => a.rank - b.rank)
  }, [picks])

  const normalized = query.trim().toLocaleLowerCase()
  const results = normalized
    ? selectedMatches.filter((pick) => {
        const match = pick.matches!
        return `${match.home_team_name} ${match.away_team_name} ${match.league_name}`
          .toLocaleLowerCase()
          .includes(normalized)
      })
    : []

  const isEn = lang === 'en'
  const copy = isEn
    ? {
        label: 'TEAM INTEL', title: 'Find a team in model-selected matches',
        hint: 'Search only among matches that passed FootyEdge’s value thresholds.',
        placeholder: 'Search a team or league…', clear: 'Clear team search',
        noResults: 'No selected match matches that search.',
        selected: 'Model-selected', open: 'Open confirmed match data',
        detail: 'Form, confirmed absences and lineups',
        ai: 'Web + AI context is generated only when you choose it in the match view.',
        global: 'Browse all team ratings',
      }
    : {
        label: 'TEAM INTEL', title: 'Busca un equipo entre los partidos seleccionados',
        hint: 'Busca solo entre partidos que superaron los umbrales de valor de FootyEdge.',
        placeholder: 'Busca un equipo o liga…', clear: 'Limpiar búsqueda de equipo',
        noResults: 'Ningún partido seleccionado coincide con esa búsqueda.',
        selected: 'Seleccionado por el modelo', open: 'Abrir datos confirmados',
        detail: 'Forma, bajas confirmadas y alineaciones',
        ai: 'El contexto web + IA solo se genera cuando tú lo eliges en la ficha del partido.',
        global: 'Ver todos los ratings de equipos',
      }

  return (
    <section aria-labelledby="team-intel-title" style={{
      background: 'rgba(13,30,53,0.72)', border: '1px solid rgba(100,181,246,0.34)', borderRadius: 16,
      boxShadow: '0 14px 40px rgba(0,0,0,0.28)', marginBottom: 12, padding: 18,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#64b5f6', fontSize: 10, letterSpacing: '0.18em', marginBottom: 5 }}>{copy.label}</div>
          <h2 id="team-intel-title" style={{ fontFamily: '"Bebas Neue", sans-serif', color: '#f2f6ff', fontSize: 24, letterSpacing: '0.04em', margin: 0, transform: 'skewX(-5deg)', transformOrigin: 'left' }}>{copy.title}</h2>
          <p style={{ color: '#8ba2c0', fontSize: 11, lineHeight: 1.55, margin: '7px 0 0', maxWidth: 620 }}>{copy.hint}</p>
        </div>
        <button type="button" onClick={() => router.push('/elo')} style={{ background: 'transparent', border: '1px solid #2f5d88', color: '#64b5f6', padding: '8px 11px', borderRadius: 8, cursor: 'pointer', fontSize: 11 }}>
          {copy.global}
        </button>
      </div>

      <div style={{ position: 'relative', marginTop: 14, maxWidth: 620 }}>
        <label htmlFor="team-intel-search" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>{copy.title}</label>
        <input
          ref={inputRef}
          id="team-intel-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.placeholder}
          autoComplete="off"
          style={{ width: '100%', boxSizing: 'border-box', background: '#081528', border: '1px solid #1f4265', color: '#f2f6ff', borderRadius: 10, padding: '11px 42px 11px 13px', fontFamily: 'inherit', fontSize: 12 }}
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus() }} aria-label={copy.clear} style={{ position: 'absolute', right: 7, top: 6, width: 30, height: 30, border: 'none', borderRadius: 7, background: 'transparent', color: '#8ba2c0', cursor: 'pointer', fontSize: 18 }}>
            ×
          </button>
        )}
      </div>

      <div aria-live="polite" style={{ marginTop: 12 }}>
        {!normalized && (
          <p style={{ color: '#6b8db5', fontSize: 11, margin: 0 }}>{selectedMatches.length} {isEn ? 'model-selected matches available today.' : 'partidos seleccionados por el modelo disponibles hoy.'}</p>
        )}
        {normalized && results.length === 0 && (
          <div role="status" style={{ color: '#8ba2c0', fontSize: 12, padding: '13px 0' }}>{copy.noResults}</div>
        )}
        {results.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {results.map((pick) => {
              const match = pick.matches!
              const rating = Math.max(1, Math.min(10, Math.round((pick.confidence_score ?? 50) / 10)))
              return (
                <button key={pick.match_id} type="button" onClick={() => router.push(`/${lang}/match/${pick.match_id}`)} style={{ width: '100%', textAlign: 'left', background: 'rgba(7,13,26,0.62)', border: '1px solid #1a2e4a', borderRadius: 10, color: '#f2f6ff', padding: '12px 13px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center' }}>
                  <span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', fontSize: 13, fontWeight: 700 }}>
                      {match.home_team_logo && <img src={match.home_team_logo} width={18} height={18} alt="" />}
                      {match.home_team_name} <span style={{ color: '#00c878', fontWeight: 400 }}>vs</span> {match.away_team_name}
                      {match.away_team_logo && <img src={match.away_team_logo} width={18} height={18} alt="" />}
                    </span>
                    <span style={{ display: 'block', color: '#8ba2c0', fontSize: 10, marginTop: 6 }}>{match.league_name} · {formatKickoff(match.kickoff_at, lang)} · {copy.detail}</span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', color: '#64b5f6', fontSize: 10 }}>{copy.selected}</span>
                    <span style={{ display: 'block', color: '#00c878', fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, letterSpacing: '0.04em' }}>{pick.market_label} · {rating}/10</span>
                    <span style={{ display: 'block', color: '#8ba2c0', fontSize: 10, marginTop: 3 }}>{copy.open} →</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <p style={{ margin: '13px 0 0', color: '#6b8db5', fontSize: 10, lineHeight: 1.55, borderTop: '1px solid #1a2e4a', paddingTop: 10 }}>{copy.ai}</p>
    </section>
  )
}
