import type { Metadata } from 'next'
import { getLang } from '@/lib/i18n/translations'

export async function generateStaticParams() {
  return [{ lang: 'es' }, { lang: 'en' }]
}

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const lang = getLang(params.lang)
  const isEs = lang === 'es'

  return {
    title: isEs
      ? 'FootyEdge — Análisis matemático de fútbol | Value Bets diarias'
      : 'FootyEdge — Mathematical Football Analysis | Daily Value Bets',
    description: isEs
      ? 'Analiza más de 500 partidos de fútbol diarios con modelo Poisson + Dixon-Coles. Value bets, BTTS, Over/Under, H2H y estadísticas avanzadas. 40+ ligas.'
      : 'Analyze 500+ daily football matches with Poisson + Dixon-Coles model. Value bets, BTTS, Over/Under, H2H and advanced statistics. 40+ leagues.',
    keywords: isEs
      ? 'value bets fútbol, análisis estadístico fútbol, predicciones fútbol, BTTS, over under, Premier League, La Liga, Bundesliga, apuestas deportivas'
      : 'football value bets, statistical football analysis, football predictions, BTTS, over under, Premier League, La Liga, Bundesliga, sports betting',
    authors: [{ name: 'FootyEdge' }],
    openGraph: {
      title: isEs ? 'FootyEdge — Análisis matemático de fútbol' : 'FootyEdge — Mathematical Football Analysis',
      description: isEs
        ? 'Value bets diarias con modelo Poisson + Dixon-Coles. 40+ ligas analizadas cada día.'
        : 'Daily value bets with Poisson + Dixon-Coles model. 40+ leagues analyzed every day.',
      url: `https://footyedge.app/${lang}`,
      siteName: 'FootyEdge',
      images: [{ url: 'https://footyedge.app/logo.png', width: 400, height: 120, alt: 'FootyEdge' }],
      locale: isEs ? 'es_ES' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: isEs ? 'FootyEdge — Análisis matemático de fútbol' : 'FootyEdge — Mathematical Football Analysis',
      description: isEs
        ? 'Value bets diarias con modelo Poisson + Dixon-Coles. 40+ ligas.'
        : 'Daily value bets with Poisson + Dixon-Coles model. 40+ leagues.',
      images: ['https://footyedge.app/logo.png'],
    },
    alternates: {
      canonical: `https://footyedge.app/${lang}`,
      languages: {
        'es': 'https://footyedge.app/es',
        'en': 'https://footyedge.app/en',
        'de': 'https://footyedge.app/en',
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  }
}

export default function LangLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
