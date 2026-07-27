import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://footyedge.app/es', lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://footyedge.app/en', lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://footyedge.app/es/auth/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://footyedge.app/en/auth/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://footyedge.app/es/auth/register', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://footyedge.app/en/auth/register', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ]
}
