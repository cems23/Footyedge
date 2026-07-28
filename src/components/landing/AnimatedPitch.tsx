'use client';

import { useEffect, useRef } from 'react';
import { animate, stagger, createTimeline } from 'animejs';

export default function AnimatedPitch() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const tl = createTimeline({
            defaults: { ease: 'inOutSine' },
          });

          tl.add('.pitch-line', {
            strokeDashoffset: [1, 0],
            duration: 800,
            delay: stagger(80),
          })
            .add(
              '.data-node',
              {
                scale: [0, 1],
                opacity: [0, 1],
                duration: 600,
                ease: 'outElastic(1, .6)',
                delay: stagger(60),
              },
              '-=400'
            )
            .add(
              '.data-label',
              {
                opacity: [0, 1],
                duration: 400,
                delay: stagger(60),
              },
              '-=400'
            )
            .add(
              '.data-node',
              {
                scale: [1, 1.3, 1],
                opacity: [1, 0.6, 1],
                duration: 1200,
                loop: true,
                ease: 'inOutSine',
                delay: stagger(100),
              },
              '+=200'
            );

          observer.unobserve(container);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const lineStyle: React.CSSProperties = {
    stroke: 'rgba(0, 200, 120, 0.75)',
    strokeWidth: 2,
    fill: 'none',
    strokeDasharray: 1,
    strokeDashoffset: 1,
  };

  const nodeStyle: React.CSSProperties = {
    fill: '#00c878',
    opacity: 0,
    transformBox: 'fill-box',
    transformOrigin: 'center',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'DM Mono, monospace',
    fontSize: '11px',
    fontWeight: 700,
    fill: '#f2f6ff',
    opacity: 0,
    textAnchor: 'middle' as const,
  };

  // nodos: [cx, cy, radio, valor, esColorRojo]
  const nodes: [number, number, number, string, boolean][] = [
    [110, 70, 7, '8.2', false],
    [300, 95, 7, '7.4', false],
    [200, 150, 8, '9.1', false],
    [260, 220, 7, '6.8', false],
    [345, 150, 9, 'xG', true],
  ];

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '620px',
        aspectRatio: '4 / 3',
        margin: '0 auto',
        backgroundColor: '#0a1626',
        border: '1px solid #1a2e4a',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 0 40px rgba(0, 200, 120, 0.06)',
      }}
    >
      <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        {/* limite del campo */}
        <rect className="pitch-line" x="10" y="10" width="380" height="280" style={lineStyle} pathLength={1} />
        {/* linea de medio campo */}
        <line className="pitch-line" x1="200" y1="10" x2="200" y2="290" style={lineStyle} pathLength={1} />
        {/* circulo central */}
        <circle className="pitch-line" cx="200" cy="150" r="40" style={lineStyle} pathLength={1} />
        <circle className="pitch-line" cx="200" cy="150" r="2" style={{ ...lineStyle, fill: 'rgba(0, 200, 120, 0.8)' }} pathLength={1} />
        {/* area grande izquierda / derecha */}
        <rect className="pitch-line" x="10" y="70" width="70" height="160" style={lineStyle} pathLength={1} />
        <rect className="pitch-line" x="320" y="70" width="70" height="160" style={lineStyle} pathLength={1} />
        {/* area chica izquierda / derecha */}
        <rect className="pitch-line" x="10" y="110" width="25" height="80" style={lineStyle} pathLength={1} />
        <rect className="pitch-line" x="365" y="110" width="25" height="80" style={lineStyle} pathLength={1} />
        {/* porterias */}
        <rect className="pitch-line" x="4" y="130" width="6" height="40" style={lineStyle} pathLength={1} />
        <rect className="pitch-line" x="390" y="130" width="6" height="40" style={lineStyle} pathLength={1} />

        {/* nodos de datos */}
        {nodes.map(([cx, cy, r, val, isRed], i) => (
          <g key={i}>
            <circle className="data-node" cx={cx} cy={cy} r={r} style={{ ...nodeStyle, fill: isRed ? '#ff4d4d' : '#00c878' }} />
            <text className="data-label" x={cx} y={cy + r + 16} style={labelStyle}>{val}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
