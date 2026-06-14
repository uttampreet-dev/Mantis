# Mantis — AI Product Support Platform

Most AI support tools are glorified search boxes: you ask a question, they retrieve a chunk, they paste it back at you. **Mantis is different.** It reasons like a field technician — forming a ranked list of hypotheses on the first message, eliminating causes one focused question at a time, and only declaring a diagnosis when the evidence supports it. Every factual claim is anchored to the exact page in the uploaded manual. The diagnostic board updates live as the conversation progresses.

Built for **MOSS Hack '26**.

---

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Company | `demo@mantis.ai` | `mantis-demo-2026` |
| User | `user@mantis.ai` | `mantis-demo-2026` |

---

## Demo flow

1. Sign in as **company** (`demo@mantis.ai`) → Dashboard → open a product → upload a PDF service manual
2. Wait ~10s — status badge flips to **Indexed**
3. Open incognito → sign in as **user** (`user@mantis.ai`)
4. Browse marketplace → open the product → **Ask Assistant**
5. Type: `My horn is not working`
6. **Diagnostic Board** appears on the right with 3 ranked root-cause hypotheses
7. Answer the follow-up question → board re-ranks live with Framer Motion animation
8. Diagnosis reached → citation chip links to the exact page in the manual
9. Click **Add to Garage** → go to My Garage → view maintenance schedule → mark a task complete

---

## Problem statement coverage

| Requirement | Implementation |
|---|---|
| Product marketplace | `/products` — public catalog, category tags, company attribution |
| Knowledge repository | PDF/doc/image/video/link upload per product; chunked + dual-indexed |
| Diagnostic AI assistant | Gemini 2.5 Flash, hypothesis-driven JSON output, per-product RAG |
| Cited answers | Every diagnosis links to `doc_title + page` from the indexed manual |
| Bonus — My Garage | User product ownership + maintenance schedule tracker |
| Bonus — Image analysis | Gemini Vision: describe warning lights / damage before diagnosis |
| Bonus — Retrieval resilience | Three-tier fallback: Moss cloud → Moss local index → Postgres FTS |

---

## How it works

### Diagnostic conversation

```
User types problem
  → POST /api/products/[id]/assistant
  → buildDiagnosticianPrompt():
      1. Moss semantic search on "product_knowledge" index (filtered by product_id)
      2. If 0 results → Postgres FTS fallback (websearch_to_tsquery on document_chunks)
      3. Format top-5 chunks as [source: title, page N] context blocks
      4. Inject context + conversation history + current hypotheses into system prompt
  → callGemini() — JSON mode, validated against Zod schema, retries once on parse fail
  → Persist messages + hypotheses + stage to conversations table
  → Enrich citations: resolve signed Storage URL, append #page=N for PDFs
  → Return { message, stage, hypotheses[], citations[], conversationId }
  → UI: chat bubble (left) + Hypothesis Board reorders with Framer Motion (right)
```

### Document ingestion

```
Company uploads PDF
  → Supabase Storage → documents row (indexed = false)
  → POST /api/ingest { documentId }
  → ingestDocument():
      1. Download PDF → extractPDFPages() via unpdf → string[] per page
      2. chunkByWords(page, 400 words, 50-word overlap)
      3. Upsert to document_chunks (Postgres, primary, idempotent)
      4. indexChunks() → Moss product_knowledge index (secondary, non-fatal on failure)
      5. Set documents.indexed = true
  → Dashboard shows "Indexed" badge
```

### Three-tier retrieval fallback

```
queryKnowledge(productId, query):
  1. Local Moss index already warm in process? → query locally (5ms, no network)
  2. Try Moss cloud /query endpoint
  3. 5xx response? → ensureLocalIndex() (one-time ~25s download, shared singleton)
                   → query locally from that point forward
  4. Caller: if 0 results → queryKnowledgeFallback() → Postgres FTS
  5. If FTS also empty → general guidance injected into system prompt (no dead ends)
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend + API | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Animations | Framer Motion — LayoutGroup + AnimatePresence on Hypothesis Board |
| Database + Auth + Storage | Supabase (Postgres, RLS, Storage buckets) |
| Retrieval | `@moss-dev/moss` — `product_knowledge` index, metadata-filtered by `product_id` |
| LLM | Gemini 2.5 Flash — JSON-mode structured output + Vision API |
| PDF extraction | `unpdf` — per-page text extraction |
| FTS fallback | Postgres `document_chunks` table with GIN index + `search_document_chunks` RPC |

---

## Key files

```
app/
  page.tsx                      Landing — auth-aware CTAs, static diagnostic preview
  (auth)/                       /login · /signup · server actions (signIn, signUp, signOut)
  (dashboard)/dashboard/        Company: product list, document upload, maintenance tasks
  products/[id]/chat/           Chat interface + animated Hypothesis Board + citation modal
  garage/                       User: owned products + maintenance schedule tracker
  api/products/[id]/assistant/  Diagnostic agent route (Gemini + Moss RAG)
  api/products/[id]/vision/     Gemini Vision route (image → diagnostic description)
  api/ingest/                   Ingestion trigger (service-role auth, calls lib/ingest.ts)

lib/
  moss.ts                       Moss client + three-tier retrieval (cloud / local / throws)
  ingest.ts                     PDF → chunks → document_chunks + Moss index
  gemini.ts                     callGemini (JSON mode + Zod validation) · callGeminiVision
  prompts/diagnostician.ts      System prompt template + buildDiagnosticianPrompt()
  types/assistant.ts            Zod schemas: Hypothesis, Citation, AssistantResponse
  pdf.ts · chunk.ts             unpdf wrapper · word-count chunker with overlap

components/
  site-nav.tsx                  Auth-aware server component (adapts per role)
  marketplace/product-grid.tsx  Public product catalog cards

supabase/migrations/
  0001_init.sql                 Core schema (7 tables)
  0002_profiles.sql             profiles table + auth trigger
  0003_rls_policies.sql         Row-level security
  0004_document_chunks.sql      FTS table, GIN index, search_document_chunks RPC

scripts/seed.ts                 Demo data — two products, maintenance tasks, both accounts
```

---

## Database schema

```
companies            id · user_id · name · logo_url
products             id · company_id · name · category · description · image_url
documents            id · product_id · type · title · url · indexed
conversations        id · product_id · user_id · messages(jsonb) · hypotheses(jsonb) · stage
maintenance_tasks    id · product_id · title · interval_months · description
user_products        id · user_id · product_id · purchased_at
user_maintenance_log id · user_product_id · task_id · due_at · completed_at
document_chunks      id · document_id · product_id · title · page · content  [GIN FTS index]
profiles             id · role('user'|'company') · created_at
```

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

Sources: [Supabase](https://supabase.com) → Settings → API · [moss.dev](https://moss.dev) → Dashboard · [Google AI Studio](https://aistudio.google.com)

### 3. Run migrations

Paste into the Supabase SQL Editor in order:

```
supabase/migrations/0001_init.sql           # Core schema
supabase/migrations/0002_profiles.sql       # Auth trigger + profiles
supabase/migrations/0003_rls_policies.sql   # Row-level security
supabase/migrations/0004_document_chunks.sql # FTS fallback
```

### 4. Create storage bucket

Supabase → Storage → New bucket → name: `product-files`, Public: **on**

### 5. Seed demo data

```bash
npm run seed
```

### 6. Start dev server

```bash
npm run dev
# → http://localhost:3000
```
