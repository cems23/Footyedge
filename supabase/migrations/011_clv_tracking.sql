-- CLV (Closing Line Value) tracking — solo para las 6 ligas grandes con
-- consenso de Odds API (Champions, PL, LaLiga, SerieA, Bundesliga, Ligue1).
-- Compara la cuota al momento de publicar una value bet ("apertura") contra
-- la cuota justo antes del kickoff ("cierre"), para medir si el modelo
-- detecta valor real antes de que el mercado lo corrija.

CREATE TABLE IF NOT EXISTS public.clv_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  market text NOT NULL,
  league_id integer,
  kickoff_at timestamptz NOT NULL,
  opening_odds numeric NOT NULL,
  opening_captured_at timestamptz NOT NULL DEFAULT now(),
  closing_odds numeric,
  closing_captured_at timestamptz,
  clv_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, market)
);

CREATE INDEX IF NOT EXISTS clv_tracking_pending_idx
  ON public.clv_tracking (kickoff_at) WHERE closing_odds IS NULL;

-- odds_api_cache: pasar de "1 fila por liga por día" a "1 fila por liga por
-- bloque de 30 min" — necesario para poder pedir una cuota fresca cerca del
-- kickoff sin depender de la cuota congelada de la mañana. hour_bucket debe
-- incluir fecha+hora completa (ej. '2026-07-29T14:30'), no solo la hora,
-- para no confundir el mismo bloque horario de días distintos.
ALTER TABLE public.odds_api_cache ADD COLUMN IF NOT EXISTS hour_bucket text;

ALTER TABLE public.odds_api_cache DROP CONSTRAINT IF EXISTS odds_api_cache_sport_key_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS odds_api_cache_sport_bucket_idx
  ON public.odds_api_cache (sport_key, hour_bucket);
