"use client"
import { useEffect, useRef } from "react"

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = []
    const count = 60

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
      })
    }

    // Hexagon grid points
    const hexPoints: { x: number; y: number }[] = []
    const hexSize = 80
    for (let row = 0; row < canvas.height / hexSize + 2; row++) {
      for (let col = 0; col < canvas.width / hexSize + 2; col++) {
        const offset = row % 2 === 0 ? 0 : hexSize * 0.866
        hexPoints.push({ x: col * hexSize * 1.732 + offset - hexSize, y: row * hexSize * 1.5 - hexSize })
      }
    }

    let frame = 0
    let animId: number

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw hex grid
      ctx.strokeStyle = 'rgba(0, 200, 120, 0.04)'
      ctx.lineWidth = 1
      hexPoints.forEach(p => {
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6
          const hx = p.x + hexSize * 0.5 * Math.cos(angle)
          const hy = p.y + hexSize * 0.5 * Math.sin(angle)
          i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy)
        }
        ctx.closePath()
        ctx.stroke()
      })

      // Update and draw particles
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 200, 120, ${p.opacity})`
        ctx.fill()
      })

      // Connect nearby particles
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(0, 200, 120, ${0.08 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })

      // Pulsing glow orbs
      const t = frame * 0.01
      const orbs = [
        { x: canvas.width * 0.2, y: canvas.height * 0.3, r: 200 },
        { x: canvas.width * 0.8, y: canvas.height * 0.7, r: 250 },
        { x: canvas.width * 0.5, y: canvas.height * 0.1, r: 180 },
      ]
      orbs.forEach((orb, i) => {
        const pulse = Math.sin(t + i * 2) * 0.5 + 0.5
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r)
        grad.addColorStop(0, `rgba(0, 200, 120, ${0.04 * pulse})`)
        grad.addColorStop(1, 'rgba(0, 200, 120, 0)')
        ctx.fillStyle = grad
        ctx.fillRect(orb.x - orb.r, orb.y - orb.r, orb.r * 2, orb.r * 2)
      })

      frame++
      animId = requestAnimationFrame(draw)
    }

    draw()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    />
  )
}
