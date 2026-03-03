-- Use this for DB: reports-ai, schema: public
-- Safe re-run script (CREATE IF NOT EXISTS)

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.documents (
  id BIGSERIAL PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(768) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_documents_source ON public.documents(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_documents_active ON public.documents(is_active);
CREATE INDEX IF NOT EXISTS idx_documents_metadata_gin ON public.documents USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_documents_embedding_ivfflat
  ON public.documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 200);

CREATE TABLE IF NOT EXISTS public.question_answer_cache (
  id BIGSERIAL PRIMARY KEY,
  normalized_question TEXT NOT NULL,
  question_hash CHAR(64) NOT NULL,
  question_embedding vector(768) NOT NULL,
  intent TEXT,
  entities JSONB NOT NULL DEFAULT '{}'::jsonb,
  sql_text TEXT,
  sql_params JSONB NOT NULL DEFAULT '[]'::jsonb,
  answer_text TEXT NOT NULL,
  answer_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0.0,
  source_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_hit_at TIMESTAMPTZ,
  hit_count BIGINT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_qa_cache_hash ON public.question_answer_cache(question_hash);
CREATE INDEX IF NOT EXISTS idx_qa_cache_entities_gin ON public.question_answer_cache USING GIN (entities);
CREATE INDEX IF NOT EXISTS idx_qa_cache_embedding_ivfflat
  ON public.question_answer_cache USING ivfflat (question_embedding vector_cosine_ops) WITH (lists = 200);

CREATE TABLE IF NOT EXISTS public.feedback (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL,
  cache_id BIGINT REFERENCES public.question_answer_cache(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  is_correct BOOLEAN,
  user_comment TEXT,
  correction_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_feedback_request ON public.feedback(request_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);

CREATE TABLE IF NOT EXISTS public.query_logs (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL UNIQUE,
  user_id TEXT,
  tenant_id TEXT,
  question_text TEXT NOT NULL,
  normalized_question TEXT NOT NULL,
  cache_layer_hit TEXT NOT NULL,
  semantic_score NUMERIC(5,4),
  sql_generated BOOLEAN NOT NULL DEFAULT FALSE,
  sql_safe BOOLEAN NOT NULL DEFAULT FALSE,
  sql_text TEXT,
  row_count INTEGER,
  gemini_calls INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  error_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON public.query_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_query_logs_cache_layer ON public.query_logs(cache_layer_hit);
CREATE INDEX IF NOT EXISTS idx_query_logs_status ON public.query_logs(status);

CREATE TABLE IF NOT EXISTS public.question_sql_registry (
  id BIGSERIAL PRIMARY KEY,
  source_name TEXT NOT NULL DEFAULT 'delete_js',
  question_text TEXT NOT NULL,
  normalized_question TEXT NOT NULL UNIQUE,
  sql_text TEXT NOT NULL,
  source_tables TEXT[] NOT NULL DEFAULT '{}'::text[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  hit_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_hit_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_question_sql_registry_active
  ON public.question_sql_registry(is_active, normalized_question);

COMMIT;

-- Verify
SELECT extname, extversion, extnamespace::regnamespace::text AS extension_schema
FROM pg_extension
WHERE extname = 'vector';

SELECT
  to_regclass('public.documents') AS documents,
  to_regclass('public.question_answer_cache') AS question_answer_cache,
  to_regclass('public.feedback') AS feedback,
  to_regclass('public.query_logs') AS query_logs,
  to_regclass('public.question_sql_registry') AS question_sql_registry;
