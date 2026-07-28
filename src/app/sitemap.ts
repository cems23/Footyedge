import { MetadataRoute } from 'next'
import { getAllLeagueSlugs } from '@/lib/seo/leagueSlugs'

export default function sitemap(): MetadataRoute.Sitemap {
  const leagues = getAllLeagueSlugs()

  const leaguePages: MetadataRoute.Sitemap = leagues.flatMap((l) => [
    { url: `https://footyedge.app/es/predictions/${l.slug}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `https://footyedge.app/en/predictions/${l.slug}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.6 },
  ])

  return [
    { url: 'https://footyedge.app/es', lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://footyedge.app/en', lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://footyedge.app/es/predictions', lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: 'https://footyedge.app/en/predictions', lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: 'https://footyedge.app/es/auth/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://footyedge.app/en/auth/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://footyedge.app/es/auth/register', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://footyedge.app/en/auth/register', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    ...leaguePages,
  ]
}
