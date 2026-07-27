ALTER TABLE public.daily_rankings ADD COLUMN IF NOT EXISTS model_prob_raw NUMERIC;
ALTER TABLE public.daily_rankings ADD COLUMN IF NOT EXISTS market_implied_prob NUMERIC;
