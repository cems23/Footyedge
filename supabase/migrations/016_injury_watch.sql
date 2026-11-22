-- Barrido global de bajas confirmadas para las competiciones seleccionadas por el administrador.
-- La configuración es única para no multiplicar las llamadas a API-Football por usuario.
CREATE TABLE IF NOT EXISTS public.injury_watch_settings (
  id TEXT PRIMARY KEY CHECK (id = 'global'),
  league_ids INTEGER[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_daily_scan_on DATE,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.injury_watch_settings (id) VALUES ('global')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.injury_watch_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger TEXT NOT NULL CHECK (trigger IN ('manual', 'daily')),
  selected_league_ids INTEGER[] NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  fixtures_scanned INTEGER NOT NULL DEFAULT 0,
  provider_calls INTEGER NOT NULL DEFAULT 0,
  cache_hits INTEGER NOT NULL DEFAULT 0,
  failed_batches INTEGER NOT NULL DEFAULT 0,
  alerts_found INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.injury_watch_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES public.injury_watch_scans(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  confirmed_injuries INTEGER NOT NULL CHECK (confirmed_injuries >= 3),
  questionable_count INTEGER NOT NULL DEFAULT 0,
  suspension_count INTEGER NOT NULL DEFAULT 0,
  players JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'API-Football /injuries',
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scan_id, match_id, team_id)
);

CREATE INDEX IF NOT EXISTS injury_watch_scans_completed_idx
  ON public.injury_watch_scans (completed_at DESC);
CREATE INDEX IF NOT EXISTS injury_watch_alerts_scan_idx
  ON public.injury_watch_alerts (scan_id, confirmed_injuries DESC);

ALTER TABLE public.injury_watch_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injury_watch_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injury_watch_alerts ENABLE ROW LEVEL SECURITY;
