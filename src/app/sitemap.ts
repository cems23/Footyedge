import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://footyedge.xyz/es', lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://footyedge.xyz/en', lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://footyedge.xyz/es/auth/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://footyedge.xyz/en/auth/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://footyedge.xyz/es/auth/register', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://footyedge.xyz/en/auth/register', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ]
}
