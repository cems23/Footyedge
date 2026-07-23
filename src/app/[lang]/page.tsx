import LandingV7 from '@/components/landing/LandingV7'

export async function generateStaticParams() {
  return [{ lang: 'es' }, { lang: 'en' }]
}

export default function LandingPage({ params }: { params: { lang: string } }) {
  return <LandingV7 lang={params.lang} />
}
