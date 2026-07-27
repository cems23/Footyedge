CREATE TABLE IF NOT EXISTS public.elo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id BIGINT NOT NULL,
  team_name TEXT NOT NULL,
  elo_rating NUMERIC NOT NULL,
  match_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_elo_history_team ON public.elo_history(team_id, match_date);
