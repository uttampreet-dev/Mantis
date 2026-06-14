import { MossClient, type DocumentInfo } from "@moss-dev/moss";
import { createAdminClient } from "@/lib/supabase/admin";

export type { DocumentInfo };

export const moss = new MossClient(
  process.env.MOSS_PROJECT_ID!,
  process.env.MOSS_PROJECT_KEY!
);

const INDEX = "product_knowledge";

/** Shared result shape returned by both queryKnowledge and queryKnowledgeFallback. */
export interface ChunkResult {
  text: string;
  score?: number;
  metadata: Record<string, unknown>;
}

function is5xx(err: unknown): boolean {
  return err instanceof Error && /status:\s*5\d{2}/.test(err.message);
}

// ─── Local index singleton ────────────────────────────────────────────────────
// When the cloud /query service is unavailable, we download the index from
// Cloudflare R2 and query via the bundled MiniLM model.
// The Promise is stored so parallel in-flight requests share one download.

let _localIndexLoading: Promise<void> | null = null;
let _localIndexLoaded = false;

async function ensureLocalIndex(): Promise<void> {
  if (_localIndexLoaded) return;
  if (!_localIndexLoading) {
    _localIndexLoading = (async () => {
      const t0 = Date.now();
      console.warn(
        "[moss] cloud /query service unavailable — loading index locally " +
          "(one-time ~25 s download; instant on subsequent calls in this process)…"
      );
      await moss.loadIndex(INDEX);
      _localIndexLoaded = true;
      console.log(`[moss] local index ready in ${Date.now() - t0} ms`);
    })();
  }
  return _localIndexLoading;
}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pushes chunks into the shared Moss index.
 * Creates the index on first use; upserts on subsequent calls.
 */
export async function indexChunks(docs: DocumentInfo[]): Promise<void> {
  if (docs.length === 0) return;

  const existing = await moss.listIndexes();
  const indexExists = existing.some((idx) => idx.name === INDEX);

  if (indexExists) {
    await moss.addDocs(INDEX, docs, { upsert: true });
  } else {
    await moss.createIndex(INDEX, docs);
  }
}

/**
 * Semantic search over the Moss index, filtered by product.
 *
 * Strategy:
 *   1. If local index already loaded → query locally (5 ms, no network).
 *   2. Try cloud /query endpoint once.
 *   3. On any 5xx → load index locally (singleton download) then query locally.
 *   4. Any other error → re-throw (Postgres FTS fallback in diagnostician handles it).
 */
export async function queryKnowledge(
  productId: string,
  question: string,
  topK = 5
): Promise<ChunkResult[]> {
  const opts = {
    topK,
    filter: { field: "product_id", condition: { $eq: productId } },
  };

  // Fast path: local index already warmed by a previous request in this process.
  if (_localIndexLoaded) {
    const results = await moss.query(INDEX, question, opts);
    return results.docs as unknown as ChunkResult[];
  }

  // Try cloud endpoint first (fast when it's up, avoids the one-time download).
  try {
    const results = await moss.query(INDEX, question, opts);
    return results.docs as unknown as ChunkResult[];
  } catch (err) {
    if (!is5xx(err)) throw err;   // non-5xx (auth error, network, etc.) → surface immediately
    console.warn(
      `[moss] cloud query failed (${err instanceof Error ? err.message : err}) — switching to local index…`
    );
  }

  // Cloud is down: load index locally and query.
  await ensureLocalIndex();
  const results = await moss.query(INDEX, question, opts);
  return results.docs as unknown as ChunkResult[];
}

/**
 * Postgres full-text search fallback using the document_chunks table.
 * Called when queryKnowledge throws or returns 0 results after local load.
 * Returns the same ChunkResult shape.
 */
export async function queryKnowledgeFallback(
  productId: string,
  question: string,
  topK = 5
): Promise<ChunkResult[]> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("search_document_chunks", {
    p_product_id: productId,
    p_query: question,
    p_limit: topK,
  });

  if (error) {
    throw new Error(`[moss-fallback] Postgres FTS error: ${error.message}`);
  }

  type FTSRow = { id: string; title: string; page: number; content: string; rank: number };
  return (data as FTSRow[] ?? []).map((row) => ({
    text: row.content,
    score: row.rank,
    metadata: {
      title: row.title,
      page: String(row.page),
      product_id: productId,
    },
  }));
}
