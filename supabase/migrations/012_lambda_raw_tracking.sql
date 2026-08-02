-- Guardar la lambda CRUDA (antes de recortar al techo) para poder analizar la
-- distribución real de casos que llegan al límite, en vez de elegir un valor de
-- techo a ciegas. Techo subido de 3.5 a 3.7 temporalmente (30/07/2026) mientras
-- se acumulan datos suficientes para elegir un valor definitivo con evidencia real.
ALTER TABLE public.model_predictions ADD COLUMN IF NOT EXISTS raw_lambda_home numeric;
ALTER TABLE public.model_predictions ADD COLUMN IF NOT EXISTS raw_lambda_away numeric;
ALTER TABLE public.model_predictions ADD COLUMN IF NOT EXISTS lambda_home_capped boolean DEFAULT false;
ALTER TABLE public.model_predictions ADD COLUMN IF NOT EXISTS lambda_away_capped boolean DEFAULT false;
