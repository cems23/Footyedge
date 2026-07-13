-- ════════════════════════════════════════════════════════════
-- FootyEdge 2.0 — Schema Completo Supabase
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email                 TEXT NOT NULL,
  username              TEXT UNIQUE,
  plan                  TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','elite')),
  subscription_status   TEXT DEFAULT 'active',
  subscription_ends_at  TIMESTAMPTZ,
  bankroll              DECIMAL(12,2) DEFAULT 100.00,
  initial_bankroll      DECIMAL(12,2) DEFAULT 100.00,
  picks_today           INTEGER DEFAULT 0,
  picks_today_date      DATE DEFAULT CURRENT_DATE,
  notifications_enabled BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own" ON public.users FOR ALL USING (auth.uid() = id);

-- ── SUPPORTED LEAGUES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supported_leagues (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  country     TEXT,
  sport_key   TEXT,
  weight      DECIMAL(4,2) DEFAULT 0.90,
  is_active   BOOLEAN DEFAULT true,
  season      INTEGER DEFAULT 2024
);

INSERT INTO public.supported_leagues VALUES
  (39,  'Premier League',     'England', 'soccer_epl',                  1.00, true, 2024),
  (140, 'La Liga',            'Spain',   'soccer_spain_la_liga',         0.98, true, 2024),
  (78,  'Bundesliga',         'Germany', 'soccer_germany_bundesliga',    0.96, true, 2024),
  (135, 'Serie A',            'Italy',   'soccer_italy_serie_a',         0.95, true, 2024),
  (61,  'Ligue 1',            'France',  'soccer_france_ligue_one',      0.92, true, 2024),
  (2,   'Champions League',   'Europe',  'soccer_uefa_champs_league',    0.97, true, 2024),
  (3,   'Europa League',      'Europe',  'soccer_uefa_europa_league',    0.90, true, 2024)
ON CONFLICT (id) DO NOTHING;

-- ── MATCHES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matches (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  external_id     TEXT UNIQUE NOT NULL,
  league_id       INTEGER,
  league_name     TEXT,
  season          INTEGER,
  home_team_id    INTEGER,
  home_team_name  TEXT,
  home_team_logo  TEXT,
  away_team_id    INTEGER,
  away_team_name  TEXT,
  away_team_logo  TEXT,
  kickoff_at      TIMESTAMPTZ,
  status          TEXT DEFAULT 'scheduled',
  home_goals      INTEGER,
  away_goals      INTEGER,
  result          TEXT,
  over25_result   BOOLEAN,
  btts_result     BOOLEAN,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_read" ON public.matches FOR SELECT USING (true);
CREATE POLICY "matches_write" ON public.matches FOR ALL USING (true);

CREATE INDEX idx_matches_kickoff ON public.matches(kickoff_at);
CREATE INDEX idx_matches_status  ON public.matches(status);
CREATE INDEX idx_matches_league  ON public.matches(league_id, season);

-- ── MODEL PREDICTIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.model_predictions (
  id                      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id                UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  generated_at            TIMESTAMPTZ DEFAULT NOW(),
  model_version           TEXT DEFAULT '2.0',
  expected_goals_home     DECIMAL(6,4),
  expected_goals_away     DECIMAL(6,4),
  form_factor_home        DECIMAL(6,4),
  form_factor_away        DECIMAL(6,4),
  prob_home_win           DECIMAL(6,4),
  prob_draw               DECIMAL(6,4),
  prob_away_win           DECIMAL(6,4),
  prob_over25             DECIMAL(6,4),
  prob_btts               DECIMAL(6,4),
  league_avg_home_goals   DECIMAL(6,4),
  league_avg_away_goals   DECIMAL(6,4),
  UNIQUE(match_id, model_version)
);

ALTER TABLE public.model_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preds_read"  ON public.model_predictions FOR SELECT USING (true);
CREATE POLICY "preds_write" ON public.model_predictions FOR ALL USING (true);

-- ── ODDS SNAPSHOTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.odds_snapshots (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id      UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  captured_at   TIMESTAMPTZ DEFAULT NOW(),
  source        TEXT DEFAULT 'odds_api',
  odds_home     DECIMAL(8,4),
  odds_draw     DECIMAL(8,4),
  odds_away     DECIMAL(8,4),
  odds_over25   DECIMAL(8,4),
  odds_under25  DECIMAL(8,4),
  odds_btts_yes DECIMAL(8,4),
  is_closing    BOOLEAN DEFAULT false
);

ALTER TABLE public.odds_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "odds_read"  ON public.odds_snapshots FOR SELECT USING (true);
CREATE POLICY "odds_write" ON public.odds_snapshots FOR ALL USING (true);

CREATE INDEX idx_odds_match ON public.odds_snapshots(match_id, captured_at DESC);

-- ── PICKS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.picks (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE,
  match_id          UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  odds_snapshot_id  UUID REFERENCES public.odds_snapshots(id),
  market            TEXT NOT NULL CHECK (market IN ('home','draw','away','over25','btts')),
  market_label      TEXT,
  odds              DECIMAL(8,4) NOT NULL,
  stake             DECIMAL(10,2) DEFAULT 1.00,
  model_prob        DECIMAL(6,4) NOT NULL,
  implied_prob      DECIMAL(6,4),
  edge              DECIMAL(6,4),
  ev                DECIMAL(6,4),
  confidence_score  INTEGER,
  kelly_stake       DECIMAL(6,4),
  result            TEXT DEFAULT 'pending' CHECK (result IN ('pending','win','loss','void')),
  profit            DECIMAL(10,2) DEFAULT 0,
  settled_at        TIMESTAMPTZ,
  closing_odds      DECIMAL(8,4),
  clv               DECIMAL(6,4),
  is_system_pick    BOOLEAN DEFAULT false,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "picks_own"   ON public.picks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "picks_service" ON public.picks FOR ALL USING (true);

CREATE INDEX idx_picks_user   ON public.picks(user_id, created_at DESC);
CREATE INDEX idx_picks_match  ON public.picks(match_id);
CREATE INDEX idx_picks_result ON public.picks(user_id, result);

-- ── RESULTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.results (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id            UUID REFERENCES public.matches(id) UNIQUE,
  final_score_home    INTEGER NOT NULL,
  final_score_away    INTEGER NOT NULL,
  result              TEXT NOT NULL CHECK (result IN ('home','draw','away')),
  over25              BOOLEAN NOT NULL,
  btts                BOOLEAN NOT NULL,
  confirmed_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results_read"  ON public.results FOR SELECT USING (true);
CREATE POLICY "results_write" ON public.results FOR ALL USING (true);

-- ── DAILY RANKINGS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_rankings (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date              DATE NOT NULL,
  rank              INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 5),
  match_id          UUID REFERENCES public.matches(id),
  market            TEXT,
  market_label      TEXT,
  odds              DECIMAL(8,4),
  ev                DECIMAL(6,4),
  edge              DECIMAL(6,4),
  confidence_score  INTEGER,
  rank_score        DECIMAL(10,8),
  is_pro_only       BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, rank)
);

ALTER TABLE public.daily_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rankings_free" ON public.daily_rankings FOR SELECT USING (
  NOT is_pro_only OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND plan IN ('pro','elite')
  )
);
CREATE POLICY "rankings_write" ON public.daily_rankings FOR ALL USING (true);

