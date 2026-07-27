ALTER TABLE public.team_elo ADD COLUMN IF NOT EXISTS league_id BIGINT;
ALTER TABLE public.team_elo ADD COLUMN IF NOT EXISTS league_name TEXT;
ALTER TABLE public.team_elo ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE TABLE IF NOT EXISTS public.user_favorite_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL,
  team_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, team_id)
);
