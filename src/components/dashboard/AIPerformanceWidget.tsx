'use client'

import { useEffect, useRef, useState } from 'react'
import { createScope, animate, stagger } from 'animejs'

type MarketStat = { market: string; total: number; wins: number; winRate: number; roi: number; profit: number }
type Metrics = {
  total: number; wins: number; losses: number; winRate: number; roi: number; profit: number
  byMarket: MarketStat[]
  last10: ('win' | 'loss')[]
}

const MARKET_LABELS: Record<string, { es: string; en: string }> = {
  btts: { es: 'BTTS', en: 'BTTS' },
  over25: { es: 'Over 2.5', en: 'Over 2.5' },
  over15: { es: 'Over 1.5', en: 'Over 1.5' },
  home: { es: 'Local', en: 'Home' },
  away: { es: 'Visitante', en: 'Away' },
  draw: { es: 'Empate', en: 'Draw' },
}

function heatColor(winRate: number) {
  if (winRate >= 60) return '#00c878'
  if (winRate >= 45) return '#ffb400'
  return '#5a6b85'
}

export default function AIPerformanceWidget({ lang }: { lang: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/analytics/model')
      .then(r => r.json())
      .then(d => { if (d.hasData) setMetrics(d.metrics) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!metrics || !rootRef.current) return

    const scope = createScope({ root: rootRef }).add(() => {
      const globalCounter = { val: 0 }
      animate(globalCounter, {
        val: metrics.winRate,
        duration: 1400,
        ease: 'outExpo',
        onUpdate: () => {
          const el = rootRef.current?.querySelector('[data-counter="global"]')
          if (el) el.textContent = globalCounter.val.toFixed(1) + '%'
        },
      })

      metrics.byMarket.forEach((m, i) => {
        const c = { val: 0 }
        animate(c, {
          val: m.winRate,
          duration: 1200,
          delay: 150 + i * 80,
          ease: 'outExpo',
          onUpdate: () => {
            const el = rootRef.current?.querySelector(`[data-counter="${m.market}"]`)
            if (el) el.textContent = c.val.toFixed(1) + '%'
          },
        })
        animate(`[data-bar="${m.market}"]`, {
          width: `${Math.min(100, m.winRate)}%`,
          duration: 1200,
          delay: 150 + i * 80,
          ease: 'outExpo',
        })
      })

      animate('[data-dot]', {
        scale: [{ to: 0 }, { to: 1 }],
        opacity: [{ to: 0 }, { to: 1 }],
        delay: stagger(60, { start: 400 }),
        duration: 380,
        ease: 'outBack',
      })
    })

    return () => scope.revert()
  }, [metrics])

  if (!metrics) return null

  const T = {
    title: lang === 'en' ? '// AI MODEL PERFORMANCE' : '// RENDIMIENTO DEL MODELO',
    subtitle: lang === 'en' ? `Based on ${metrics.total} settled bets` : `Basado en ${metrics.total} apuestas liquidadas`,
    last10: lang === 'en' ? 'Last 10 predictions' : 'Últimas 10 predicciones',
  }

  return (
    <div ref={rootRef} style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 16, padding: 20, marginBottom: 12, boxShadow: '0 14px 40px rgba(0,0,0,0.3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#00c878', letterSpacing: '0.04em' }}>{T.title}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#4a6785' }}>{T.subtitle}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 16 }}>
        {metrics.byMarket.map(m => {
          const color = heatColor(m.winRate)
          const label = MARKET_LABELS[m.market]?.[lang === 'en' ? 'en' : 'es'] ?? m.market
          return (
            <div key={m.market}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8ba2c0', marginBottom: 4 }}>
                <span>{label}</span>
                <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 16, color }} data-counter={m.market}>0.0%</span>
              </div>
              <div style={{ height: 3, background: '#0d1e35', borderRadius: 2, overflow: 'hidden' }}>
                <div data-bar={m.market} style={{ height: '100%', width: 0, background: color, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 9, color: '#4a6785', marginTop: 3 }}>{m.total} {lang === 'en' ? 'bets' : 'apuestas'}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #1a2e4a', paddingTop: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#8ba2c0' }}>{T.last10}:</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {metrics.last10.map((r, i) => (
            <span key={i} data-dot style={{ width: 10, height: 10, borderRadius: '50%', background: r === 'win' ? '#00c878' : '#3a4a63', opacity: 0, display: 'inline-block' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
