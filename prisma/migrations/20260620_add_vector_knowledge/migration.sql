CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public."KnowledgeChunk"
ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT '';

ALTER TABLE public."KnowledgeChunk"
ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

CREATE INDEX IF NOT EXISTS knowledge_chunk_embedding_idx
ON public."KnowledgeChunk"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);