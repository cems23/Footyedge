'use client'
import { PredictionsPage, Logo } from '@/components/predictions/PredictionsShell'

const CARD = 'rgba(13,30,53,0.6)'
const BORDER = '#1a2e4a'
const G = '#00c878'
const MUTE = '#8ba2c0'

export default function PredictionsIndexClient({ leagues, lang }: { leagues: { slug: string; id: number; name: string }[]; lang: string }) {
  const isEs = lang === 'es'

  return (
    <PredictionsPage>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href={`/${lang}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 28 }}>
          <Logo size={72} />
        </a>

        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px,5vw,52px)', color: G, letterSpacing: '0.02em', margin: '0 0 6px', textTransform: 'uppercase' }}>
          {isEs ? 'Predicciones por Liga' : 'Predictions by League'}
        </h1>
        <p style={{ fontSize: 13, color: MUTE, marginBottom: 36 }}>
          {isEs ? 'Elige una liga para ver las predicciones de hoy' : "Pick a league to see today's predictions"}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {leagues.map((l) => (
            <a key={l.id}
              href={`/${lang}/predictions/${l.slug}`}
              style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px', textDecoration: 'none', color: 'white', fontSize: 15, fontWeight: 700, transition: 'border-color 0.15s ease, transform 0.15s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = G; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {l.name}
            </a>
          ))}
        </div>
      </div>
    </PredictionsPage>
  )
}
