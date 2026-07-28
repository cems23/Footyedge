import { ACTIVE_LEAGUES } from '@/lib/api/football'

export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getLeagueBySlug(slug: string) {
  return ACTIVE_LEAGUES.find((l) => slugify(l.name) === slug) ?? null
}

export function getAllLeagueSlugs() {
  return ACTIVE_LEAGUES.map((l) => ({ slug: slugify(l.name), id: l.id, name: l.name }))
}
