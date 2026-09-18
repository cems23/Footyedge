'use client'

import { useEffect, useRef, useState } from 'react'
import { createScope, animate, stagger } from 'animejs'

type MarketStat = { market: string; total: number; wins: number; winRate: number; roi: number; profit: number }
type Metrics = {
  total: number; wins: number; losses: number; winRate: number; roi: number; profit: number
  byMarket: MarketStat[]
  last10: ('win' | 'loss')[]
  probabilityPicks: { market: string; total: number; wins: number; winRate: number } | null
  equityCurve: { date: string; profit: number }[]
}

const MARKET_LABELS: Record<string, { es: string; en: string }> = {
  btts: { es: 'BTTS (value bet)', en: 'BTTS (value bet)' },
  over25: { es: 'Over 2.5', en: 'Over 2.5' },
  over15: { es: 'Over 1.5', en: 'Over 1.5' },
  home: { es: 'Local', en: 'Home' },
  away: { es: 'Visitante', en: 'Away' },
  draw: { es: 'Empate', en: 'Draw' },
}

const MIN_SAMPLE_SIZE = 100
const MIN_SAMPLE_SIZE_MARKETS = 50

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

      allMarkets.forEach((m, i) => {
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

      const path = rootRef.current?.querySelector('[data-equity-path]') as SVGPathElement | null
      if (path) {
        const len = path.getTotalLength()
        path.style.strokeDasharray = `${len}`
        path.style.strokeDashoffset = `${len}`
        animate(path, {
          strokeDashoffset: [{ from: len, to: 0 }],
          duration: 1400,
          delay: 300,
          ease: 'outExpo',
        })
      }
    })

    return () => scope.revert()
  }, [metrics])

  if (!metrics) return null

  // Las señales BTTS se snapshottean por probabilidad, no por edge/cuota. Se
  // muestran aparte para no mezclarlas con el ROI ni el sample de Value Bets.
  const allMarkets = metrics.byMarket
  const bttsSignal = metrics.probabilityPicks

  const T = {
    title: lang === 'en' ? '// AI MODEL PERFORMANCE' : '// RENDIMIENTO DEL MODELO',
    subtitle: lang === 'en' ? `Value Bets: ${metrics.total} settled` : `Value Bets: ${metrics.total} liquidadas`,
    last10: lang === 'en' ? 'Last 10 predictions' : 'Últimas 10 predicciones',
  }

  return (
    <div ref={rootRef} style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 16, padding: 20, marginBottom: 12, boxShadow: '0 14px 40px rgba(0,0,0,0.3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#00c878', letterSpacing: '0.04em' }}>{T.title}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#4a6785' }}>{T.subtitle}</span>
      </div>

      {bttsSignal && (
        <div style={{ border: '1px solid rgba(100,181,246,0.38)', background: 'rgba(100,181,246,0.07)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, color: '#64b5f6', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
              {lang === 'en' ? 'Best BTTS of the day' : 'Mejores BTTS del día'}
            </div>
            <div style={{ fontSize: 11, color: '#8ba2c0' }}>
              {lang === 'en'
                ? `${bttsSignal.wins}/${bttsSignal.total} settled signals · probability-only, no ROI`
                : `${bttsSignal.wins}/${bttsSignal.total} señales liquidadas · solo probabilidad, sin ROI`}
            </div>
          </div>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 32, lineHeight: 1, color: heatColor(bttsSignal.winRate) }}>
            {bttsSignal.winRate.toFixed(1)}%
          </div>
        </div>
      )}

      {metrics.total < MIN_SAMPLE_SIZE_MARKETS && (() => {
        const over25 = allMarkets.find(m => m.market === 'over25')
        return (
          <div style={{ textAlign: 'center', padding: '16px 10px' }}>
            <div style={{ fontSize: 13, color: '#8ba2c0', marginBottom: 10 }}>
              {lang === 'en'
                ? `Accumulating data: ${metrics.total}/${MIN_SAMPLE_SIZE_MARKETS} settled bets since the model recalibration.`
                : `Acumulando datos: ${metrics.total}/${MIN_SAMPLE_SIZE_MARKETS} apuestas liquidadas desde la recalibración del modelo.`}
            </div>
            <div style={{ height: 4, background: '#0d1e35', borderRadius: 2, overflow: 'hidden', maxWidth: 320, margin: '0 auto 14px' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (metrics.total / MIN_SAMPLE_SIZE_MARKETS) * 100)}%`, background: '#00c878', borderRadius: 2 }} />
            </div>
            {over25 && (
              <div style={{ fontSize: 12, color: '#8ba2c0' }}>
                {lang === 'en' ? 'In the meantime, ' : 'Mientras tanto, '}
                <span style={{ color: heatColor(over25.winRate), fontWeight: 700 }}>Over 2.5 {lang === 'en' ? 'hits' : 'acierta'} {over25.winRate.toFixed(1)}%</span>
                {` (${over25.wins}/${over25.total})`}
              </div>
            )}
          </div>
        )
      })()}

      {metrics.total >= MIN_SAMPLE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, color: '#8ba2c0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {lang === 'en' ? 'Profit (units staked)' : 'Ganancia (unidades apostadas)'}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 40, lineHeight: 1, color: metrics.profit >= 0 ? '#00c878' : '#ff6b6b', textShadow: metrics.profit >= 0 ? '0 0 20px rgba(0,200,120,0.4)' : 'none' }}>
                {metrics.profit >= 0 ? '+' : ''}{metrics.profit.toFixed(1)}u
              </span>
              <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, color: metrics.roi >= 0 ? '#00c878' : '#ff6b6b' }}>
                ROI {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(1)}%
              </span>
            </div>
          </div>
          {metrics.equityCurve.length >= 2 && (() => {
            const w = 260, h = 60, pad = 4
            const profits = metrics.equityCurve.map(e => e.profit)
            const min = Math.min(0, ...profits)
            const max = Math.max(0, ...profits)
            const range = (max - min) || 1
            const stepX = (w - pad * 2) / (metrics.equityCurve.length - 1)
            const toY = (p: number) => h - pad - ((p - min) / range) * (h - pad * 2)
            const points = metrics.equityCurve.map((e, i) => `${pad + i * stepX},${toY(e.profit)}`)
            const d = `M ${points.join(' L ')}`
            const lineColor = metrics.profit >= 0 ? '#00c878' : '#ff6b6b'
            return (
              <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
                <line x1={pad} y1={toY(0)} x2={w - pad} y2={toY(0)} stroke="#1a2e4a" strokeWidth={1} strokeDasharray="3,3" />
                <path data-equity-path d={d} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )
          })()}
        </div>
      )}

      {metrics.total >= MIN_SAMPLE_SIZE_MARKETS && (
        <>
          <div style={{ fontSize: 10, color: '#4a6785', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {lang === 'en' ? 'Hit rate by market' : 'Hit rate por mercado'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 16 }}>
            {allMarkets.map(m => {
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
        </>
      )}
    </div>
  )
}
