'use client'
import { useState } from 'react'

export function Logo({ size = 40 }: { size?: number }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontStyle: 'italic', fontSize: size * 0.85, color: '#f2f6ff' }}>FOOTY<span style={{ color: '#00c878' }}>EDGE</span></span>
  }
  return <img src="/logo.png" alt="FootyEdge" style={{ height: size, width: 'auto', display: 'block' }} onError={() => setBroken(true)} />
}

export function PitchBackground() {
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: '64%', pointerEvents: 'none', overflow: 'hidden', maskImage: 'linear-gradient(to top, black 55%, transparent 96%)', WebkitMaskImage: 'linear-gradient(to top, black 55%, transparent 96%)', zIndex: 0 }} aria-hidden>
      <svg style={{ position: 'absolute', left: '50%', bottom: '-34%', width: '150%', height: '130%', transform: 'translateX(-50%) rotateX(48deg)', transformOrigin: 'center top', opacity: 0.7 }} viewBox="0 0 1600 900" fill="none" preserveAspectRatio="xMidYMax slice">
        <defs>
          <filter id="pitchGlowShared" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g stroke="rgba(0,200,120,0.3)" strokeWidth="3" fill="none">
          <rect x="120" y="60" width="1360" height="780" rx="4" />
          <line x1="800" y1="60" x2="800" y2="840" />
          <circle cx="800" cy="450" r="130" filter="url(#pitchGlowShared)" stroke="rgba(0,200,120,0.45)" />
          <circle cx="800" cy="450" r="7" fill="rgba(0,200,120,0.5)" stroke="none" />
          <rect x="120" y="235" width="240" height="430" />
          <rect x="120" y="340" width="90" height="220" />
          <path d="M360 355 A 130 130 0 0 1 360 545" />
          <rect x="1240" y="235" width="240" height="430" />
          <rect x="1390" y="340" width="90" height="220" />
          <path d="M1240 355 A 130 130 0 0 0 1240 545" />
          <path d="M120 90 A 30 30 0 0 0 150 60" />
          <path d="M1450 60 A 30 30 0 0 0 1480 90" />
          <path d="M150 840 A 30 30 0 0 0 120 810" />
          <path d="M1480 810 A 30 30 0 0 0 1450 840" />
        </g>
        <circle cx="330" cy="450" r="6" fill="rgba(0,200,120,0.4)" />
        <circle cx="1270" cy="450" r="6" fill="rgba(0,200,120,0.4)" />
        <g fill="rgba(0,200,120,0.03)">
          {[0, 2, 4, 6].map((i) => <rect key={i} x={120 + i * 170} y="60" width="170" height="780" />)}
        </g>
      </svg>
    </div>
  )
}

export function PredictionsPage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#070d1a', color: '#f2f6ff', fontFamily: "'DM Mono', monospace", position: 'relative', overflow: 'hidden' }}>
      <PitchBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '48px 20px' }}>
        {children}
      </div>
    </div>
  )
}
