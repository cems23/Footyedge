'use client'
import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'

export function AnimatedStat({ value, suffix = '', decimals = 1, color = '#00c878', fontSize = 32 }: { value: number; suffix?: string; decimals?: number; color?: string; fontSize?: number }) {
  const [display, setDisplay] = useState(0)
  const objRef = useRef({ v: 0 })

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }
    objRef.current.v = 0
    animate(objRef.current, {
      v: value,
      duration: 1200,
      ease: 'outCubic',
      onUpdate: () => setDisplay(objRef.current.v),
    })
  }, [value])

  return (
    <span style={{ fontFamily: "'DM Mono', monospace", color, fontSize, fontWeight: 700 }}>
      {display.toFixed(decimals)}{suffix}
    </span>
  )
}
