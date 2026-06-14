/**
 * Seed script — creates 1 demo company + 2 demo products + maintenance tasks
 * if the database is empty. Safe to run repeatedly (idempotent).
 *
 * Usage:  npm run seed
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DEMO_COMPANY_EMAIL = "demo@mantis.ai";
const DEMO_USER_EMAIL = "user@mantis.ai";
const DEMO_PASSWORD = "mantis-demo-2026";
const DEMO_COMPANY_NAME = "Mantis Demo Co.";

const DEMO_PRODUCTS = [
  {
    name: "Ola S1 Pro",
    category: "Vehicles",
    description:
      "Electric scooter with 195 km range, 116 km/h top speed, regenerative braking, and MoveOS smart features.",
    maintenance_tasks: [
      { title: "Check tire pressure", interval_months: 1, description: "Inflate to 36 PSI front and rear as specified in the service manual." },
      { title: "Battery health diagnostic", interval_months: 6, description: "Run the MoveOS battery diagnostic from Settings → Battery → Health Check." },
      { title: "Brake pad inspection", interval_months: 12, description: "Check pad thickness; replace if below 1 mm. Refer to Service Manual §8." },
    ],
  },
  {
    name: "Dyson V15 Detect",
    category: "Appliances",
    description:
      "Cordless vacuum with laser dust detection, real-time particle counting, and full-machine HEPA filtration.",
    maintenance_tasks: [
      { title: "Empty bin and wash filter", interval_months: 1, description: "Wash filter with cold water only — no detergents. Allow 24 h to dry before reinserting." },
      { title: "Clean brush bar", interval_months: 3, description: "Remove tangled hair and debris from the motorised brush bar using the supplied tool." },
      { title: "Replace filter", interval_months: 12, description: "Replace the post-motor filter annually for optimal HEPA performance." },
    ],
  },
];

async function seed() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Idempotency check — bail early if any companies already exist
  const { count } = await admin
    .from("companies")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    console.log("✓ Database already has data — skipping seed.");
    console.log(`  Company login : ${DEMO_COMPANY_EMAIL} / ${DEMO_PASSWORD}`);
    console.log(`  User login    : ${DEMO_USER_EMAIL} / ${DEMO_PASSWORD}`);
    return;
  }

  console.log("Seeding demo data…\n");

  // ── 1. Demo company auth user ──────────────────────────────────────────────
  const { data: companyAuth, error: companyAuthErr } =
    await admin.auth.admin.createUser({
      email: DEMO_COMPANY_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { role: "company", company_name: DEMO_COMPANY_NAME },
    });

  if (companyAuthErr || !companyAuth.user) {
    console.error("❌  Failed to create company auth user:", companyAuthErr?.message);
    process.exit(1);
  }
  const companyUserId = companyAuth.user.id;
  console.log(`✓ Created auth user       : ${DEMO_COMPANY_EMAIL}`);

  // The on_auth_user_created trigger auto-creates the profile row.
  // Wait a tick to ensure the trigger has fired before we insert the company.
  await new Promise((r) => setTimeout(r, 500));

  // ── 2. Demo company row ────────────────────────────────────────────────────
  const { data: company, error: companyErr } = await admin
    .from("companies")
    .insert({ user_id: companyUserId, name: DEMO_COMPANY_NAME })
    .select("id")
    .single();

  if (companyErr || !company) {
    console.error("❌  Failed to create company:", companyErr?.message);
    process.exit(1);
  }
  console.log(`✓ Created company         : ${DEMO_COMPANY_NAME}`);

  // ── 3. Products + maintenance tasks ───────────────────────────────────────
  for (const { maintenance_tasks, ...productData } of DEMO_PRODUCTS) {
    const { data: product, error: prodErr } = await admin
      .from("products")
      .insert({ company_id: company.id, ...productData })
      .select("id")
      .single();

    if (prodErr || !product) {
      console.error(`❌  Failed to create product "${productData.name}":`, prodErr?.message);
      continue;
    }
    console.log(`✓ Created product         : ${productData.name}`);

    if (maintenance_tasks.length > 0) {
      const { error: taskErr } = await admin
        .from("maintenance_tasks")
        .insert(maintenance_tasks.map((t) => ({ product_id: product.id, ...t })));

      if (taskErr) {
        console.error(`  ⚠  Maintenance tasks error for "${productData.name}":`, taskErr.message);
      } else {
        console.log(`  ✓ Added ${maintenance_tasks.length} maintenance tasks`);
      }
    }
  }

  // ── 4. Demo regular user ───────────────────────────────────────────────────
  const { error: userAuthErr } = await admin.auth.admin.createUser({
    email: DEMO_USER_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { role: "user" },
  });

  if (userAuthErr) {
    console.error("❌  Failed to create demo user:", userAuthErr.message);
  } else {
    console.log(`✓ Created auth user       : ${DEMO_USER_EMAIL}`);
  }

  console.log("\n✅  Seed complete!\n");
  console.log(`  Company login : ${DEMO_COMPANY_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  User login    : ${DEMO_USER_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("\nNext steps:");
  console.log("  1. Log in as the company and upload a service manual PDF to each product.");
  console.log("  2. The assistant will automatically index it via /api/ingest.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
