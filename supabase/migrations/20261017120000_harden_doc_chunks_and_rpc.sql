-- Hardening (auditoría 2026-10-17, H-06):
-- 1) doc_chunks quedaba sin RLS: con los grants por defecto de Supabase, el rol anon podía escribir/borrar.
-- 2) match_doc_chunks sin tope de match_count y sin search_path fijo.
-- 3) cleanup_old_rate_limits (SECURITY DEFINER) ejecutable por PUBLIC.
-- Escritura de doc_chunks queda solo para service_role (que omite RLS).

ALTER TABLE public.doc_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_chunks_select_public" ON public.doc_chunks;
CREATE POLICY "doc_chunks_select_public"
  ON public.doc_chunks
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.doc_chunks FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.match_doc_chunks(
  query_embedding vector(1536),
  match_count integer DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  doc_path text,
  chunk_index integer,
  content text,
  embedding vector(1536),
  created_at timestamptz,
  similarity float
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    id,
    doc_path,
    chunk_index,
    content,
    embedding,
    created_at,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.doc_chunks
  ORDER BY embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 50)
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits() TO service_role;
