import { createAdminClient } from "@/lib/supabase/admin";
import { indexChunks } from "@/lib/moss";
import { extractPDFPages } from "@/lib/pdf";
import { chunkByWords } from "@/lib/chunk";
import type { DocumentInfo } from "@moss-dev/moss";

/**
 * Downloads a document, extracts text, chunks it, and persists chunks:
 *   1. document_chunks table (Postgres FTS — primary, fatal on failure)
 *   2. Moss cloud index (semantic search — secondary, non-fatal)
 * Marks documents.indexed = true after the primary store succeeds.
 */
export async function ingestDocument(
  documentId: string
): Promise<{ chunksIndexed: number }> {
  const supabase = createAdminClient();

  const { data: doc, error: fetchError } = await supabase
    .from("documents")
    .select("id, product_id, type, title, url")
    .eq("id", documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error(`Document ${documentId} not found: ${fetchError?.message}`);
  }

  const mossChunks: DocumentInfo[] = [];

  if (doc.type === "pdf") {
    const response = await fetch(doc.url);
    if (!response.ok) {
      throw new Error(`Failed to download PDF (${response.status}): ${doc.url}`);
    }
    const buffer = await response.arrayBuffer();
    const pages = await extractPDFPages(buffer);

    pages.forEach((pageText, pageIdx) => {
      const page = pageIdx + 1;
      if (!pageText.trim()) return;

      const chunks = chunkByWords(pageText, 400, 50);
      chunks.forEach((chunk, chunkIdx) => {
        mossChunks.push({
          id: `${doc.id}-p${page}-c${chunkIdx}`,
          text: chunk,
          metadata: {
            product_id: doc.product_id,
            document_id: doc.id,
            title: doc.title,
            page: String(page),
          },
        });
      });
    });
  } else {
    // For non-PDF types: index title (and URL for links) as a single chunk.
    const text =
      doc.type === "link" ? `${doc.title} — ${doc.url}` : doc.title;

    if (text.trim()) {
      mossChunks.push({
        id: `${doc.id}-p1-c0`,
        text,
        metadata: {
          product_id: doc.product_id,
          document_id: doc.id,
          title: doc.title,
          page: "1",
        },
      });
    }
  }

  if (mossChunks.length > 0) {
    // ── Primary store: Postgres document_chunks ───────────────────────────────
    // Upsert is idempotent (chunk id is stable across re-ingestion).
    const chunkRows = mossChunks.map((c) => ({
      id: c.id as string,
      document_id: doc.id,
      product_id: doc.product_id,
      title: String(c.metadata?.title ?? doc.title),
      page: parseInt(String(c.metadata?.page ?? "1"), 10),
      content: c.text,
    }));

    const { error: chunkErr } = await supabase
      .from("document_chunks")
      .upsert(chunkRows, { onConflict: "id" });

    if (chunkErr) {
      throw new Error(`Failed to insert document_chunks: ${chunkErr.message}`);
    }

    // ── Secondary store: Moss semantic index ──────────────────────────────────
    // Non-fatal: 503s / auth failures fall back to Postgres FTS at query time.
    try {
      await indexChunks(mossChunks);
    } catch (err) {
      console.warn(
        "[ingest] Moss indexing failed — Postgres FTS fallback will be used:",
        err instanceof Error ? err.message : err
      );
    }
  }

  // Mark indexed regardless of Moss status — document_chunks is the source of truth.
  await supabase
    .from("documents")
    .update({ indexed: true })
    .eq("id", documentId);

  return { chunksIndexed: mossChunks.length };
}
