"use client"
import { useState } from "react"

const BG = '#070d1a'
const CARD = 'rgba(13,30,53,0.6)'
const BORDER = '#1a2e4a'
const G = '#00c878'
const MUTE = '#8ba2c0'
const WHITE = '#f2f6ff'

export default function PrivacyPage() {
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
          {lang === 'en' ? 'Privacy Policy' : 'Política de Privacidad'}
        </h1>
        <p style={{ color: MUTE, fontSize: 13, marginBottom: 40 }}>
          {lang === 'en' ? 'Last updated: July 2026' : 'Última actualización: julio de 2026'}
        </p>

        <div style={{ display: 'grid', gap: 28 }}>
          {(lang === 'en' ? [
            { h: '1. Who we are', p: 'FootyEdge ("we", "us") operates footyedge.app and footyedge.xyz, a football statistics and betting analytics platform. This policy explains what data we collect, why, and how you can control it.' },
            { h: '2. Data we collect', p: 'Account data: email address and password (handled securely via Supabase Auth). Usage data: your bankroll settings, favorite teams, and tracked bet history that you enter yourself. Payment data: when you subscribe to a paid plan or purchase an AI report, payments are processed by Stripe — we never see or store your card details.' },
            { h: '3. Third-party services we use', p: 'To provide the service we share limited data with: Supabase (database and authentication hosting), Stripe (payment processing), Vercel (application hosting), and, only when you request an AI match analysis, Anthropic (to generate the report, with web search enabled for real-time context like injuries and news). We also pull public football data from API-Football, FootyStats and The Odds API — no personal data is sent to these providers.' },
            { h: '4. Cookies and local storage', p: 'We use essential cookies to keep you signed in and to remember your language and interface preferences. We do not use third-party advertising or tracking cookies.' },
            { h: '5. Your rights', p: 'You can access, correct, export, or delete your account data at any time by contacting us. Deleting your account removes your personal data from our systems, except where we are required to retain records (e.g. payment records for tax/accounting purposes).' },
            { h: '6. Data retention', p: 'We keep your account data for as long as your account is active. Bet tracking history and AI analysis reports you generate are stored so you can review them later, and are deleted if you delete your account.' },
            { h: '7. Age requirement', p: 'FootyEdge is intended for users aged 18 and over. We do not knowingly collect data from minors.' },
            { h: '8. Changes to this policy', p: 'We may update this policy from time to time. Material changes will be reflected with an updated "last updated" date above.' },
            { h: '9. Contact', p: 'Questions about this policy or your data? Email us at footyedge2.0@gmail.com.' },
          ] : [
            { h: '1. Quiénes somos', p: 'FootyEdge ("nosotros") opera footyedge.app y footyedge.xyz, una plataforma de estadísticas de fútbol y analítica de apuestas. Esta política explica qué datos recopilamos, por qué, y cómo puedes controlarlos.' },
            { h: '2. Datos que recopilamos', p: 'Datos de cuenta: email y contraseña (gestionados de forma segura vía Supabase Auth). Datos de uso: tu configuración de bankroll, equipos favoritos e historial de apuestas que registras tú mismo. Datos de pago: cuando te suscribes a un plan pago o compras un informe de IA, los pagos los procesa Stripe — nunca vemos ni almacenamos los datos de tu tarjeta.' },
            { h: '3. Servicios de terceros que usamos', p: 'Para brindar el servicio compartimos datos limitados con: Supabase (base de datos y autenticación), Stripe (procesamiento de pagos), Vercel (hosting de la aplicación), y, solo cuando solicitas un análisis de partido con IA, Anthropic (para generar el informe, con búsqueda web habilitada para contexto en tiempo real como lesiones y noticias). También obtenemos datos públicos de fútbol de API-Football, FootyStats y The Odds API — no se envían datos personales a estos proveedores.' },
            { h: '4. Cookies y almacenamiento local', p: 'Usamos cookies esenciales para mantener tu sesión iniciada y recordar tus preferencias de idioma e interfaz. No usamos cookies de publicidad o rastreo de terceros.' },
            { h: '5. Tus derechos', p: 'Puedes acceder, corregir, exportar o eliminar los datos de tu cuenta en cualquier momento contactándonos. Eliminar tu cuenta borra tus datos personales de nuestros sistemas, salvo cuando debamos conservar registros (ej. registros de pago por motivos contables/fiscales).' },
            { h: '6. Retención de datos', p: 'Conservamos los datos de tu cuenta mientras esté activa. El historial de apuestas trackeadas y los informes de IA que generas se almacenan para que puedas revisarlos después, y se eliminan si borras tu cuenta.' },
            { h: '7. Requisito de edad', p: 'FootyEdge está pensado para usuarios de 18 años o más. No recopilamos datos de menores de forma consciente.' },
            { h: '8. Cambios a esta política', p: 'Podemos actualizar esta política de vez en cuando. Los cambios importantes se reflejarán con una fecha de "última actualización" nueva arriba.' },
            { h: '9. Contacto', p: '¿Preguntas sobre esta política o tus datos? Escríbenos a footyedge2.0@gmail.com.' },
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
