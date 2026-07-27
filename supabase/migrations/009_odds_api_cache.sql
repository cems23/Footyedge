CREATE TABLE IF NOT EXISTS public.odds_api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_key TEXT NOT NULL,
  date DATE NOT NULL,
  response JSONB NOT NULL,
  requests_remaining INTEGER,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sport_key, date)
);
