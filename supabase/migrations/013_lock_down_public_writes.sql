-- Close anonymous and user-session write paths. Scheduled jobs and payment
-- handlers use the server-side service role and continue to bypass RLS.
BEGIN;

DROP POLICY IF EXISTS "matches_write" ON public.matches;
DROP POLICY IF EXISTS "preds_write" ON public.model_predictions;
DROP POLICY IF EXISTS "odds_write" ON public.odds_snapshots;
DROP POLICY IF EXISTS "results_write" ON public.results;
DROP POLICY IF EXISTS "rankings_write" ON public.daily_rankings;
DROP POLICY IF EXISTS "picks_service" ON public.picks;
DROP POLICY IF EXISTS "users_own" ON public.users;
DROP POLICY IF EXISTS "own user" ON public.users;
DROP POLICY IF EXISTS "picks_own" ON public.picks;
DROP POLICY IF EXISTS "own picks" ON public.picks;
DROP POLICY IF EXISTS "ai_analyses_own" ON public.ai_analyses;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "picks_select_own" ON public.picks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "picks_insert_own" ON public.picks
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND is_system_pick IS FALSE
    AND public.check_pick_limit(user_id)
  );
CREATE POLICY "picks_delete_own" ON public.picks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "ai_analyses_select_own" ON public.ai_analyses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.check_pick_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_plan TEXT; v_count INTEGER; v_date DATE;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RETURN FALSE; END IF;
  SELECT plan, picks_today, picks_today_date INTO v_plan, v_count, v_date
  FROM public.users WHERE id = p_user_id;
  IF v_plan IN ('pro','elite') THEN RETURN TRUE; END IF;
  IF v_date < CURRENT_DATE THEN
    UPDATE public.users SET picks_today = 0, picks_today_date = CURRENT_DATE WHERE id = p_user_id;
    RETURN TRUE;
  END IF;
  RETURN v_count < 3;
END;
$$;

REVOKE ALL ON FUNCTION public.check_pick_limit(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_pick_limit(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_picks_today()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NOT NEW.is_system_pick THEN
    UPDATE public.users
    SET picks_today = picks_today + 1, picks_today_date = CURRENT_DATE
    WHERE id = NEW.user_id AND picks_today_date = CURRENT_DATE;
    IF NOT FOUND THEN
      UPDATE public.users SET picks_today = 1, picks_today_date = CURRENT_DATE WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

ALTER VIEW public.user_performance SET (security_invoker = true);

COMMIT;
