import LandingClient from '@/components/landing/LandingClient'
import LandingV7 from '@/components/landing/LandingV7'
import { getLang } from '@/lib/i18n/translations'

export async function generateStaticParams() {
  return [{ lang: 'es' }, { lang: 'en' }]
}

export default function LandingPage({ params }: { params: { lang: string } }) {
  if (params.lang === 'en') return <LandingV7 />
  const lang = getLang(params.lang)
  return <LandingClient lang={lang} />
}
