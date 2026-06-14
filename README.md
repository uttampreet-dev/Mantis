# Mantis — AI Product Support Platform

AI-powered diagnostic assistant for product support. Companies list products and upload service manuals; users chat with a per-product AI that reasons through problems like a field technician — forming hypotheses, eliminating causes, and citing the exact manual page at diagnosis.

Built for **MOSS Hack '26**.

---

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Company | `demo@mantis.ai` | `mantis-demo-2026` |
| User | `user@mantis.ai` | `mantis-demo-2026` |

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend + API | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Database + Auth + Storage | Supabase (Postgres, RLS, Storage buckets) |
| Retrieval | Moss `@moss-dev/moss` — single index filtered by `product_id` |
| LLM | Gemini 2.5 Flash — JSON-mode structured output + vision |
| PDF extraction | `unpdf` (per-page text extraction) |
| Fallback retrieval | Postgres full-text search (`document_chunks` table) |

---

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/uttampreet-dev/Mantis.git
cd Mantis
npm install
```

### 2. Environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MOSS_PROJECT_ID=
MOSS_PROJECT_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Get them from: [Supabase](https://supabase.com) → Settings → API · [moss.dev](https://moss.dev) → Dashboard · [Google AI Studio](https://aistudio.google.com)

### 3. Run database migrations

Paste each file into the Supabase SQL Editor in order:

```
supabase/migrations/0001_init.sql          # Core schema
supabase/migrations/0002_profiles.sql      # Auth trigger + profiles
supabase/migrations/0003_rls_policies.sql  # Row-level security
supabase/migrations/0004_document_chunks.sql # FTS fallback table
```

Or via CLI:
```bash
supabase link --project-ref <your-ref>
supabase db push
```

### 4. Create storage bucket

Supabase dashboard → Storage → New bucket → name: `product-files`, Public: **on**

### 5. Seed demo data

```bash
npm run seed
```

Creates two demo products with maintenance tasks and both demo accounts. Safe to re-run.

### 6. Start dev server

```bash
npm run dev
# → http://localhost:3000
```

---

## How it works

```
User sends problem description
  → Moss queries "product_knowledge" index filtered by product_id
  → Top-5 chunks + conversation history + hypotheses → Gemini 2.5 Flash
  → Returns { message, hypotheses[], stage, citations[], recommended_action }
  → UI: chat bubble (left) + animated Diagnostic Board (right)

Company uploads PDF
  → /api/ingest extracts text per page via unpdf
  → Chunks (~400 words, 50-word overlap)
  → Stored in Postgres document_chunks (primary) + Moss index (secondary)
```

**Retrieval strategy:** Moss semantic search first. If the cloud query endpoint is unavailable, falls back to a local Moss index (one-time ~25s download, then 5ms queries). If Moss is unreachable entirely, Postgres full-text search (`websearch_to_tsquery`) serves as the final fallback.

---

## Key files

```
app/
  page.tsx                        # Landing page
  (auth)/                         # /login, /signup
  (dashboard)/dashboard/          # Company product management
  products/[id]/chat/             # AI chat + Diagnostic Board UI
  garage/                         # User maintenance tracker
  api/products/[id]/assistant/    # Diagnostic agent (Gemini + Moss RAG)
lib/
  moss.ts                         # Moss client, local fallback, FTS fallback
  ingest.ts                       # PDF → chunks → Postgres + Moss
  prompts/diagnostician.ts        # System prompt + context builder
supabase/migrations/              # 4 SQL migrations (run in order)
scripts/seed.ts                   # Demo data
```

---

## Demo flow

1. Sign in as company (`demo@mantis.ai`) → Dashboard → open a product → upload a PDF manual
2. Wait ~10s for indexing (status shows **Indexed**)
3. Open incognito → sign in as user (`user@mantis.ai`)
4. Browse marketplace → open the product → **Ask Assistant**
5. Type: `My horn is not working`
6. Diagnostic Board appears with ranked hypotheses
7. Answer one follow-up question → board re-ranks live
8. Diagnosis reached with exact manual citation → click citation chip to view snippet
9. Add product to **My Garage** → track maintenance schedule → mark task complete
