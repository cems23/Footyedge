-- ── AI MATCH ANALYSIS (pago único, 1.39€ por partido) ──────────
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id        UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'pending',
  content         TEXT,
  stripe_session_id TEXT,
  paid_at         TIMESTAMPTZ,
  generated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_analyses_own" ON public.ai_analyses
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_ai_analyses_match ON public.ai_analyses(match_id);
CREATE INDEX idx_ai_analyses_user  ON public.ai_analyses(user_id);
