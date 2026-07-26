CREATE TABLE IF NOT EXISTS public.team_elo (
  team_id BIGINT PRIMARY KEY,
  team_name TEXT NOT NULL,
  elo_rating NUMERIC NOT NULL DEFAULT 1500,
  matches_played INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
