CREATE TABLE IF NOT EXISTS public.probability_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id),
  market TEXT NOT NULL,              -- 'btts', más adelante 'over15', 'over25', etc.
  predicted_prob NUMERIC NOT NULL,
  date DATE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league_name TEXT,
  result TEXT,                        -- 'win' | 'loss' | null (sin liquidar aún)
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, market)
);
