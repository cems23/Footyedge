"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { getLang, getT } from "@/lib/i18n/translations"
import AnimatedBackground from "@/components/AnimatedBackground"

const TIER_STYLES = [
  { color: '#6b7fa3', border: '#1a2e4a', ctaStyle: 'outline' as const },
  { color: '#00c878', border: 'rgba(0,200,120,0.4)', ctaStyle: 'filled' as const },
  { color: '#ffd700', border: 'rgba(255,215,0,0.4)', ctaStyle: 'gold' as const },
]

export default function PricingPage({ params }: { params: { lang: string } }) {
  const lang = getLang(params.lang)
  const t = getT(lang)
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function handleUpgrade(planId: string | null) {
    if (!planId) { router.push(`/${lang}/auth/register`); return }
    setLoading(planId)
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(null)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060d1a", color: '#e8eaf6', fontFamily: "'Space Grotesk', sans-serif", position: 'relative' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Bebas+Neue&display=swap');`}</style>
      <AnimatedBackground />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '60px 5%' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <img src="/logo.png" alt="FootyEdge" style={{ height: 80, objectFit: 'contain', marginBottom: 24 }} />
          <div style={{ fontSize: 11, letterSpacing: 4, color: '#00c878', textTransform: 'uppercase', marginBottom: 16 }}>
            {t.pricing.label}
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontFamily: "'Bebas Neue'", letterSpacing: 2, color: 'white', margin: '0 0 16px' }}>
            {t.pricing.title1}<br /><span style={{ color: '#00c878' }}>{t.pricing.title2}</span>
          </h1>
          <p style={{ color: '#4a6785', fontSize: 15, margin: 0 }}>{t.pricing.subtitle}</p>
        </div>

        {/* Tiers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'start' }}>
          {t.pricing.tiers.map((tier, i) => {
            const style = TIER_STYLES[i]
            return (
              <div key={i} style={{ background: 'rgba(13,30,53,0.9)', border: `1px solid ${style.border}`, borderRadius: 20, padding: 32, position: 'relative', boxShadow: tier.name === 'PRO' ? '0 0 40px rgba(0,200,120,0.12)' : 'none', backdropFilter: 'blur(10px)', transition: 'transform 0.3s' }}>
                {tier.badge && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: tier.name === 'ELITE' ? 'linear-gradient(135deg, #ffd700, #ffaa00)' : 'linear-gradient(135deg, #00c878, #00a860)', color: '#000', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: 1 }}>{tier.badge}</div>
                )}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, letterSpacing: 3, color: style.color, textTransform: 'uppercase', marginBottom: 12 }}>{tier.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 52, fontWeight: 700, color: 'white', fontFamily: "'Bebas Neue'", letterSpacing: 1 }}>{tier.price}</span>
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

                <button
                  onClick={() => handleUpgrade(tier.plan)}
                  disabled={loading === tier.plan}
                  style={{ width: '100%', padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: loading === tier.plan ? 'not-allowed' : 'pointer', opacity: loading === tier.plan ? 0.7 : 1, border: style.ctaStyle === 'outline' ? `1px solid ${style.border}` : 'none', background: style.ctaStyle === 'filled' ? 'linear-gradient(135deg, #00c878, #00a860)' : style.ctaStyle === 'gold' ? 'linear-gradient(135deg, #ffd700, #ffaa00)' : 'transparent', color: style.ctaStyle === 'outline' ? style.color : '#000', transition: 'all 0.2s' }}>
                  {loading === tier.plan ? (lang === 'es' ? 'Redirigiendo...' : 'Redirecting...') : tier.cta}
                </button>
              </div>
            )
          })}
        </div>

        {/* Disclaimer */}
        <div style={{ background: 'rgba(255,180,0,0.04)', border: '1px solid rgba(255,180,0,0.1)', borderRadius: 12, padding: '16px 24px', marginTop: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#4a6785', lineHeight: 1.8 }}>{t.disclaimer.label} {t.disclaimer.text}</div>
        </div>

        {/* Back */}
        <p style={{ textAlign: 'center', marginTop: 32 }}>
          <button onClick={() => router.push(`/${lang}/dashboard`)} style={{ background: 'none', border: 'none', color: '#00c878', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ← {lang === 'es' ? 'Volver al dashboard' : 'Back to dashboard'}
          </button>
        </p>
      </div>
    </div>
  )
}
