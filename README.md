# Mantis — AI Product Support Platform

An AI-powered diagnostic assistant for product support. Companies list products and upload service manuals; users talk to a per-product AI that reasons through problems like an experienced field technician — forming hypotheses, asking targeted follow-up questions, and citing the exact manual page when it reaches a diagnosis.

Built for **MOSS Hack '26**.

---

## Quick demo

After running `npm run seed` you get two ready-to-use accounts:

| Role | Email | Password |
|---|---|---|
| Company | `demo@mantis.ai` | `mantis-demo-2026` |
| User | `user@mantis.ai` | `mantis-demo-2026` |

Log in as the company, upload a service-manual PDF to one of the seeded products, then log in as the user and chat with the assistant. See **[Demo script](#demo-script)** below.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend + API | Next.js 14 (App Router, TypeScript, Tailwind CSS, shadcn/ui) |
| Database + Auth + Storage | Supabase (Postgres, Row-Level Security, Storage buckets) |
| Retrieval | Moss `@moss-dev/moss` — single index, metadata-filtered by `product_id` |
| LLM | Google Gemini 2.5 Flash (JSON mode for structured output + vision for image upload) |
| PDF extraction | `unpdf` (per-page text) |

---

## Local setup

### 1. Clone and install

```bash
git clone <your-fork-url>
cd Mantis
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in every value:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | Supabase project → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Supabase project → Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Supabase project → Settings → API → service_role key (keep secret) |
| `MOSS_PROJECT_ID` | ✓ | moss.dev dashboard |
| `MOSS_PROJECT_KEY` | ✓ | moss.dev dashboard |
| `GEMINI_API_KEY` | ✓ | Google AI Studio → aistudio.google.com |
| `NEXT_PUBLIC_SITE_URL` | ✓ | `http://localhost:3000` locally; set to your Vercel URL in production |
| `GEMINI_MODEL` | — | Defaults to `gemini-2.5-flash`; override only if needed |

### 3. Supabase — run migrations

Install the Supabase CLI if needed:

```bash
npm install -g supabase
```

Link your project and push the two migrations:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

> **Alternative:** paste `supabase/migrations/0001_init.sql` then `supabase/migrations/0002_profiles.sql` into the Supabase SQL Editor and run them in order.

### 4. Supabase — create storage bucket

In the Supabase dashboard → **Storage** → **New bucket**:

- Name: `product-files`
- Public: **on** (enables public read for product images and documents)

### 5. Seed demo data

```bash
npm run seed
```

This creates the demo company, two products with maintenance tasks, and a demo user account. It is safe to run multiple times — it skips if the database is already populated.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Moss retrieval index

All ingested document chunks are stored in a **single shared index** named:

```
product_knowledge
```

Chunks are tagged with `{ product_id, document_id, title, page }` metadata. At query time, Moss filters by `product_id` so each product's assistant only sees that product's documentation. The index is created automatically on the first `/api/ingest` call — no manual Moss setup is required beyond providing `MOSS_PROJECT_ID` and `MOSS_PROJECT_KEY`.

---

## Demo script

> Reproduces the winning flow described in the project spec §2.

1. **Sign in as the company** (`demo@mantis.ai`)
2. On `/dashboard`, open the **Ola S1 Pro** product → **Manage documents**
3. Upload a service-manual PDF (e.g. the Ola S1 Pro service manual)
4. Wait ~10 s — the document status changes from "Not indexed" to **Indexed** (the `/api/ingest` endpoint extracts, chunks, and pushes to Moss automatically)
5. **Open a new incognito window**, sign in as the user (`user@mantis.ai`)
6. Browse `/products` → open **Ola S1 Pro** → click **Ask the Assistant**
7. Type: `My horn is not working`
8. The **Diagnostic Board** appears on the right with 2–4 ranked hypotheses
9. The assistant asks: *"Does the headlight work normally?"*
10. Answer: `Yes` → the board re-ranks live; two hypotheses drop in confidence
11. After one or two more exchanges, stage reaches **Diagnosed**: the assistant cites the exact manual page
12. Click the citation chip → modal shows the exact snippet and a link that opens the PDF at that page
13. *(Bonus)* Click **Add to My Garage** on the product page → visit `/garage` → see the 3 seeded maintenance tasks with scheduled due dates → click **Done** to mark one complete and reschedule it

---

## Project structure

```
app/
  (auth)/           # /login, /signup — email/password with role selection
  (dashboard)/      # Protected company routes
    dashboard/      # /dashboard — product management
      products/[id] # Document management + maintenance tasks
  products/         # Public marketplace (/products, /products/[id])
    [id]/chat/      # Per-product AI chat UI
  garage/           # /garage — user-owned products + maintenance tracker
  api/
    ingest/         # POST — PDF → chunks → Moss index
    products/[id]/
      assistant/    # POST — diagnostic agent (Gemini + Moss RAG)
      vision/       # POST — image analysis (Gemini vision)
lib/
  gemini.ts         # Gemini 2.5 Flash wrapper (JSON mode + vision)
  moss.ts           # Moss client wrapper (indexChunks, queryKnowledge)
  ingest.ts         # Ingestion pipeline (PDF → unpdf → chunk → Moss)
  prompts/
    diagnostician.ts # System prompt builder (fills in CONTEXT from Moss)
  types/
    assistant.ts    # Zod schemas for the structured AI response
supabase/
  migrations/
    0001_init.sql   # Full schema
    0002_profiles.sql # Profiles + RLS policies + auth trigger
scripts/
  seed.ts           # Demo data seed
  test-moss.ts      # CLI tool to test Moss queries manually
```

---

## Vercel deployment

1. Push to GitHub and import the repo in Vercel
2. Set all environment variables listed in the table above (use your Vercel deployment URL for `NEXT_PUBLIC_SITE_URL`)
3. Deploy — Vercel uses Node.js functions for all API routes; `@moss-dev/moss` native bindings are excluded from the webpack bundle via `next.config.mjs`

> **Note:** if you hit native-module errors on Vercel, fall back to **Render** (free web service, full container environment, zero native-module issues).
