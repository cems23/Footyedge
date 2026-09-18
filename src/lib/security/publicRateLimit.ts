import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type PublicRateLimitOptions = {
  prefix: string
  requests: number
}

// Public endpoints should never start with an invalid Redis client. The caller
// still handles runtime availability separately, since credentials can be
// rotated after a function instance has started.
export function createPublicRateLimit({ prefix, requests }: PublicRateLimitOptions) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(requests, '1 m'),
    prefix,
  })
}
