-- ═══════════════════════════════════════════════════════════
-- Arena: Sabotage — Question Cache & Quality Layer
-- Run this in the Supabase SQL Editor (once, after arena_stats_setup.sql)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS arena_question_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic         TEXT NOT NULL,
  topic_key     TEXT NOT NULL,            -- normalised slug e.g. "world_war_ii"
  question_text TEXT NOT NULL,
  choices       JSONB NOT NULL,           -- ["A","B","C","D"]
  correct_idx   INT  NOT NULL DEFAULT 0,
  explanation   TEXT,
  confidence    FLOAT NOT NULL DEFAULT 1.0, -- model self-rated 0–1
  category      TEXT,                     -- model-assigned category label
  quality_score FLOAT NOT NULL DEFAULT 0.5, -- thumbs_up / total_votes
  thumbs_up     INT  NOT NULL DEFAULT 0,
  thumbs_down   INT  NOT NULL DEFAULT 0,
  total_votes   INT  NOT NULL DEFAULT 0,
  in_library    BOOLEAN NOT NULL DEFAULT FALSE, -- quality_score ≥ 0.8 AND total_votes ≥ 5
  suspect       BOOLEAN NOT NULL DEFAULT FALSE, -- quality_score < 0.3 AND total_votes ≥ 3
  raw_response  JSONB,                    -- { model, usage } for audit
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aqc_topic_key   ON arena_question_cache(topic_key);
CREATE INDEX IF NOT EXISTS idx_aqc_library     ON arena_question_cache(in_library) WHERE in_library = TRUE;
CREATE INDEX IF NOT EXISTS idx_aqc_not_suspect ON arena_question_cache(suspect) WHERE suspect = FALSE;

ALTER TABLE arena_question_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aqc_select" ON arena_question_cache FOR SELECT USING (true);
CREATE POLICY "aqc_insert" ON arena_question_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "aqc_update" ON arena_question_cache FOR UPDATE USING (true);
