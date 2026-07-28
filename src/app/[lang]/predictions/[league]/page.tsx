import type { Metadata } from 'next'
import { getLeagueBySlug } from '@/lib/seo/leagueSlugs'
import { notFound } from 'next/navigation'
import PredictionsLeagueClient from './PredictionsLeagueClient'

export const revalidate = 1800 // 30 minutos

export async function generateMetadata({ params }: { params: { lang: string; league: string } }): Promise<Metadata> {
  const league = getLeagueBySlug(params.league)
  if (!league) return { title: 'FootyEdge' }

  const isEs = params.lang === 'es'
  const title = isEs
    ? `Predicciones de ${league.name} hoy — Probabilidades y análisis | FootyEdge`
    : `${league.name} predictions today — Odds & analysis | FootyEdge`
  const description = isEs
    ? `Predicciones estadísticas para los partidos de ${league.name} de hoy: probabilidades de victoria, Over 2.5 y BTTS calculadas con un modelo Poisson Dixon-Coles.`
    : `Statistical predictions for today's ${league.name} matches: win probabilities, Over 2.5 and BTTS calculated with a Dixon-Coles Poisson model.`

  return {
    title,
    description,
    alternates: {
      canonical: `https://footyedge.app/${params.lang}/predictions/${params.league}`,
    },
    openGraph: { title, description },
  }
}

export default function PredictionsLeaguePage({ params }: { params: { lang: string; league: string } }) {
  const league = getLeagueBySlug(params.league)
  if (!league) notFound()

  return <PredictionsLeagueClient leagueId={league.id} leagueName={league.name} lang={params.lang} />
}
