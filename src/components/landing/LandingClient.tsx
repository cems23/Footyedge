'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Lang, getT } from '@/lib/i18n/translations'

const TIER_STYLES = [
  { color: '#6b7fa3', border: '#1a2e4a', ctaStyle: 'outline' as const },
  { color: '#00c878', border: 'rgba(0,200,120,0.4)', ctaStyle: 'filled' as const },
  { color: '#ffd700', border: 'rgba(255,215,0,0.4)', ctaStyle: 'gold' as const },
]

export default function LandingClient({ lang }: { lang: Lang }) {
  const router = useRouter()
  const t = getT(lang)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scrollY, setScrollY] = useState(0)
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())

  const otherLang = lang === 'es' ? 'en' : 'es'
  const [counters, setCounters] = useState([24, 8, 11, 7])

  useEffect(() => {
    const interval = setInterval(() => {
      setCounters(prev => prev.map((v, i) => {
        const changes = [0, 1, 1, 1]
        const maxVals = [31, 12, 18, 12]
        if (Math.random() > 0.7 && v < maxVals[i]) return v + changes[i]
        return v
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf: number
    let t = 0

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    // Football field lines - each line animates in progressively
    const drawField = () => {
      const W = canvas.width
      const H = canvas.height
      const cx = W / 2
      const cy = H / 2

      // Field dimensions (scaled to viewport)
      const fw = W * 1.1
      const fh = H * 1.05
      const fx = cx - fw / 2
      const fy = cy - fh / 2

      ctx.clearRect(0, 0, W, H)

      // Subtle green glow in center
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, fw * 0.6)
      glow.addColorStop(0, 'rgba(0,200,120,0.04)')
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)

      // Draw progress based on t (0 → lines appear one by one)
      const progress = Math.min(1, t / 300) // full reveal in ~5s
      const lineAlpha = 0.12

      ctx.strokeStyle = `rgba(0,200,120,${lineAlpha})`
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 4])

      const drawLine = (x1: number, y1: number, x2: number, y2: number, p: number, offset = 0) => {
        const localP = Math.max(0, Math.min(1, (p - offset) / (1 - offset)))
        if (localP <= 0) return
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x1 + (x2 - x1) * localP, y1 + (y2 - y1) * localP)
        ctx.stroke()
      }

      const drawArc = (x: number, y: number, r: number, a1: number, a2: number, p: number, offset = 0) => {
        const localP = Math.max(0, Math.min(1, (p - offset) / (1 - offset)))
        if (localP <= 0) return
        const endAngle = a1 + (a2 - a1) * localP
        ctx.beginPath()
        ctx.arc(x, y, r, a1, endAngle)
        ctx.stroke()
      }

      // Outer boundary
      drawLine(fx, fy, fx + fw, fy, progress, 0)           // top
      drawLine(fx + fw, fy, fx + fw, fy + fh, progress, 0.05) // right
      drawLine(fx + fw, fy + fh, fx, fy + fh, progress, 0.1)  // bottom
      drawLine(fx, fy + fh, fx, fy, progress, 0.15)           // left

      // Center line
      drawLine(cx, fy, cx, fy + fh, progress, 0.2)

      // Center circle
      drawArc(cx, cy, fh * 0.18, 0, Math.PI * 2, progress, 0.28)

      // Center dot
      if (progress > 0.35) {
        ctx.beginPath()
        ctx.arc(cx, cy, 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,200,120,${lineAlpha * 2})`
        ctx.fill()
      }

      // Left penalty box
      const pbw = fw * 0.16
      const pbh = fh * 0.45
      drawLine(fx, cy - pbh/2, fx + pbw, cy - pbh/2, progress, 0.38)
      drawLine(fx + pbw, cy - pbh/2, fx + pbw, cy + pbh/2, progress, 0.42)
      drawLine(fx + pbw, cy + pbh/2, fx, cy + pbh/2, progress, 0.46)

      // Right penalty box
      drawLine(fx + fw, cy - pbh/2, fx + fw - pbw, cy - pbh/2, progress, 0.5)
      drawLine(fx + fw - pbw, cy - pbh/2, fx + fw - pbw, cy + pbh/2, progress, 0.54)
      drawLine(fx + fw - pbw, cy + pbh/2, fx + fw, cy + pbh/2, progress, 0.58)

      // Left goal box
      const gbw = fw * 0.06
      const gbh = fh * 0.2
      drawLine(fx, cy - gbh/2, fx + gbw, cy - gbh/2, progress, 0.62)
      drawLine(fx + gbw, cy - gbh/2, fx + gbw, cy + gbh/2, progress, 0.65)
      drawLine(fx + gbw, cy + gbh/2, fx, cy + gbh/2, progress, 0.68)

      // Right goal box
      drawLine(fx + fw, cy - gbh/2, fx + fw - gbw, cy - gbh/2, progress, 0.7)
      drawLine(fx + fw - gbw, cy - gbh/2, fx + fw - gbw, cy + gbh/2, progress, 0.73)
      drawLine(fx + fw - gbw, cy + gbh/2, fx + fw, cy + gbh/2, progress, 0.76)

      // Penalty spots
      if (progress > 0.78) {
        ctx.fillStyle = `rgba(0,200,120,${lineAlpha * 2})`
        ctx.beginPath(); ctx.arc(fx + fw * 0.12, cy, 3, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(fx + fw * 0.88, cy, 3, 0, Math.PI * 2); ctx.fill()
      }

      // Penalty arcs
      drawArc(fx + fw * 0.12, cy, fh * 0.12, -Math.PI * 0.35, Math.PI * 0.35, progress, 0.8)
      drawArc(fx + fw * 0.88, cy, fh * 0.12, Math.PI * 0.65, Math.PI * 1.35, progress, 0.85)

      // Corner arcs
      drawArc(fx, fy, fh * 0.03, 0, Math.PI / 2, progress, 0.88)
      drawArc(fx + fw, fy, fh * 0.03, Math.PI / 2, Math.PI, progress, 0.9)
      drawArc(fx + fw, fy + fh, fh * 0.03, Math.PI, Math.PI * 1.5, progress, 0.92)
      drawArc(fx, fy + fh, fh * 0.03, Math.PI * 1.5, Math.PI * 2, progress, 0.94)

      // Subtle pulse on center circle after full reveal
      if (progress >= 1) {
        const pulse = (Math.sin(t * 0.03) + 1) / 2
        ctx.strokeStyle = `rgba(0,200,120,${0.05 + pulse * 0.08})`
        ctx.lineWidth = 2
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.arc(cx, cy, fh * 0.18, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([6, 4])
        ctx.lineWidth = 1.5
        ctx.strokeStyle = `rgba(0,200,120,${lineAlpha})`
      }

      t++
      raf = requestAnimationFrame(drawField)
    }

    drawField()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  useEffect(() => { const onScroll = () => setScrollY(window.scrollY); window.addEventListener('scroll', onScroll); return () => window.removeEventListener('scroll', onScroll) }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setVisibleSections(prev => { const s = new Set(Array.from(prev)); s.add(e.target.id); return s }) })
    }, { threshold: 0.15 })
    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const isVisible = (id: string) => visibleSections.has(id)

  return (
    <div style={{ background: '#060d1a', minHeight: '100vh', color: '#e8eaf6', fontFamily: "'Space Grotesk', sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes float { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-8px); } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(0,200,120,0.3); } 50% { box-shadow: 0 0 40px rgba(0,200,120,0.6); } }
        .reveal { opacity:0; transform:translateY(40px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .reveal.visible { opacity:1; transform:translateY(0); }
        .tier-card { transition: transform 0.3s ease; }
        .tier-card:hover { transform: translateY(-8px); }
        .feat-card { transition: transform 0.2s ease, border-color 0.2s ease; }
        .feat-card:hover { transform: translateY(-4px); border-color: rgba(0,200,120,0.3) !important; }
        .cta-btn { transition: all 0.2s ease; cursor: pointer; }
        .cta-btn:hover { transform: translateY(-2px); opacity: 0.9; }
        .nav-link { transition: color 0.2s; cursor: pointer; color: #6b7fa3; background: none; border: none; font-family: inherit; font-size: 14px; }
        .nav-link:hover { color: #00c878 !important; }
      `}</style>

      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: scrollY > 50 ? 'rgba(6,13,26,0.95)' : 'transparent', backdropFilter: scrollY > 50 ? 'blur(12px)' : 'none', borderBottom: scrollY > 50 ? '1px solid rgba(255,255,255,0.05)' : 'none', padding: '0 5%', height: 130, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s' }}>
        <img src="/logo.png" alt="FootyEdge" style={{ height: 120, width: 'auto', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="nav-link desktop-only" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>{t.nav.features}</button>
          <button className="nav-link desktop-only" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>{t.nav.pricing}</button>
          {/* Language toggle */}
          <button onClick={() => router.push(`/${otherLang}`)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7fa3', padding: '5px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            {lang === 'es' ? '🇬🇧' : '🇪🇸'} {otherLang === 'es' ? 'ES' : 'EN'}
          </button>
          <button onClick={() => router.push(`/${lang}/auth/login`)} className="cta-btn" style={{ background: 'none', border: '1px solid rgba(0,200,120,0.4)', color: '#00c878', padding: '7px 18px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>{t.nav.login}</button>
          <button onClick={() => router.push(`/${lang}/auth/register`)} className="cta-btn" style={{ background: 'linear-gradient(135deg, #00c878, #00a860)', border: 'none', color: '#000', padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{t.nav.register}</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 5% 80px' }}>
        <div style={{ animation: 'fadeIn 0.5s ease forwards', marginBottom: 24 }}>
          <span style={{ fontSize: 11, letterSpacing: 4, color: '#00c878', textTransform: 'uppercase', border: '1px solid rgba(0,200,120,0.3)', padding: '6px 16px', borderRadius: 20, background: 'rgba(0,200,120,0.05)' }}>{t.hero.badge}</span>
        </div>
        <h1 style={{ animation: 'fadeUp 0.7s 0.1s ease both', fontSize: 'clamp(48px, 8vw, 96px)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2, lineHeight: 1.05, marginBottom: 24, maxWidth: 900 }}>
          <span style={{ color: 'white' }}>{t.hero.title1}</span><br />
          <span style={{ background: 'linear-gradient(135deg, #00c878, #00bfff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.hero.title2}</span>
        </h1>
        <p style={{ animation: 'fadeUp 0.7s 0.2s ease both', fontSize: 'clamp(15px, 2vw, 19px)', color: '#6b7fa3', maxWidth: 600, lineHeight: 1.7, marginBottom: 40 }}>{t.hero.subtitle}</p>
        <div style={{ animation: 'fadeUp 0.7s 0.3s ease both', display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => router.push(`/${lang}/auth/register`)} className="cta-btn" style={{ background: 'linear-gradient(135deg, #00c878, #00a860)', border: 'none', color: '#000', padding: '14px 36px', borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', animation: 'glow 3s infinite', cursor: 'pointer' }}>{t.hero.cta1}</button>
          <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="cta-btn" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8eaf6', padding: '14px 36px', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}>{t.hero.cta2}</button>
        </div>
        <div style={{ animation: 'fadeUp 0.7s 0.5s ease both', display: 'flex', gap: 48, marginTop: 80, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['40+', t.stats.leagues], ['500+', t.stats.matches], ['Poisson', t.stats.model], ['Dixon-Coles', t.stats.correction]].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#00c878', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>{v}</div>
              <div style={{ fontSize: 11, color: '#4a6785', textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', animation: 'float 2s infinite' }}>
          <div style={{ width: 24, height: 40, border: '2px solid rgba(255,255,255,0.1)', borderRadius: 12, display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
            <div style={{ width: 4, height: 8, background: '#00c878', borderRadius: 2 }} />
          </div>
        </div>
      </section>

      {/* MOCK DASHBOARD */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 5% 100px', maxWidth: 1100, margin: '0 auto' }}>
        <div id="preview" data-reveal className={`reveal ${isVisible('preview') ? 'visible' : ''}`} style={{ background: 'rgba(13,30,53,0.85)', border: '1px solid rgba(0,200,120,0.15)', borderRadius: 20, padding: 24, backdropFilter: 'blur(10px)', boxShadow: '0 40px 80px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #1a2e4a' }}>
            {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
            <span style={{ fontSize: 12, color: '#4a6785', marginLeft: 8 }}>footyedge.app/dashboard</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[[counters[0], t.dashboard.matchesToday, '#00c878'], [counters[1], t.dashboard.hot, '#ff6b35'], [counters[2], t.dashboard.btts, '#00bfff'], [counters[3], t.dashboard.valueBets, '#ffd700']].map(([v, l, c]) => (
              <div key={l as string} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #1a2e4a', borderRadius: 10, padding: '14px 16px', transition: 'all 0.3s' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: c as string, fontFamily: "'Bebas Neue'", transition: 'all 0.3s' }}>{v}</div>
                <div style={{ fontSize: 10, color: '#4a6785', textTransform: 'uppercase', letterSpacing: 1 }}>{l as string}</div>
              </div>
            ))}
          </div>
          {[['🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Arsenal vs Chelsea', '20:45', '72%', '91%', '68%'], ['🇪🇸', 'Barcelona vs Real Madrid', '21:00', '65%', '87%', '61%'], ['🇩🇪', 'Bayern vs Dortmund', '18:30', '70%', '93%', '71%']].map(([flag, match, time, btts, ov15, ov25]) => (
            <div key={match as string} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 60px 65px 65px 65px', gap: 8, padding: '10px 8px', borderBottom: '1px solid #0a1628', alignItems: 'center' }}>
              <span>{flag}</span><span style={{ fontSize: 13 }}>{match}</span><span style={{ fontSize: 11, color: '#4a6785' }}>{time}</span>
              <span style={{ fontSize: 12, color: '#00c878', fontWeight: 600 }}>{btts}</span>
              <span style={{ fontSize: 12, color: '#00c878', fontWeight: 600 }}>{ov15}</span>
              <span style={{ fontSize: 12, color: '#ffb400', fontWeight: 600 }}>{ov25}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ position: 'relative', zIndex: 1, padding: '100px 5%', maxWidth: 1200, margin: '0 auto' }}>
        <div id="feat-title" data-reveal className={`reveal ${isVisible('feat-title') ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: '#00c878', textTransform: 'uppercase', marginBottom: 16 }}>{t.features.label}</div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontFamily: "'Bebas Neue'", letterSpacing: 2, color: 'white' }}>{t.features.title1}<br /><span style={{ color: '#00c878' }}>{t.features.title2}</span></h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {t.features.items.map((f, i) => (
            <div key={i} id={`feat-${i}`} data-reveal className={`reveal feat-card ${isVisible(`feat-${i}`) ? 'visible' : ''}`}
              style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 16, padding: 28, transitionDelay: `${i * 0.08}s`, backdropFilter: 'blur(8px)' }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 10 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: '#6b7fa3', lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ position: 'relative', zIndex: 1, padding: '100px 5%', maxWidth: 1200, margin: '0 auto' }}>
        <div id="price-title" data-reveal className={`reveal ${isVisible('price-title') ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: '#00c878', textTransform: 'uppercase', marginBottom: 16 }}>{t.pricing.label}</div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontFamily: "'Bebas Neue'", letterSpacing: 2, color: 'white' }}>{t.pricing.title1}<br /><span style={{ color: '#00c878' }}>{t.pricing.title2}</span></h2>
          <p style={{ color: '#4a6785', fontSize: 14, marginTop: 16 }}>{t.pricing.subtitle}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'start' }}>
          {t.pricing.tiers.map((tier, i) => {
            const style = TIER_STYLES[i]
            return (
              <div key={i} id={`tier-${i}`} data-reveal className={`reveal tier-card ${isVisible(`tier-${i}`) ? 'visible' : ''}`}
                style={{ background: 'rgba(13,30,53,0.85)', border: `1px solid ${style.border}`, borderRadius: 20, padding: 32, position: 'relative', transitionDelay: `${i * 0.1}s`, boxShadow: tier.name === 'PRO' ? '0 0 40px rgba(0,200,120,0.12)' : 'none', backdropFilter: 'blur(10px)' }}>
                {tier.badge && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: tier.name === 'ELITE' ? 'linear-gradient(135deg, #ffd700, #ffaa00)' : 'linear-gradient(135deg, #00c878, #00a860)', color: '#000', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: 1 }}>{tier.badge}</div>
                )}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, letterSpacing: 3, color: style.color, textTransform: 'uppercase', marginBottom: 12 }}>{tier.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 48, fontWeight: 700, color: 'white', fontFamily: "'Bebas Neue'", letterSpacing: 1 }}>{tier.price}</span>
                    <span style={{ fontSize: 14, color: '#4a6785' }}>{tier.period}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {tier.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', gap: 10 }}>
                      <span style={{ color: style.color, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 13, color: '#c8d4e8', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                  {tier.excluded.map((f, j) => (
                    <div key={j} style={{ display: 'flex', gap: 10 }}>
                      <span style={{ color: '#2a3a4a', flexShrink: 0 }}>✗</span>
                      <span style={{ fontSize: 13, color: '#3a4a5a', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => tier.plan ? router.push(`/${lang}/auth/register?plan=${tier.plan}`) : router.push(`/${lang}/auth/register`)} className="cta-btn"
                  style={{ width: '100%', padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', border: style.ctaStyle === 'outline' ? `1px solid ${style.border}` : 'none', background: style.ctaStyle === 'filled' ? 'linear-gradient(135deg, #00c878, #00a860)' : style.ctaStyle === 'gold' ? 'linear-gradient(135deg, #ffd700, #ffaa00)' : 'transparent', color: style.ctaStyle === 'outline' ? style.color : '#000' }}>
                  {tier.cta}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ position: 'relative', zIndex: 1, padding: '100px 5%', maxWidth: 1100, margin: '0 auto' }}>
        <div id="how-title" data-reveal className={`reveal ${isVisible('how-title') ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: '#00c878', textTransform: 'uppercase', marginBottom: 16 }}>
            {lang === 'es' ? 'Cómo funciona' : 'How it works'}
          </div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontFamily: "'Bebas Neue'", letterSpacing: 2, color: 'white' }}>
            {lang === 'es' ? <>3 PASOS PARA<br /><span style={{ color: '#00c878' }}>EMPEZAR HOY</span></> : <>3 STEPS TO<br /><span style={{ color: '#00c878' }}>START TODAY</span></>}
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {[
            { step: '01', icon: '👤', title: lang === 'es' ? 'Regístrate gratis' : 'Sign up for free', desc: lang === 'es' ? 'Crea tu cuenta en segundos. Sin tarjeta de crédito. Acceso inmediato al dashboard con datos reales.' : 'Create your account in seconds. No credit card. Immediate access to the dashboard with real data.' },
            { step: '02', icon: '🌍', title: lang === 'es' ? 'Elige tus ligas' : 'Choose your leagues', desc: lang === 'es' ? 'Filtra por liga, mercado o probabilidad. Premier League, La Liga, Bundesliga y 37 ligas más disponibles.' : 'Filter by league, market or probability. Premier League, La Liga, Bundesliga and 37 more leagues available.' },
            { step: '03', icon: '📊', title: lang === 'es' ? 'Analiza y decide' : 'Analyze and decide', desc: lang === 'es' ? 'Consulta las probabilidades del modelo, value bets y estadísticas avanzadas para tomar decisiones informadas.' : 'Check model probabilities, value bets and advanced statistics to make informed decisions.' },
          ].map((item, i) => (
            <div key={i} id={`how-${i}`} data-reveal className={`reveal ${isVisible(`how-${i}`) ? 'visible' : ''}`}
              style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 16, padding: 32, transitionDelay: `${i * 0.1}s`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 16, right: 20, fontSize: 48, fontWeight: 800, color: 'rgba(0,200,120,0.06)', fontFamily: "'Bebas Neue'" }}>{item.step}</div>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{item.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 10 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: '#6b7fa3', lineHeight: 1.7 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{ position: 'relative', zIndex: 1, padding: '60px 5%', maxWidth: 1100, margin: '0 auto' }}>
        <div id="social" data-reveal className={`reveal ${isVisible('social') ? 'visible' : ''}`}
          style={{ background: 'linear-gradient(135deg, rgba(0,200,120,0.06), rgba(0,191,255,0.04))', border: '1px solid rgba(0,200,120,0.15)', borderRadius: 20, padding: '40px 48px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, textAlign: 'center' }}>
          {[

            { value: '40+', label: lang === 'es' ? 'Ligas analizadas' : 'Leagues analyzed' },
            { value: '99%', label: lang === 'es' ? 'Uptime garantizado' : 'Guaranteed uptime' },
            { value: '5am', label: lang === 'es' ? 'Análisis diario UTC' : 'Daily analysis UTC' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#00c878', fontFamily: "'Bebas Neue'", letterSpacing: 1, marginBottom: 8 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#6b7fa3', textTransform: 'uppercase', letterSpacing: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 5%', maxWidth: 800, margin: '0 auto' }}>
        <div id="faq-title" data-reveal className={`reveal ${isVisible('faq-title') ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: '#00c878', textTransform: 'uppercase', marginBottom: 16 }}>FAQ</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontFamily: "'Bebas Neue'", letterSpacing: 2, color: 'white' }}>
            {lang === 'es' ? 'PREGUNTAS FRECUENTES' : 'FREQUENTLY ASKED QUESTIONS'}
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(lang === 'es' ? [
            { q: '¿Es gratis?', a: 'Sí. El plan Free es gratuito para siempre con acceso a 3 value bets diarias y datos básicos. Los planes Pro y Elite ofrecen acceso completo.' },
            { q: '¿Qué ligas cubre?', a: 'Más de 40 ligas incluyendo Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie, MLS, J1 League, Saudi Pro League y muchas más.' },
            { q: '¿Cada cuánto se actualizan los datos?', a: 'El análisis completo corre automáticamente a las 5am UTC cada día. Los partidos en vivo se actualizan en tiempo real con un click.' },
            { q: '¿Garantiza ganancias?', a: 'No. FootyEdge proporciona estimaciones matemáticas basadas en el modelo Poisson con corrección Dixon-Coles. Las probabilidades son orientativas, no garantías.' },
          ] : [
            { q: 'Is it free?', a: 'Yes. The Free plan is free forever with access to 3 daily value bets and basic data. Pro and Elite plans offer full access.' },
            { q: 'Which leagues are covered?', a: 'Over 40 leagues including Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie, MLS, J1 League, Saudi Pro League and many more.' },
            { q: 'How often is data updated?', a: 'Full analysis runs automatically at 5am UTC every day. Live matches update in real time with one click.' },
            { q: 'Does it guarantee profits?', a: "No. FootyEdge provides mathematical estimates based on the Poisson model with Dixon-Coles correction. Probabilities are indicative, not guarantees." },
          ]).map((faq, i) => (
            <div key={i} id={`faq-${i}`} data-reveal className={`reveal ${isVisible(`faq-${i}`) ? 'visible' : ''}`}
              style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 12, padding: '20px 24px', transitionDelay: `${i * 0.08}s` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 8 }}>— {faq.q}</div>
              <div style={{ fontSize: 13, color: '#6b7fa3', lineHeight: 1.7 }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DISCLAIMER */}
      <section style={{ position: 'relative', zIndex: 1, padding: '20px 5% 60px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: 'rgba(255,180,0,0.04)', border: '1px solid rgba(255,180,0,0.1)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 11, color: '#4a6785', lineHeight: 1.8 }}>{t.disclaimer.label} <strong style={{ color: '#6b7a30' }}></strong> {t.disclaimer.text}</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid #1a2e4a', padding: '32px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <img src="/logo.png" alt="FootyEdge" style={{ height: 48, opacity: 0.9 }} onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
        <div style={{ fontSize: 12, color: '#3a5578' }}>FootyEdge 2.0 · Modelo Poisson + Dixon-Coles · © 2026</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <button onClick={() => router.push(`/${lang}/auth/login`)} style={{ background: 'none', border: 'none', color: '#3a5578', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{t.footer.login}</button>
          <button onClick={() => router.push(`/${lang}/auth/register`)} style={{ background: 'none', border: 'none', color: '#3a5578', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{t.footer.register}</button>
        </div>
      </footer>
    </div>
  )
}
