'use client'
import { useState, useRef } from 'react'
import { animate, stagger } from 'animejs'

const MARKET_OPTIONS = [
  { key: 'home', label: '1 (Local)' },
  { key: 'draw', label: 'X (Empate)' },
  { key: 'away', label: '2 (Visita)' },
  { key: 'over25', label: 'Over 2.5' },
  { key: 'btts', label: 'BTTS' },
]

export function ComboGenerator({ lang = 'en' }: { lang?: string }) {
  const [markets, setMarkets] = useState<string[]>(['home', 'over25', 'btts'])
  const [minOdds, setMinOdds] = useState(1.3)
  const [maxOdds, setMaxOdds] = useState(2.5)
  const [minProb, setMinProb] = useState(55)
  const [count, setCount] = useState(3)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [enoughMatches, setEnoughMatches] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)
  const oddsRef = useRef<HTMLSpanElement>(null)

  const toggleMarket = (key: string) => {
    setMarkets((prev) => prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key])
  }

  const generate = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/combo-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markets, minOdds, maxOdds, minProb: minProb / 100, count }),
      })
      const data = await res.json()
      setResult(data)
      setEnoughMatches(data.enough_matches)

      requestAnimationFrame(() => {
        const items = listRef.current?.querySelectorAll('.combo-pick')
        if (items && items.length) {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            items.forEach((el) => { (el as HTMLElement).style.opacity = '1'; (el as HTMLElement).style.transform = 'none' })
          } else {
            animate(items, {
              opacity: [0, 1],
              translateX: [-24, 0],
              duration: 450,
              delay: stagger(120),
              ease: 'outCubic',
            })
          }
        }

        if (oddsRef.current && data.combined_odds) {
          const obj = { v: 1 }
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            oddsRef.current.innerText = data.combined_odds.toFixed(2)
          } else {
            animate(obj, {
              v: data.combined_odds,
              duration: 900,
              delay: markets.length ? count * 120 + 200 : 200,
              ease: 'outCubic',
              onUpdate: () => { if (oddsRef.current) oddsRef.current.innerText = obj.v.toFixed(2) },
            })
          }
        }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 16px' }}>
      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: '#00c878', letterSpacing: '0.02em', margin: '0 0 4px' }}>
        🎰 {lang === 'en' ? 'COMBO GENERATOR' : 'GENERADOR DE COMBINADAS'}
      </h2>
      <p style={{ fontSize: 12, color: '#4a6785', marginBottom: 20 }}>
        {lang === 'en' ? "Build a parlay from today's model signals — not just market odds." : 'Arma una combinada con las señales del modelo de hoy — no solo cuotas de mercado.'}
      </p>

      <div style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#8ba2c0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {lang === 'en' ? 'Markets' : 'Mercados'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MARKET_OPTIONS.map((m) => (
              <button
                key={m.key}
                onClick={() => toggleMarket(m.key)}
                style={{
                  background: markets.includes(m.key) ? 'rgba(0,200,120,0.16)' : 'transparent',
                  border: markets.includes(m.key) ? '1px solid #00c878' : '1px solid #1a2e4a',
                  color: markets.includes(m.key) ? '#00c878' : '#8ba2c0',
                  padding: '6px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: '#8ba2c0', display: 'block', marginBottom: 6 }}>{lang === 'en' ? 'Min odds' : 'Cuota mín.'}</label>
            <input type="number" step="0.1" value={minOdds} onChange={(e) => setMinOdds(Number(e.target.value))}
              style={{ width: '100%', background: '#070d1a', border: '1px solid #1a2e4a', borderRadius: 8, padding: 8, color: 'white', fontFamily: "'DM Mono', monospace", boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#8ba2c0', display: 'block', marginBottom: 6 }}>{lang === 'en' ? 'Max odds' : 'Cuota máx.'}</label>
            <input type="number" step="0.1" value={maxOdds} onChange={(e) => setMaxOdds(Number(e.target.value))}
              style={{ width: '100%', background: '#070d1a', border: '1px solid #1a2e4a', borderRadius: 8, padding: 8, color: 'white', fontFamily: "'DM Mono', monospace", boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#8ba2c0', display: 'block', marginBottom: 6 }}>{lang === 'en' ? 'Min prob. %' : 'Prob. mín. %'}</label>
            <input type="number" value={minProb} onChange={(e) => setMinProb(Number(e.target.value))}
              style={{ width: '100%', background: '#070d1a', border: '1px solid #1a2e4a', borderRadius: 8, padding: 8, color: 'white', fontFamily: "'DM Mono', monospace", boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#8ba2c0', display: 'block', marginBottom: 6 }}>{lang === 'en' ? 'Matches' : 'Partidos'}</label>
            <input type="number" min={1} max={8} value={count} onChange={(e) => setCount(Number(e.target.value))}
              style={{ width: '100%', background: '#070d1a', border: '1px solid #1a2e4a', borderRadius: 8, padding: 8, color: 'white', fontFamily: "'DM Mono', monospace", boxSizing: 'border-box' }} />
          </div>
        </div>

        <button onClick={generate} disabled={loading || markets.length === 0}
          style={{ width: '100%', background: '#00c878', border: 'none', borderRadius: 8, padding: 12, color: '#070d1a', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || markets.length === 0 ? 0.6 : 1 }}>
          {loading ? (lang === 'en' ? '// BUILDING COMBO...' : '// ARMANDO COMBINADA...') : (lang === 'en' ? 'Generate combo' : 'Generar combinada')}
        </button>
      </div>

      {result && (
        <div>
          {!enoughMatches && (
            <div style={{ fontSize: 12, color: '#f6b93b', marginBottom: 12, textAlign: 'center' }}>
              {lang === 'en'
                ? `Only found ${result.picks.length} of ${count} matches with these criteria today.`
                : `Solo se encontraron ${result.picks.length} de ${count} partidos con estos criterios hoy.`}
            </div>
          )}

          {result.picks.length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: '#4a6785', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
              {lang === 'en' ? '// No matches found — try widening your filters' : '// Sin partidos encontrados — prueba ampliando tus filtros'}
            </div>
          )}

          {result.picks.length > 0 && (
            <>
              <div ref={listRef} style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                {result.picks.map((p: any, i: number) => (
                  <div key={i} className="combo-pick" style={{ opacity: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 10, fontFamily: "'DM Mono', monospace", fontSize: 12, flexWrap: 'wrap' }}>
                    <span style={{ color: '#4a6785', fontSize: 10 }}>{p.league_name}</span>
                    <span style={{ color: '#f2f6ff', fontWeight: 700, flex: 1, minWidth: 160 }}>{p.home_team_name} vs {p.away_team_name}</span>
                    <span style={{ color: '#8ba2c0', fontSize: 10, background: 'rgba(139,162,192,0.1)', padding: '2px 6px', borderRadius: 4 }}>{p.market_label}</span>
                    <span style={{ color: '#f6b93b', fontSize: 10 }}>{(p.model_prob * 100).toFixed(0)}%</span>
                    <span style={{ color: '#00c878', fontWeight: 700 }}>@{p.odds.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, rgba(0,200,120,0.08), transparent)', border: '1px solid rgba(0,200,120,0.3)', borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: '#8ba2c0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  {lang === 'en' ? 'Combined odds' : 'Cuota combinada'}
                </div>
                <span ref={oddsRef} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: '#00c878' }}>1.00</span>
                <div style={{ fontSize: 12, color: '#4a6785', marginTop: 8 }}>
                  {lang === 'en' ? `Model combined probability: ${result.combined_prob}%` : `Probabilidad combinada del modelo: ${result.combined_prob}%`}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
