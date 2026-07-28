"use client"
import { useState } from "react"

const BG = '#070d1a'
const BORDER = '#1a2e4a'
const G = '#00c878'
const MUTE = '#8ba2c0'
const WHITE = '#f2f6ff'

export default function TermsPage() {
  const [lang, setLang] = useState<'en' | 'es'>('en')

  return (
    <div style={{ minHeight: '100vh', background: BG, color: WHITE, fontFamily: "'DM Mono', monospace", padding: '48px 20px' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="FootyEdge" style={{ height: 60 }} />
          </a>
          <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: MUTE, padding: '6px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer' }}>
            {lang === 'en' ? '🇪🇸 ES' : '🇬🇧 EN'}
          </button>
        </div>

        <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 42, letterSpacing: '0.02em', marginBottom: 6 }}>
          {lang === 'en' ? 'Terms & Conditions' : 'Términos y Condiciones'}
        </h1>
        <p style={{ color: MUTE, fontSize: 13, marginBottom: 40 }}>
          {lang === 'en' ? 'Last updated: July 2026' : 'Última actualización: julio de 2026'}
        </p>

        <div style={{ display: 'grid', gap: 28 }}>
          {(lang === 'en' ? [
            { h: '1. What FootyEdge is', p: 'FootyEdge is a statistical football analytics tool. It prices matches using a Poisson-based model (Dixon-Coles, calibrated per league, blended with Elo ratings and live market odds) and surfaces statistical edges. It is a decision-support tool, not a betting tipster service and not a guarantee of any outcome.' },
            { h: '2. No guarantee of results', p: 'Football is unpredictable. No statistical model, including ours, can predict individual match outcomes with certainty. Past performance of the model does not guarantee future results. Any decision to place a bet based on information from FootyEdge is made entirely at your own risk and discretion.' },
            { h: '3. Age requirement', p: 'You must be at least 18 years old (or the legal gambling age in your jurisdiction, whichever is higher) to create an account or use FootyEdge. By using the service you confirm you meet this requirement.' },
            { h: '4. Responsible use', p: "FootyEdge does not facilitate or process bets — it only provides statistical information. You are responsible for complying with the gambling laws of your own jurisdiction, and for gambling responsibly. If you feel you may have a gambling problem, please seek help from a relevant support organization in your country." },
            { h: '5. Subscriptions and payments', p: 'Paid plans (Pro, Elite) are billed on a recurring basis through Stripe. You can cancel anytime from your account settings; your plan remains active until the end of the current billing period. One-time AI match analysis reports are billed once per report and are cached for you to revisit at no extra cost.' },
            { h: '6. Refunds', p: 'Because FootyEdge delivers digital analytical content immediately upon purchase, we generally do not offer refunds once a subscription period has started or an AI report has been generated. If you believe you were charged in error, contact us and we will review it.' },
            { h: '7. Account termination', p: 'We may suspend or terminate accounts that abuse the service, attempt to circumvent rate limits or security measures, or violate these terms. You may delete your account at any time.' },
            { h: '8. Limitation of liability', p: 'FootyEdge, its statistical outputs, rankings and AI-generated reports are provided "as is" without warranties of any kind. We are not liable for any financial losses resulting from betting decisions made using information from the platform.' },
            { h: '9. Changes to these terms', p: 'We may update these terms from time to time. Continued use of FootyEdge after changes are posted constitutes acceptance of the updated terms.' },
            { h: '10. Contact', p: 'Questions about these terms? Email us at footyedge2.0@gmail.com.' },
          ] : [
            { h: '1. Qué es FootyEdge', p: 'FootyEdge es una herramienta de analítica estadística de fútbol. Calcula precios de partidos usando un modelo basado en Poisson (Dixon-Coles, calibrado por liga, combinado con ratings Elo y cuotas reales del mercado) y muestra ventajas estadísticas. Es una herramienta de apoyo a la decisión, no un servicio de pronósticos de apuestas ni una garantía de ningún resultado.' },
            { h: '2. Sin garantía de resultados', p: 'El fútbol es impredecible. Ningún modelo estadístico, incluido el nuestro, puede predecir con certeza el resultado de un partido individual. El desempeño pasado del modelo no garantiza resultados futuros. Cualquier decisión de apostar basada en información de FootyEdge se toma bajo tu propio riesgo y responsabilidad.' },
            { h: '3. Requisito de edad', p: 'Debes tener al menos 18 años (o la edad legal para apostar en tu jurisdicción, la que sea mayor) para crear una cuenta o usar FootyEdge. Al usar el servicio confirmas que cumples este requisito.' },
            { h: '4. Uso responsable', p: 'FootyEdge no facilita ni procesa apuestas — solo brinda información estadística. Eres responsable de cumplir con las leyes de apuestas de tu propia jurisdicción y de apostar de forma responsable. Si sientes que puedes tener un problema con el juego, busca ayuda de una organización de apoyo relevante en tu país.' },
            { h: '5. Suscripciones y pagos', p: 'Los planes pagos (Pro, Elite) se cobran de forma recurrente a través de Stripe. Puedes cancelar en cualquier momento desde la configuración de tu cuenta; tu plan sigue activo hasta el final del período de facturación actual. Los informes de análisis IA se cobran una sola vez por informe y quedan guardados para que los revises después sin costo adicional.' },
            { h: '6. Reembolsos', p: 'Como FootyEdge entrega contenido analítico digital de forma inmediata al momento de la compra, generalmente no ofrecemos reembolsos una vez iniciado un período de suscripción o generado un informe de IA. Si crees que se te cobró por error, contáctanos y lo revisaremos.' },
            { h: '7. Terminación de cuenta', p: 'Podemos suspender o cancelar cuentas que abusen del servicio, intenten evadir límites de uso o medidas de seguridad, o violen estos términos. Puedes eliminar tu cuenta en cualquier momento.' },
            { h: '8. Limitación de responsabilidad', p: 'FootyEdge, sus resultados estadísticos, rankings e informes generados por IA se ofrecen "tal cual" sin garantías de ningún tipo. No somos responsables de pérdidas financieras resultantes de decisiones de apuesta tomadas usando información de la plataforma.' },
            { h: '9. Cambios a estos términos', p: 'Podemos actualizar estos términos de vez en cuando. El uso continuado de FootyEdge después de publicados los cambios constituye la aceptación de los términos actualizados.' },
            { h: '10. Contacto', p: '¿Preguntas sobre estos términos? Escríbenos a footyedge2.0@gmail.com.' },
          ]).map((s, i) => (
            <div key={i}>
              <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 20, color: G, marginBottom: 8, textTransform: 'uppercase' }}>{s.h}</h2>
              <p style={{ color: MUTE, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{s.p}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${BORDER}`, textAlign: 'center' }}>
          <a href="/" style={{ color: G, fontSize: 13, textDecoration: 'none' }}>← {lang === 'en' ? 'Back to FootyEdge' : 'Volver a FootyEdge'}</a>
        </div>
      </div>
    </div>
  )
}
