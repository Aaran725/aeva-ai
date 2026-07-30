-- ═══════════════════════════════════════════════════════════
-- Arena: Sabotage — Persistent Stats Schema
-- Run this in the Supabase SQL Editor (once)
-- ═══════════════════════════════════════════════════════════

-- ── arena_profiles ──────────────────────────────────────────
-- One row per user. Persists across all sessions.
CREATE TABLE IF NOT EXISTS arena_profiles (
  user_id        TEXT PRIMARY KEY,           -- localStorage aeva_anon_id
  display_name   TEXT NOT NULL DEFAULT 'Player',
  elo            INT NOT NULL DEFAULT 1000,  -- all-time ELO, never resets
  season_elo     INT NOT NULL DEFAULT 1000,  -- resets per season
  wins           INT NOT NULL DEFAULT 0,
  losses         INT NOT NULL DEFAULT 0,
  total_games    INT NOT NULL DEFAULT 0,
  total_score    BIGINT NOT NULL DEFAULT 0,
  avg_score      INT NOT NULL DEFAULT 0,
  accuracy_pct   FLOAT NOT NULL DEFAULT 0,   -- lifetime correct answer %
  topic_accuracy JSONB NOT NULL DEFAULT '{}',-- { "Biology": 0.71, "WW2": 0.38 }
  title_badge    TEXT,                       -- "S1 Champion" etc, null if none
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── arena_sessions ──────────────────────────────────────────
-- One row per game played.
CREATE TABLE IF NOT EXISTS arena_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code      TEXT NOT NULL,
  topic          TEXT NOT NULL,
  difficulty     TEXT NOT NULL DEFAULT 'medium',
  question_count INT NOT NULL DEFAULT 10,
  player_count   INT NOT NULL DEFAULT 1,
  host_user_id   TEXT,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at       TIMESTAMPTZ
);

-- ── arena_results ───────────────────────────────────────────
-- One row per player per session.
CREATE TABLE IF NOT EXISTS arena_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES arena_sessions(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL,
  display_name    TEXT NOT NULL DEFAULT 'Player',
  final_score     INT NOT NULL DEFAULT 0,
  rank            INT NOT NULL DEFAULT 1,
  correct_count   INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  elo_before      INT NOT NULL DEFAULT 1000,
  elo_after       INT NOT NULL DEFAULT 1000,
  elo_delta       INT NOT NULL DEFAULT 0,
  cards_played    JSONB NOT NULL DEFAULT '[]',  -- [{ card, target }]
  answers         JSONB NOT NULL DEFAULT '[]',  -- [{ qIdx, choiceIdx, timeMs, correct }]
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── arena_seasons ───────────────────────────────────────────
-- One row per season. Manually created, manually ended.
CREATE TABLE IF NOT EXISTS arena_seasons (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at   TIMESTAMPTZ NOT NULL,
  active    BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed Season 1 (90-day season starting now)
INSERT INTO arena_seasons (name, starts_at, ends_at, active)
VALUES ('Season 1', NOW(), NOW() + INTERVAL '90 days', TRUE)
ON CONFLICT DO NOTHING;

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_arena_results_user_id    ON arena_results(user_id);
CREATE INDEX IF NOT EXISTS idx_arena_results_session_id ON arena_results(session_id);
CREATE INDEX IF NOT EXISTS idx_arena_profiles_elo       ON arena_profiles(elo DESC);
CREATE INDEX IF NOT EXISTS idx_arena_profiles_season    ON arena_profiles(season_elo DESC);

-- ── Global leaderboard view ─────────────────────────────────
CREATE OR REPLACE VIEW arena_leaderboard AS
SELECT
  user_id,
  display_name,
  elo,
  season_elo,
  wins,
  losses,
  total_games,
  avg_score,
  accuracy_pct,
  title_badge,
  ROW_NUMBER() OVER (ORDER BY elo DESC) AS global_rank
FROM arena_profiles
WHERE total_games > 0
ORDER BY elo DESC
LIMIT 100;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE arena_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_results  ENABLE ROW LEVEL SECURITY;

-- Open policies (anon-ID based, not Supabase Auth — tighten later)
CREATE POLICY "arena_profiles_select" ON arena_profiles FOR SELECT USING (true);
CREATE POLICY "arena_profiles_insert" ON arena_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "arena_profiles_update" ON arena_profiles FOR UPDATE USING (true);

CREATE POLICY "arena_sessions_select" ON arena_sessions FOR SELECT USING (true);
CREATE POLICY "arena_sessions_insert" ON arena_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "arena_sessions_update" ON arena_sessions FOR UPDATE USING (true);

CREATE POLICY "arena_results_select"  ON arena_results  FOR SELECT USING (true);
CREATE POLICY "arena_results_insert"  ON arena_results  FOR INSERT WITH CHECK (true);
