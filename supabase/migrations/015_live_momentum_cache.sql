-- Cache de corta duración para el pulso de partidos solicitado manualmente.
-- No hay polling automático: la ruta solo consulta al proveedor tras una acción
-- explícita del usuario y reutiliza este payload durante cinco minutos.
CREATE TABLE IF NOT EXISTS public.live_momentum_cache (
  match_id UUID PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.live_momentum_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS live_momentum_cache_cached_at_idx
  ON public.live_momentum_cache (cached_at DESC);
