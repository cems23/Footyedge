-- Contexto automático para los picks que pasan el filtro estadístico.
-- Es independiente de ai_analyses: ese informe sigue siendo el producto
-- narrativo individual de pago; aquí se guarda el control editorial del pick.
CREATE TABLE IF NOT EXISTS public.ai_signal_checks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  market TEXT NOT NULL,
  model_prob NUMERIC,
  adjustment NUMERIC NOT NULL DEFAULT 0,
  confidence_penalty NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  raw_response TEXT,
  context TEXT,
  provider_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_fingerprint TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, market)
);

ALTER TABLE public.ai_signal_checks ADD COLUMN IF NOT EXISTS context TEXT;
ALTER TABLE public.ai_signal_checks ADD COLUMN IF NOT EXISTS provider_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.ai_signal_checks ADD COLUMN IF NOT EXISTS provider_fingerprint TEXT;
ALTER TABLE public.ai_signal_checks ADD COLUMN IF NOT EXISTS sources JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.ai_signal_checks ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.ai_signal_budget (
  month TEXT PRIMARY KEY,
  spent_usd NUMERIC NOT NULL DEFAULT 0,
  calls_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_signal_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_signal_budget ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_signal_checks_read_authenticated" ON public.ai_signal_checks;
CREATE POLICY "ai_signal_checks_read_authenticated" ON public.ai_signal_checks
  FOR SELECT TO authenticated USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_signal_checks_match_market_unique
  ON public.ai_signal_checks(match_id, market);
