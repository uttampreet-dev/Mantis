#!/usr/bin/env tsx
/**
 * Manual test for the Moss retrieval pipeline.
 * Usage: npx tsx scripts/test-moss.ts <product-id> <question>
 * Example: npx tsx scripts/test-moss.ts abc-123 "horn not working"
 */

// Load .env.local
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { queryKnowledge } from "../lib/moss";

const [, , productId, ...questionWords] = process.argv;
const question = questionWords.join(" ");

if (!productId || !question) {
  console.error(
    "Usage: npx tsx scripts/test-moss.ts <product-id> <question>\n" +
      'Example: npx tsx scripts/test-moss.ts abc-123 "horn not working"'
  );
  process.exit(1);
}

async function main() {
  console.log(`\nQuerying Moss index: product_knowledge`);
  console.log(`Product ID : ${productId}`);
  console.log(`Question   : ${question}\n`);

  const docs = await queryKnowledge(productId, question);

  if (docs.length === 0) {
    console.log("No results found. Has this product been ingested?");
    return;
  }

  docs.forEach((doc, i) => {
    const score = typeof doc.score === "number" ? doc.score.toFixed(3) : "n/a";
    const meta = doc.metadata ?? {};
    console.log(`─── Result ${i + 1} (score: ${score}) ───`);
    console.log(`Source : ${meta.title ?? "unknown"}, page ${meta.page ?? "?"}`);
    console.log(`Doc ID : ${meta.document_id ?? "unknown"}`);
    console.log(`Text   : ${doc.text.slice(0, 300)}${doc.text.length > 300 ? "…" : ""}`);
    console.log();
  });
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
