import type { Metadata } from 'next'
import { getAllLeagueSlugs } from '@/lib/seo/leagueSlugs'
import PredictionsIndexClient from './PredictionsIndexClient'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const isEs = params.lang === 'es'
  const title = isEs
    ? 'Predicciones de fútbol por liga — Todas las ligas | FootyEdge'
    : 'Football predictions by league — All leagues | FootyEdge'
  const description = isEs
    ? 'Predicciones estadísticas diarias para más de 30 ligas de fútbol en todo el mundo, calculadas con un modelo Poisson Dixon-Coles.'
    : 'Daily statistical predictions for 30+ football leagues worldwide, calculated with a Dixon-Coles Poisson model.'

  return {
    title,
    description,
    alternates: { canonical: `https://footyedge.app/${params.lang}/predictions` },
  }
}

export default function PredictionsIndexPage({ params }: { params: { lang: string } }) {
  const leagues = getAllLeagueSlugs()
  return <PredictionsIndexClient leagues={leagues} lang={params.lang} />
}
