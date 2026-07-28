'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { animate, stagger } from 'animejs'

type PlayerStats = {
  rating: number | null
  minutes: number | null
  goals: number
  assists: number
  shotsTotal: number | null
  passesTotal: number | null
  passesAccuracy: number | null
  photo: string | null
} | null

type LineupPlayer = {
  id: number
  name: string
  number: number
  pos: string
  grid: string | null
  stats: PlayerStats
}

type Lineup = {
  formation: string
  startXI: LineupPlayer[]
} | null

function computePositions(startXI: LineupPlayer[], isAway: boolean) {
  const withGrid = startXI.filter(p => p.grid)
  const rows = Array.from(new Set(withGrid.map(p => parseInt(p.grid!.split(':')[0], 10)))).sort((a, b) => a - b)
  const totalRows = Math.max(1, rows.length - 1)

  return startXI.map((p) => {
    if (!p.grid) return { ...p, top: isAway ? 30 : 70, left: 50 }
    const [rowStr, colStr] = p.grid.split(':')
    const row = parseInt(rowStr, 10)
    const col = parseInt(colStr, 10)
    const sameRow = withGrid.filter(x => parseInt(x.grid!.split(':')[0], 10) === row)
    const rowIndex = rows.indexOf(row)

    // cada equipo confinado a su propia mitad, con margen de respiro cerca del medio campo
    let top: number
    if (!isAway) {
      // ataca hacia arriba: arquero cerca de 90, delanteros cerca de 54
      top = 90 - (rowIndex / totalRows) * 36
    } else {
      // ataca hacia abajo: arquero cerca de 10, delanteros cerca de 46
      top = 10 + (rowIndex / totalRows) * 36
    }

    const left = (col / (sameRow.length + 1)) * 100

    return { ...p, top, left, row: rowIndex }
  })
}

function scanlineKeyframes() {
  return `
    @keyframes pp-scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
    @keyframes pp-glow-green { 0%, 100% { box-shadow: 0 0 6px 2px rgba(0,255,135,0.35); } 50% { box-shadow: 0 0 14px 5px rgba(0,255,135,0.7); } }
    @keyframes pp-glow-red { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
    @keyframes pp-flow { to { stroke-dashoffset: -20; } }
    @media (prefers-reduced-motion: reduce) {
      .pp-glow-green, .pp-glow-red, .pp-scanline, .pp-flow-line { animation: none !important; }
    }
  `
}

function RatingBadge({ rating }: { rating: number | null }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (rating == null || !ref.current) return
    const obj = { v: 0 }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ref.current.innerText = rating.toFixed(1)
      return
    }
    animate(obj, {
      v: rating,
      duration: 500,
      ease: 'outCubic',
      onUpdate: () => { if (ref.current) ref.current.innerText = obj.v.toFixed(1) },
    })
  }, [rating])

  if (rating == null) return null
  const cls = rating >= 7.5 ? 'pp-glow-green' : rating < 6.0 ? 'pp-glow-red' : ''
  const color = rating >= 7.5 ? '#00ff87' : rating < 6.0 ? '#ff4d4d' : '#f6b93b'
  return (
    <span className={cls} ref={ref} style={{ fontSize: 11, fontWeight: 700, color, borderRadius: 999, padding: '1px 5px', background: 'rgba(7,13,26,0.7)' }}>
      0.0
    </span>
  )
}

function PlayerDot({ p, color, onClick, delay, dotRef }: { p: any; color: string; onClick: () => void; delay: number; dotRef: (el: HTMLDivElement | null) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const rippleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.opacity = '1'
      el.style.transform = 'translate(-50%, -50%)'
      return
    }
    animate(el, {
      translateY: [-120, 0],
      opacity: [0, 1],
      duration: 550,
      delay,
      ease: 'outBounce',
      onComplete: () => {
        if (rippleRef.current) {
          animate(rippleRef.current, {
            scale: [0.3, 2.2],
            opacity: [0.5, 0],
            duration: 650,
            ease: 'outCubic',
          })
        }
      },
    })
  }, [delay])

  return (
    <div
      ref={(el) => { (wrapRef as any).current = el; dotRef(el) }}
      style={{ position: 'absolute', top: `${p.top}%`, left: `${p.left}%`, transform: 'translate(-50%, -50%)', opacity: 0 }}
    >
      <div ref={rippleRef} style={{ position: 'absolute', top: '50%', left: '50%', width: 30, height: 30, marginTop: -15, marginLeft: -15, borderRadius: '50%', border: '2px solid rgba(0,255,135,0.7)', transform: 'scale(0.3)', opacity: 0, pointerEvents: 'none' }} />
      <button
        onClick={onClick}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: '50%', background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#070d1a',
          border: '2px solid rgba(255,255,255,0.4)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {p.number}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#f2f6ff', background: 'rgba(7,13,26,0.85)', padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p.name?.split(' ').slice(-1)[0]}
        </span>
        <RatingBadge rating={p.stats?.rating ?? null} />
      </button>
    </div>
  )
}

