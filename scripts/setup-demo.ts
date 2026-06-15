/**
 * Quick demo setup: images + real Ola S1 manual + 2 more marketplace products
 * Usage: npx tsx scripts/setup-demo.ts
 */
import * as dotenv from "dotenv";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import * as fs from "fs";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const INGEST_URL   = "http://localhost:3001/api/ingest";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const OLA_ID   = "fd21c178-d521-4b3e-b546-b6427467c247";
const DYSON_ID = "87f9d880-5ba1-4f7c-b59b-78832222ef67";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

function download(url: string, dest: string) {
  execSync(`curl -sL -A "${UA}" -o "${dest}" "${url}"`, { stdio: "inherit" });
}

async function uploadPDF(productId: string, filename: string, localPath: string) {
  const storagePath = `documents/${productId}/${filename}`;
  const buffer = fs.readFileSync(localPath);
  const { error } = await admin.storage
    .from("product-files")
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`Storage upload: ${error.message}`);
  return `${SUPABASE_URL}/storage/v1/object/public/product-files/${storagePath}`;
}

async function addDoc(productId: string, title: string, url: string) {
  const { data, error } = await admin
    .from("documents")
    .insert({ product_id: productId, type: "pdf", title, url, indexed: false })
    .select("id").single();
  if (error || !data) throw new Error(`addDoc: ${error?.message}`);
  return data.id as string;
}

async function ingest(documentId: string) {
  const r = await fetch(INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ documentId }),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`Ingest: ${JSON.stringify(json)}`);
  return json.chunksIndexed as number;
}

async function addProduct(name: string, category: string, description: string, imageUrl: string) {
  const { data: co } = await admin.from("companies").select("id").limit(1).single();
  if (!co) throw new Error("No company found");
  const { data, error } = await admin
    .from("products")
    .insert({ company_id: co.id, name, category, description, image_url: imageUrl })
    .select("id").single();
  if (error || !data) throw new Error(`addProduct ${name}: ${error?.message}`);
  return data.id as string;
}

async function addTasks(productId: string, tasks: { title: string; interval_months: number; description: string }[]) {
  await admin.from("maintenance_tasks").insert(tasks.map(t => ({ product_id: productId, ...t })));
}

async function main() {
  // ── 1. Product images ────────────────────────────────────────────────────────
  console.log("1. Setting product images…");
  await admin.from("products").update({
    image_url: "https://upload.wikimedia.org/wikipedia/commons/7/7a/OLA_S1_Pro_Gen_1_Electric_Scooter.jpg",
  }).eq("id", OLA_ID);
  await admin.from("products").update({
    image_url: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Dyson_DC07_Vacuum_Cleaner.jpg",
  }).eq("id", DYSON_ID);
  console.log("   ✓ Ola S1 Pro and Dyson images set\n");

  // ── 2. Add Royal Enfield Classic 350 ────────────────────────────────────────
  console.log("2. Adding Royal Enfield Classic 350…");
  const { data: existingRE } = await admin.from("products").select("id").eq("name", "Royal Enfield Classic 350").maybeSingle();
  if (!existingRE) {
    const reId = await addProduct(
      "Royal Enfield Classic 350", "Vehicles",
      "Iconic retro-styled 350cc motorcycle with fuel injection, tripper navigation, and dual-channel ABS.",
      "https://upload.wikimedia.org/wikipedia/commons/0/0f/Royal_Enfield_Classic_350_%282017_Model_Year%29.jpg",
    );
    await addTasks(reId, [
      { title: "Engine oil change", interval_months: 3, description: "Use 15W-50 semi-synthetic oil. Capacity 2.5L. Drain plug torque 25 Nm." },
      { title: "Chain lubrication", interval_months: 1, description: "Maintain 25–35 mm slack. Lubricate every 500 km." },
      { title: "Air filter cleaning", interval_months: 6, description: "Clean with compressed air; replace if damaged." },
    ]);
    console.log(`   ✓ Created (${reId})\n`);
  } else {
    console.log("   ✓ Already exists — skipped\n");
  }

  // ── 3. Add Honda Activa 6G ──────────────────────────────────────────────────
  console.log("3. Adding Honda Activa 6G…");
  const { data: existingHonda } = await admin.from("products").select("id").eq("name", "Honda Activa 6G").maybeSingle();
  if (!existingHonda) {
    const hondaId = await addProduct(
      "Honda Activa 6G", "Vehicles",
      "India's most popular scooter with 110cc BS6 engine, combi-braking, and enhanced fuel efficiency.",
      "https://upload.wikimedia.org/wikipedia/commons/e/ec/Gold_Metallic_Honda_Activa.jpg",
    );
    await addTasks(hondaId, [
      { title: "Engine oil change", interval_months: 3, description: "Use Honda GN4 10W-30. Capacity 0.8L with filter." },
      { title: "Spark plug replacement", interval_months: 12, description: "Replace with NGK CPR6EA-9S. Gap: 0.8–0.9 mm." },
      { title: "Air filter replacement", interval_months: 12, description: "Replace paper element every 8,000 km." },
    ]);
    console.log(`   ✓ Created (${hondaId})\n`);
  } else {
    console.log("   ✓ Already exists — skipped\n");
  }

  // ── 4. Upload real Ola S1 manual and index it ────────────────────────────────
  console.log("4. Uploading Ola S1 Air owner's manual (8.5 MB)…");
  const { data: existingDoc } = await admin.from("documents")
    .select("id,title").eq("product_id", OLA_ID).maybeSingle();

  if (existingDoc?.title === "Ola S1 Owner's Manual (Dec 2023)") {
    console.log("   ✓ Real manual already indexed — skipped\n");
  } else {
    // Delete old Space Scooter document & its chunks
    if (existingDoc) {
      await admin.from("document_chunks").delete().eq("document_id", existingDoc.id);
      await admin.from("documents").delete().eq("id", existingDoc.id);
      console.log("   Removed old Space Scooter document");
    }

    download(
      "https://www.team-bhp.com/forum/attachments/motorbikes/2547101d1703243163-my-2023-ola-s1-air-midnight-blue-ownership-review-sair-ola-s1-air-owners-manual-december-2023.pdf",
      "/tmp/ola_s1_manual.pdf",
    );
    console.log("   Downloaded — uploading to storage…");

    const storageUrl = await uploadPDF(OLA_ID, "ola-s1-owner-manual.pdf", "/tmp/ola_s1_manual.pdf");
    console.log("   Uploaded — creating document record…");

    const docId = await addDoc(OLA_ID, "Ola S1 Owner's Manual (Dec 2023)", storageUrl);
    console.log("   Indexing (takes 30–60 s)…");
    const chunks = await ingest(docId);
    console.log(`   ✓ Indexed ${chunks} chunks\n`);
  }

  console.log("✅  Demo setup complete!");
  console.log("\nTest: open http://localhost:3001/products and check:");
  console.log("  • 4 products with images");
  console.log("  • Ola S1 Pro chat → hypotheses cite manual page numbers");
}

main().catch(err => { console.error("FAILED:", err); process.exit(1); });
