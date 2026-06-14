#!/usr/bin/env tsx
/**
 * Backfills document_chunks for all previously-indexed documents.
 * Safe to run multiple times — chunk upserts are idempotent on id.
 * Usage: npx tsx scripts/backfill-chunks.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

// Must run before any @/ imports so env vars are set before module init.
config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const { createAdminClient } = await import("../lib/supabase/admin");
  const { ingestDocument } = await import("../lib/ingest");

  const admin = createAdminClient();

  const { data: docs, error } = await admin
    .from("documents")
    .select("id, title, type, product_id");

  if (error) throw new Error(error.message);
  if (!docs || docs.length === 0) {
    console.log("No documents found.");
    return;
  }

  console.log(`Found ${docs.length} document(s). Backfilling document_chunks…\n`);

  let ok = 0;
  let failed = 0;

  for (const doc of docs) {
    process.stdout.write(`  → [${doc.type}] ${doc.title} … `);
    try {
      const result = await ingestDocument(doc.id);
      console.log(`${result.chunksIndexed} chunks`);
      ok++;
    } catch (err) {
      console.log(`FAILED: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\nDone. ${ok} succeeded, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
