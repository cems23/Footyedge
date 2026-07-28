'use client'
import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'

export function SlidingTabs({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (key: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const pillRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const btn = btnRefs.current[active]
    const pill = pillRef.current
    if (!btn || !pill) return

    const target = { left: btn.offsetLeft, width: btn.offsetWidth }

    if (!ready || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pill.style.left = `${target.left}px`
      pill.style.width = `${target.width}px`
      setReady(true)
      return
    }

    animate(pill, {
      left: target.left,
      width: target.width,
      duration: 500,
      ease: 'outElastic(1, .6)',
    })
  }, [active])

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex', gap: 4, padding: 4, background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 999 }}>
      <div ref={pillRef} style={{ position: 'absolute', top: 4, bottom: 4, left: 0, width: 0, background: 'rgba(0,200,120,0.16)', border: '1px solid #00c878', borderRadius: 999, boxShadow: '0 0 18px rgba(0,200,120,0.28)', zIndex: 0 }} />
      {tabs.map((t) => (
        <button
          key={t.key}
          ref={(el) => { btnRefs.current[t.key] = el }}
          onClick={() => onChange(t.key)}
          style={{
            position: 'relative',
            zIndex: 1,
            background: 'transparent',
            border: 'none',
            color: active === t.key ? '#00c878' : '#8ba2c0',
            padding: '6px 16px',
            borderRadius: 999,
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
