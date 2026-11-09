"use client"

import { useState } from 'react'
import type { MomentumEvent, MomentumPoint, PressureStats } from '@/lib/match/momentum'

type LiveEvent = MomentumEvent & { icon: string }

type MomentumResponse = {
  available: boolean
  status: string
  minute: number | null
  homeGoals: number
  awayGoals: number
  homeTeam: string
  awayTeam: string
  reason?: string
  eventMomentum?: MomentumPoint[]
  events?: LiveEvent[]
  stats?: { home: PressureStats; away: PressureStats }
  pressure?: { home: number; away: number; available: boolean }
  cached?: boolean
  cachedAt?: string
}

const BG = '#070d1a'
const CARD = '#0d1e35'
const BORDER = '#1a2e4a'
const GREEN = '#00c878'
const BLUE = '#64b5f6'
const GOLD = '#ffb400'

function statValue(value: number | null | undefined, suffix = '') {
  return value === null || value === undefined ? '—' : `${value}${suffix}`
}

function chartCoordinates(points: MomentumPoint[], axisEnd: number) {
  const width = 720
  const left = 42
  const right = 16
  const middle = 104
  const amplitude = 78
  const x = (minute: number) => left + (Math.min(Math.max(minute, 0), axisEnd) / axisEnd) * (width - left - right)
  const y = (value: number) => middle - (Math.max(-100, Math.min(100, value)) / 100) * amplitude
  const all = points.length ? points : [{ minute: 0, value: 0 }, { minute: axisEnd, value: 0 }]
  const withEnd = all[all.length - 1].minute < axisEnd ? [...all, { minute: axisEnd, value: all[all.length - 1].value }] : all
  const toPath = (transform: (value: number) => number) => withEnd.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.minute)} ${y(transform(point.value))}`).join(' ')
  const toArea = (transform: (value: number) => number) => {
    const line = toPath(transform)
    return `${line} L ${x(withEnd[withEnd.length - 1].minute)} ${middle} L ${x(withEnd[0].minute)} ${middle} Z`
  }
  return { width, left, right, middle, x, y, all: withEnd, homeLine: toPath(value => Math.max(value, 0)), awayLine: toPath(value => Math.min(value, 0)), homeArea: toArea(value => Math.max(value, 0)), awayArea: toArea(value => Math.min(value, 0)) }
}

export function GameMomentum({ matchId, lang, homeTeam, awayTeam }: { matchId: string; lang: string; homeTeam: string; awayTeam: string }) {
  const [data, setData] = useState<MomentumResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const spanish = lang !== 'en'

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/match/${matchId}/momentum`)
      const body = await response.json()
      if (!response.ok) throw new Error(body.error === 'MOMENTUM_PRO_REQUIRED'
        ? (spanish ? 'Esta función requiere el plan Pro.' : 'This feature requires the Pro plan.')
        : (body.error ?? (spanish ? 'No se pudo cargar el pulso.' : 'Could not load the pulse.')))
      setData(body)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (spanish ? 'No se pudo cargar el pulso.' : 'Could not load the pulse.'))
    } finally {
      setLoading(false)
    }
  }

  const buttonLabel = data ? (spanish ? 'Actualizar pulso' : 'Refresh pulse') : (spanish ? 'Cargar pulso' : 'Load pulse')
  const minute = data?.minute ?? 0
  const axisEnd = Math.max(90, minute > 90 ? 120 : 90)
  const chart = chartCoordinates(data?.eventMomentum ?? [], axisEnd)
  const recentEvents = (data?.events ?? []).slice(-8)
  const freshAt = data?.cachedAt ? new Date(data.cachedAt).toLocaleTimeString(spanish ? 'es-ES' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <section aria-label={spanish ? 'Pulso del partido' : 'Match pulse'} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px', borderBottom: `1px solid ${BORDER}`, background: 'linear-gradient(110deg, rgba(0,200,120,0.10), rgba(13,30,53,0) 52%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: GREEN, fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>{spanish ? '// LIVE MATCH PULSE' : '// LIVE MATCH PULSE'}</div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontWeight: 400, letterSpacing: 1, fontSize: 27, margin: '5px 0 0', color: '#e8eaf6' }}>{spanish ? 'Game momentum' : 'Game momentum'}</h2>
        </div>
        <button type="button" onClick={load} disabled={loading} aria-busy={loading} style={{ background: loading ? '#173c35' : GREEN, border: 'none', borderRadius: 8, color: BG, fontFamily: 'inherit', fontWeight: 700, padding: '10px 14px', cursor: loading ? 'wait' : 'pointer', minWidth: 150 }}>
          {loading ? (spanish ? 'Cargando…' : 'Loading…') : buttonLabel}
        </button>
      </div>

      {!data && !loading && !error && (
        <div style={{ padding: 24, color: '#8ba1bc', fontSize: 12, lineHeight: 1.7 }}>
          {spanish
            ? 'Carga bajo demanda los eventos confirmados y la presión estadística del partido. El resultado se comparte durante cinco minutos para proteger la cuota de API-Football.'
            : 'Load confirmed match events and statistical pressure on demand. The result is shared for five minutes to protect the API-Football quota.'}
        </div>
      )}

      {loading && <div role="status" style={{ minHeight: 300, display: 'grid', placeItems: 'center', color: '#8ba1bc', fontSize: 12 }}>{spanish ? 'Consultando datos en directo…' : 'Fetching live data…'}</div>}

      {!loading && error && (
        <div role="alert" style={{ padding: 24, color: '#ff9b9b', fontSize: 12 }}>
          {error}
          <button type="button" onClick={load} style={{ display: 'block', marginTop: 12, color: GREEN, background: 'transparent', border: `1px solid ${GREEN}`, borderRadius: 6, padding: '7px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>{spanish ? 'Reintentar' : 'Retry'}</button>
        </div>
      )}

      {!loading && data && !data.available && (
        <div style={{ padding: 24 }}>
          <div style={{ color: '#e8eaf6', fontWeight: 700, marginBottom: 8 }}>{homeTeam} — {awayTeam}</div>
          <p style={{ color: '#8ba1bc', fontSize: 12, margin: 0 }}>{data.reason ?? (spanish ? 'El pulso no está disponible todavía.' : 'The pulse is not available yet.')}</p>
        </div>
      )}

      {!loading && data?.available && (
        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 12, paddingBottom: 18 }}>
            <div style={{ textAlign: 'right', color: BLUE, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.homeTeam}</div>
            <div style={{ color: '#f2f6ff', fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, letterSpacing: 2 }}>{data.homeGoals} - {data.awayGoals}</div>
            <div style={{ color: GOLD, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.awayTeam}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6, color: '#8ba1bc', fontSize: 10, letterSpacing: 1 }}>
            <span>{data.status === 'FT' ? (spanish ? 'FINAL' : 'FINAL') : `${spanish ? 'EN JUEGO' : 'LIVE'} · ${minute}'`}</span>
            <span>{spanish ? 'IMPACTO DE EVENTOS' : 'EVENT IMPACT'}</span>
          </div>

          <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <svg role="img" aria-label={spanish ? 'Curva de impacto de eventos del partido' : 'Match event impact curve'} viewBox={`0 0 ${chart.width} 214`} width="100%" style={{ display: 'block', minWidth: 520, maxHeight: 250 }}>
              <defs>
                <linearGradient id="momentum-home" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={BLUE} stopOpacity=".48" /><stop offset="1" stopColor={BLUE} stopOpacity="0" /></linearGradient>
                <linearGradient id="momentum-away" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={GOLD} stopOpacity="0" /><stop offset="1" stopColor={GOLD} stopOpacity=".38" /></linearGradient>
              </defs>
              {[26, 65, 104, 143, 182].map((y, index) => <line key={y} x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} stroke={index === 2 ? '#55708f' : '#1a2e4a'} strokeWidth={index === 2 ? 1.2 : 1} />)}
              {[0, 15, 30, 45, 60, 75, 90].filter(value => value <= axisEnd).map(value => <g key={value}><line x1={chart.x(value)} x2={chart.x(value)} y1={26} y2={182} stroke="#1a2e4a" strokeWidth="1" /><text x={chart.x(value)} y="202" fill="#6b8db5" fontSize="10" textAnchor="middle">{value}'</text></g>)}
              <text x="8" y="30" fill="#6b8db5" fontSize="10">+100</text><text x="17" y="108" fill="#6b8db5" fontSize="10">0</text><text x="8" y="186" fill="#6b8db5" fontSize="10">-100</text>
              <path d={chart.homeArea} fill="url(#momentum-home)" /><path d={chart.awayArea} fill="url(#momentum-away)" />
              <path d={chart.homeLine} fill="none" stroke={BLUE} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              <path d={chart.awayLine} fill="none" stroke={GOLD} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {chart.all.slice(1).map((point, index) => <circle key={`${point.minute}-${index}`} cx={chart.x(point.minute)} cy={chart.y(point.value)} r="3.5" fill={point.value >= 0 ? BLUE : GOLD} />)}
            </svg>
          </div>
          <p style={{ color: '#6b8db5', fontSize: 10, margin: '2px 0 18px', lineHeight: 1.6 }}>{spanish ? 'La curva refleja el impacto de goles, tarjetas y VAR confirmados; no es una métrica de posesión minuto a minuto.' : 'The curve reflects confirmed goal, card and VAR impact; it is not minute-by-minute possession.'}</p>

          <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '12px 0', marginBottom: 18 }}>
            <div style={{ color: '#6b8db5', fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>{spanish ? 'LÍNEA DE EVENTOS' : 'EVENT TIMELINE'}</div>
            {recentEvents.length ? <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 }}>{recentEvents.map((event, index) => <div key={`${event.minute}-${event.type}-${index}`} title={`${event.minute}' · ${event.detail}`} style={{ flex: '0 0 auto', minWidth: 54, textAlign: 'center', color: event.team === 'home' ? BLUE : event.team === 'away' ? GOLD : '#8ba1bc' }}><div style={{ fontSize: 17 }}>{event.icon}</div><div style={{ fontSize: 10, marginTop: 3 }}>{event.minute}'</div></div>)}</div> : <div style={{ color: '#8ba1bc', fontSize: 11 }}>{spanish ? 'Sin eventos relevantes todavía.' : 'No relevant events yet.'}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end', marginBottom: 14 }}>
            <div style={{ textAlign: 'right' }}><div style={{ color: BLUE, fontSize: 21, fontWeight: 700 }}>{data.pressure?.home ?? 50}%</div><div style={{ color: '#6b8db5', fontSize: 10 }}>{data.homeTeam}</div></div>
            <div style={{ color: '#8ba1bc', fontSize: 10, paddingBottom: 4 }}>{spanish ? 'PRESIÓN ACTUAL' : 'CURRENT PRESSURE'}</div>
            <div><div style={{ color: GOLD, fontSize: 21, fontWeight: 700 }}>{data.pressure?.away ?? 50}%</div><div style={{ color: '#6b8db5', fontSize: 10 }}>{data.awayTeam}</div></div>
          </div>
          <div aria-label={spanish ? 'Comparación de presión actual' : 'Current pressure comparison'} style={{ height: 7, borderRadius: 99, overflow: 'hidden', display: 'flex', background: '#091426', marginBottom: 16 }}><div style={{ width: `${data.pressure?.home ?? 50}%`, background: BLUE }} /><div style={{ width: `${data.pressure?.away ?? 50}%`, background: GOLD }} /></div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {[
              { label: spanish ? 'Posesión' : 'Possession', home: statValue(data.stats?.home.possession, '%'), away: statValue(data.stats?.away.possession, '%') },
              { label: spanish ? 'Tiros a puerta' : 'Shots on target', home: statValue(data.stats?.home.shotsOn), away: statValue(data.stats?.away.shotsOn) },
              { label: spanish ? 'Córners' : 'Corners', home: statValue(data.stats?.home.corners), away: statValue(data.stats?.away.corners) },
            ].map(row => <div key={row.label} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10, textAlign: 'center' }}><div style={{ color: '#6b8db5', fontSize: 9, minHeight: 22 }}>{row.label}</div><div style={{ marginTop: 5, display: 'flex', justifyContent: 'space-between', gap: 5, fontSize: 13, fontWeight: 700 }}><span style={{ color: BLUE }}>{row.home}</span><span style={{ color: GOLD }}>{row.away}</span></div></div>)}
          </div>
          <div style={{ color: '#526b88', fontSize: 10, marginTop: 14 }}>{freshAt ? `${spanish ? 'Actualizado' : 'Updated'} ${freshAt}${data.cached ? ` · ${spanish ? 'resultado cacheado' : 'cached result'}` : ''}` : ''}</div>
        </div>
      )}
    </section>
  )
}
