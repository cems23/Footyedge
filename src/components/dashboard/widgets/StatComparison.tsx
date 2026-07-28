'use client'
import { useEffect, useRef } from 'react'
import { animate } from 'animejs'

export function StatComparison({ label, homeVal, awayVal, homeColor = '#00c878', awayColor = '#ff4d4d' }: { label: string; homeVal: number; awayVal: number; homeColor?: string; awayColor?: string }) {
  const homeBarRef = useRef<HTMLDivElement>(null)
  const awayBarRef = useRef<HTMLDivElement>(null)

  const max = Math.max(homeVal, awayVal, 0.0001)
  const homePct = (homeVal / max) * 100
  const awayPct = (awayVal / max) * 100

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (homeBarRef.current) homeBarRef.current.style.width = `${homePct}%`
      if (awayBarRef.current) awayBarRef.current.style.width = `${awayPct}%`
      return
    }
    if (homeBarRef.current) {
      homeBarRef.current.style.width = '0%'
      animate(homeBarRef.current, { width: `${homePct}%`, duration: 900, ease: 'outCubic' })
    }
    if (awayBarRef.current) {
      awayBarRef.current.style.width = '0%'
      animate(awayBarRef.current, { width: `${awayPct}%`, duration: 900, ease: 'outCubic' })
    }
  }, [homeVal, awayVal])

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#8ba2c0' }}>
        <span style={{ color: homeColor, fontWeight: 700 }}>{homeVal}</span>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ color: awayColor, fontWeight: 700 }}>{awayVal}</span>
      </div>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#0f1e32' }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <div ref={homeBarRef} style={{ width: '0%', background: homeColor, borderRadius: '4px 0 0 4px' }} />
        </div>
        <div style={{ width: 1, background: '#1a2e4a' }} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
          <div ref={awayBarRef} style={{ width: '0%', background: awayColor, borderRadius: '0 4px 4px 0' }} />
        </div>
      </div>
    </div>
  )
}