CREATE INDEX idx_rankings_date ON public.daily_rankings(date DESC);

-- ── BACKTESTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.backtests (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  model_version TEXT DEFAULT '2.0',
  league_ids    INTEGER[],
  seasons       INTEGER[],
  date_from     DATE,
  date_to       DATE,
  total_picks   INTEGER,
  wins          INTEGER,
  win_rate      DECIMAL(6,4),
  roi           DECIMAL(8,4),
  yield         DECIMAL(8,4),
  max_drawdown  DECIMAL(8,4),
  avg_ev        DECIMAL(6,4),
  avg_edge      DECIMAL(6,4),
  parameters    JSONB,
  equity_curve  JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── FUNCTIONS ────────────────────────────────────────────────

-- Reset picks diarios automáticamente
CREATE OR REPLACE FUNCTION public.check_pick_limit(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_plan TEXT; v_count INTEGER; v_date DATE;
BEGIN
  SELECT plan, picks_today, picks_today_date INTO v_plan, v_count, v_date FROM public.users WHERE id = p_user_id;
  IF v_plan IN ('pro','elite') THEN RETURN TRUE; END IF;
  IF v_date < CURRENT_DATE THEN
    UPDATE public.users SET picks_today = 0, picks_today_date = CURRENT_DATE WHERE id = p_user_id;
    RETURN TRUE;
  END IF;
  RETURN v_count < 3;
END; $$;

-- Incrementar contador de picks
CREATE OR REPLACE FUNCTION public.increment_picks_today()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
END; $$;

CREATE TRIGGER trg_increment_picks AFTER INSERT ON public.picks
  FOR EACH ROW EXECUTE FUNCTION public.increment_picks_today();

-- Vista de performance del usuario
CREATE OR REPLACE VIEW public.user_performance AS
SELECT
  p.user_id,
  COUNT(*) FILTER (WHERE p.result IN ('win','loss'))                                AS settled_bets,
  COUNT(*) FILTER (WHERE p.result = 'win')                                          AS wins,
  COUNT(*) FILTER (WHERE p.result = 'loss')                                         AS losses,
  ROUND(COUNT(*) FILTER (WHERE p.result = 'win')::DECIMAL /
    NULLIF(COUNT(*) FILTER (WHERE p.result IN ('win','loss')), 0) * 100, 2)         AS win_rate,
  COALESCE(SUM(p.stake) FILTER (WHERE p.result IN ('win','loss')), 0)               AS total_staked,
  COALESCE(SUM(p.profit) FILTER (WHERE p.result IN ('win','loss')), 0)              AS total_profit,
  ROUND(COALESCE(SUM(p.profit),0) / NULLIF(COALESCE(SUM(p.stake),0),0) * 100, 2)   AS roi,
  ROUND(AVG(p.ev) FILTER (WHERE p.result IN ('win','loss')), 4)                     AS avg_ev,
  ROUND(AVG(p.edge) FILTER (WHERE p.result IN ('win','loss')), 4)                   AS avg_edge,
  ROUND(AVG(p.odds) FILTER (WHERE p.result IN ('win','loss')), 2)                   AS avg_odds
FROM public.picks p
GROUP BY p.user_id;

-- Handle new user on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email) VALUES (NEW.id, NEW.email) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
