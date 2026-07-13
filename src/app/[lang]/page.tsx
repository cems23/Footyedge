import LandingClient from '@/components/landing/LandingClient'
import { getLang } from '@/lib/i18n/translations'

export async function generateStaticParams() {
  return [{ lang: 'es' }, { lang: 'en' }]
}

export default function LandingPage({ params }: { params: { lang: string } }) {
  const lang = getLang(params.lang)
  return <LandingClient lang={lang} />
}
