-- ─────────────────────────────────────────────────────────────────────────────
-- 0004_document_chunks.sql
--
-- Postgres-native full-text search fallback for when Moss cloud is unavailable.
-- Chunk IDs mirror the Moss chunk ID format ({doc_id}-p{page}-c{idx}) so
-- upserts in the ingestion pipeline are idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table document_chunks (
  id          text        primary key,   -- {doc.id}-p{page}-c{chunkIdx}
  document_id uuid        not null references documents(id) on delete cascade,
  product_id  uuid        not null references products(id)  on delete cascade,
  title       text        not null,
  page        int         not null,
  content     text        not null,
  created_at  timestamptz not null default now()
);

-- Full-text search (used by @@ operator in search_document_chunks)
create index document_chunks_fts_idx
  on document_chunks
  using gin(to_tsvector('english', content));

-- Product filter (always ANDed with the FTS predicate)
create index document_chunks_product_id_idx
  on document_chunks (product_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table document_chunks enable row level security;

-- Anyone can read chunks (the assistant uses the admin client, but public
-- product pages could eventually surface these too).
create policy "Public read document_chunks"
  on document_chunks for select to anon, authenticated
  using (true);

-- Writes are performed exclusively by the ingestion pipeline via the service
-- role key (createAdminClient), which bypasses RLS.  No user-facing write
-- policy is needed.

-- ── Ranked full-text search function ─────────────────────────────────────────

create or replace function search_document_chunks(
  p_product_id uuid,
  p_query      text,
  p_limit      int  default 5
)
returns table (
  id       text,
  title    text,
  page     int,
  content  text,
  rank     real
)
language sql stable as $$
  select
    id,
    title,
    page,
    content,
    ts_rank(
      to_tsvector('english', content),
      websearch_to_tsquery('english', p_query)
    ) as rank
  from  document_chunks
  where product_id = p_product_id
    and to_tsvector('english', content)
        @@ websearch_to_tsquery('english', p_query)
  order by rank desc
  limit p_limit;
$$;