function SynergyLines({ positions }: { positions: any[] }) {
  const withStats = positions.filter(p => p.stats?.passesAccuracy != null)
  const forwards = withStats.filter(p => p.pos === 'F' || p.pos === 'M').sort((a, b) => a.row - b.row)
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = []

  // conectar cada delantero con el mediocampista de mejor precision de pases mas cercano en fila anterior
  for (const fwd of forwards) {
    const candidates = withStats.filter(p => p.row < fwd.row)
    if (!candidates.length) continue
    const best = candidates.reduce((a, b) => (b.stats.passesAccuracy > a.stats.passesAccuracy ? b : a))
    lines.push({ x1: fwd.left, y1: fwd.top, x2: best.left, y2: best.top })
  }

  if (!lines.length) return null

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 100 100" preserveAspectRatio="none">
      {lines.map((l, i) => (
        <line key={i} className="pp-flow-line" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="rgba(0,255,135,0.5)" strokeWidth="0.3" strokeDasharray="2 2"
          style={{ animation: 'pp-flow 1.2s linear infinite' }} />
      ))}
    </svg>
  )
}

export function PlayerPitch({
  homeLineup, awayLineup, homeName, awayName, homeColor = '#00bfff', awayColor = '#ffd700', lang = 'en', playerStatsAvailable,
}: {
  homeLineup: Lineup; awayLineup: Lineup; homeName: string; awayName: string
  homeColor?: string; awayColor?: string; lang?: string; playerStatsAvailable?: boolean
}) {
  const [selected, setSelected] = useState<any>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  const homePositioned = useMemo(() => homeLineup ? computePositions(homeLineup.startXI, false) : [], [homeLineup])
  const awayPositioned = useMemo(() => awayLineup ? computePositions(awayLineup.startXI, true) : [], [awayLineup])
  const allPositions = useMemo(() => [...homePositioned, ...awayPositioned], [homePositioned, awayPositioned])

  useEffect(() => {
    if (!selected || !cardRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cardRef.current.style.transform = 'translateX(0)'
      cardRef.current.style.opacity = '1'
      return
    }
    animate(cardRef.current, {
      translateX: [340, 0],
      duration: 500,
      ease: 'outExpo',
    })
    if (statsRef.current) {
      const rows = statsRef.current.querySelectorAll('.pp-stat-row')
      animate(rows, { opacity: [0, 1], translateY: [8, 0], duration: 300, delay: stagger(60, { start: 200 }), ease: 'outQuad' })
    }
  }, [selected])

  return (
    <div style={{ position: 'relative' }}>
      <style dangerouslySetInnerHTML={{ __html: scanlineKeyframes() }} />
      <div style={{ fontSize: 11, color: '#8ba2c0', marginBottom: 10, textAlign: 'center', background: 'rgba(139,162,192,0.08)', border: '1px solid #1a2e4a', borderRadius: 8, padding: '6px 10px' }}>
        ℹ️ {lang === 'en'
          ? 'Player ratings are more precise for medium and large leagues with fuller data coverage.'
          : 'Los ratings de jugador son más precisos en ligas medianas y grandes con mayor cobertura de datos.'}
      </div>

      <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
        <div style={{ position: 'relative', flex: 1, aspectRatio: '3 / 4', background: '#0a1626', border: '1px solid #1a2e4a', borderRadius: 12, overflow: 'hidden', transition: 'opacity 0.3s ease', opacity: selected ? 0.3 : 1 }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <rect x="2" y="2" width="96" height="96" fill="none" stroke="rgba(0,200,120,0.2)" strokeWidth="0.3" />
            <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(0,200,120,0.2)" strokeWidth="0.3" />
            <circle cx="50" cy="50" r="9" fill="none" stroke="rgba(0,200,120,0.2)" strokeWidth="0.3" />
            <rect x="25" y="2" width="50" height="14" fill="none" stroke="rgba(0,200,120,0.2)" strokeWidth="0.3" />
            <rect x="25" y="84" width="50" height="14" fill="none" stroke="rgba(0,200,120,0.2)" strokeWidth="0.3" />
          </svg>

          <SynergyLines positions={allPositions} />

          {homePositioned.map((p, i) => (
            <PlayerDot key={`h${i}`} p={p} color={homeColor} delay={i * 50} dotRef={() => {}} onClick={() => setSelected({ ...p, side: homeName })} />
          ))}
          {awayPositioned.map((p, i) => (
            <PlayerDot key={`a${i}`} p={p} color={awayColor} delay={(homePositioned.length + i) * 50} dotRef={() => {}} onClick={() => setSelected({ ...p, side: awayName })} />
          ))}
        </div>

        {selected && (
          <div
            ref={cardRef}
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 220,
              background: 'rgba(13,24,41,0.72)', backdropFilter: 'blur(14px)',
              border: '1px solid rgba(0,255,135,0.25)', borderRadius: 14, padding: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
            }}
          >
            <button onClick={() => setSelected(null)} style={{ float: 'right', background: 'none', border: 'none', color: '#8ba2c0', cursor: 'pointer', fontSize: 14 }}>✕</button>

            {selected.stats?.photo && (
              <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 12px', border: '2px solid rgba(0,255,135,0.4)' }}>
                <img src={selected.stats.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e: any) => e.target.style.display = 'none'} />
                <div className="pp-scanline" style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, rgba(0,255,135,0.35) 0px, transparent 2px, transparent 4px)', animation: 'pp-scanline 1.4s linear infinite' }} />
              </div>
            )}

            <div style={{ fontSize: 10, color: '#4a6785', marginBottom: 4, textAlign: 'center' }}>{selected.side}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f2f6ff', marginBottom: 2, textAlign: 'center' }}>{selected.name}</div>
            <div style={{ fontSize: 11, color: '#8ba2c0', marginBottom: 14, textAlign: 'center' }}>#{selected.number} · {selected.pos}</div>

            {selected.stats ? (
              <div ref={statsRef} style={{ display: 'grid', gap: 8 }}>
                {selected.stats.rating != null && (
                  <div className="pp-stat-row" style={{ opacity: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#8ba2c0' }}>Rating</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: selected.stats.rating >= 7.5 ? '#00ff87' : selected.stats.rating < 6.0 ? '#ff4d4d' : '#f6b93b' }}>{selected.stats.rating.toFixed(1)}</span>
                  </div>
                )}
                <div className="pp-stat-row" style={{ opacity: 0, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#8ba2c0' }}>{lang === 'en' ? 'Goals' : 'Goles'}</span>
                  <span style={{ fontSize: 13, color: '#f2f6ff' }}>{selected.stats.goals}</span>
                </div>
                <div className="pp-stat-row" style={{ opacity: 0, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#8ba2c0' }}>{lang === 'en' ? 'Assists' : 'Asistencias'}</span>
                  <span style={{ fontSize: 13, color: '#f2f6ff' }}>{selected.stats.assists}</span>
                </div>
                {selected.stats.shotsTotal != null && (
                  <div className="pp-stat-row" style={{ opacity: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#8ba2c0' }}>{lang === 'en' ? 'Shots' : 'Tiros'}</span>
                    <span style={{ fontSize: 13, color: '#f2f6ff' }}>{selected.stats.shotsTotal}</span>
                  </div>
                )}
                {selected.stats.minutes != null && (
                  <div className="pp-stat-row" style={{ opacity: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#8ba2c0' }}>{lang === 'en' ? 'Minutes' : 'Minutos'}</span>
                    <span style={{ fontSize: 13, color: '#f2f6ff' }}>{selected.stats.minutes}'</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#4a6785', textAlign: 'center' }}>
                {playerStatsAvailable === false
                  ? (lang === 'en' ? 'No stats yet — check back after kickoff.' : 'Sin stats aún — vuelve después del inicio.')
                  : (lang === 'en' ? 'No individual stats for this player.' : 'Sin stats individuales para este jugador.')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
