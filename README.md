# Mantis — AI Product Support Platform

Most AI support tools are glorified search boxes: you ask a question, they retrieve a chunk, they paste it back at you. **Mantis is different.** It reasons like a field technician — forming a ranked list of hypotheses on the first message, eliminating causes one focused question at a time, and only declaring a diagnosis when the evidence supports it. Every factual claim is anchored to the exact page in the uploaded manual. The diagnostic board updates live as the conversation progresses.

Built for **MOSS Hack '26**.

---

## Why it's different

- **Live Hypothesis Board** — on the first message, Mantis proposes 2–5 ranked root causes as animated cards. Every follow-up answer re-ranks, eliminates, or confirms a hypothesis in real time (Framer Motion `LayoutGroup` + `AnimatePresence`).
- **Cited, traceable diagnoses** — every factual claim links to the exact source document and page number; click a citation to preview the snippet or open the source PDF at that page.
- **Three-tier retrieval resilience** — Moss cloud semantic search → local Moss index → Postgres full-text search. The assistant keeps working even if the primary retrieval service is degraded (this fallback was exercised for real during development).
- **Image-based troubleshooting** — upload a photo of a warning light or damaged part; Gemini Vision describes it and folds that into the diagnosis.
- **My Garage** — users track owned products and get maintenance reminders from company-defined schedules.

### Problem statement coverage

| Requirement | Implementation |
|---|---|
| Product marketplace | `/products` — public catalog, category tags, company attribution |
| Knowledge repository | PDF/doc/image/video/link upload per product; chunked + dual-indexed |
| Diagnostic AI assistant | Gemini 2.5 Flash, hypothesis-driven JSON output, per-product RAG |
| Cited answers | Every diagnosis links to `doc_title + page` from the indexed manual |
| Bonus — My Garage | User product ownership + maintenance schedule tracker |
| Bonus — Image analysis | Gemini Vision: describe warning lights / damage before diagnosis |
| Bonus — Spare part suggestions | Diagnosis response includes `spare_parts[]` when applicable |
| Bonus — Retrieval resilience | Three-tier fallback: Moss cloud → Moss local index → Postgres FTS |

---

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Company | `demo@mantis.ai` | `mantis-demo-2026` |
| User | `user@mantis.ai` | `mantis-demo-2026` |

For the richest demo, use the **Honda Activa 6G** product — it has a fully indexed real owner's manual (85 chunks) with working citations on pages 27, 41, and 63.

---

## Demo flow

1. Sign in as **company** (`demo@mantis.ai`) → Dashboard → open a product → upload a PDF service manual
2. Wait ~10s — status badge flips to **Indexed**
3. Open incognito → sign in as **user** (`user@mantis.ai`)
4. Browse marketplace → open **Honda Activa 6G** → **Ask Assistant**
5. Type: `my engine oil light came on what should I do`
6. **Diagnostic Board** appears on the right with ranked root-cause hypotheses, each citing the manual
7. Answer the follow-up question → board re-ranks live with animation
8. Diagnosis reached → citation chip opens a modal with the manual excerpt + "Open source (page N)" link to the real PDF
9. Try the image upload button → attach a photo of a warning light/component
10. Click **Add to Garage** → go to My Garage → view maintenance schedule → mark a task complete

---

## Architecture
```
┌──────────────────────────────────────────────┐
│                  Next.js 14                  │
│ Marketplace • Dashboard • Chat • Garage      │
└─────────────────┬────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────┐
│                  Supabase                    │
│ Auth • Postgres • Storage                    │
└──────────┬────────────────────┬──────────────┘
           │                    │
           ▼                    ▼
┌──────────────────┐   ┌──────────────────────┐
│       Moss       │   │  Gemini 2.5 Flash    │
│ Semantic Search  │   │ Reasoning + Vision   │
└────────┬─────────┘   └──────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Postgres Full-Text Search Fallback           │
│ document_chunks + GIN Index                  │
└──────────────────────────────────────────────┘
```
Single Next.js application — no separate backend service.

- Supabase handles authentication, storage, and persistence.
- Moss powers semantic retrieval across uploaded manuals.
- Gemini performs diagnostic reasoning and image analysis.
- Postgres FTS acts as the final retrieval fallback.

---

## How it works

### Diagnostic conversation

```
User types problem
  -> POST /api/products/[id]/assistant
  -> buildDiagnosticianPrompt():
      1. Moss semantic search on "product_knowledge" index (filtered by product_id)
      2. If 0 results -> Postgres FTS fallback (websearch_to_tsquery on document_chunks)
      3. Format top-5 chunks as [source: title, page N] context blocks
      4. Inject context + conversation history + current hypotheses into system prompt
  -> callGemini() - JSON mode, validated against Zod schema, retries once on parse fail
  -> Persist messages + hypotheses + stage to conversations table
  -> Enrich citations: resolve signed Storage URL, append #page=N for PDFs
  -> Return { message, stage, hypotheses[], citations[], spare_parts[], conversationId }
  -> UI: chat bubble (left) + Hypothesis Board reorders with Framer Motion (right)
```

### Document ingestion

```
Company uploads PDF
  -> Supabase Storage -> documents row (indexed = false)
  -> POST /api/ingest { documentId }
  -> ingestDocument():
      1. Download PDF -> extractPDFPages() via unpdf -> string[] per page
      2. chunkByWords(page, 400 words, 50-word overlap)
      3. Upsert to document_chunks (Postgres, primary, idempotent)
      4. indexChunks() -> Moss product_knowledge index (secondary, non-fatal on failure)
      5. Set documents.indexed = true
  -> Dashboard shows "Indexed" badge
```

### Three-tier retrieval fallback

```
queryKnowledge(productId, query):
  1. Local Moss index already warm in process? -> query locally (5ms, no network)
  2. Try Moss cloud /query endpoint
  3. 5xx response? -> ensureLocalIndex() (one-time ~25s download, shared singleton)
                    -> query locally from that point forward
  4. Caller: if 0 results -> queryKnowledgeFallback() -> Postgres FTS
  5. If FTS also empty -> general guidance injected into system prompt (no dead ends)
```

### Image analysis

```
User attaches a photo in chat
  -> POST /api/products/[id]/vision { imageBase64, mimeType }
  -> callGeminiVision() describes visible warning lights / damage / error codes
  -> Description prepended to the next user message automatically
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

## Why Moss?

Moss powers the retrieval layer behind every diagnosis.

When a company uploads a manual:

1. PDF pages are extracted and chunked.
2. Chunks are indexed into the `product_knowledge` index.
3. User questions trigger semantic retrieval filtered by `product_id`.
4. Retrieved manual sections are injected into the diagnostic prompt.
5. Gemini generates grounded responses using retrieved evidence.

To improve reliability, Mantis uses a three-tier retrieval strategy:

Moss Cloud Search
→ Local Moss Index
→ Postgres Full-Text Search

This ensures diagnostics remain functional even when the primary retrieval service is unavailable while still keeping every response grounded in product documentation.

---

## Auth model

| Role | Permissions |
|---|---|
| Company | Manage own products; upload/manage documents and maintenance tasks |
| User | Browse marketplace; chat with diagnostic assistant; manage garage and maintenance log |
| Anonymous | Browse marketplace; chat with diagnostic assistant (no garage/history persistence) |

Role is stored on `profiles.role` (`'user' | 'company'`), set at signup and used by `site-nav.tsx` and route guards to adapt navigation and redirects

---

## Project structure

```
app/
├── page.tsx
│   Landing page with auth-aware CTAs
│
├── (auth)/
│   ├── login/
│   └── signup/
│   Authentication routes and server actions
│
├── (dashboard)/dashboard/
│   Company dashboard
│   Product management, uploads, maintenance tasks
│
├── products/[id]/chat/
│   Diagnostic chat interface
│   Hypothesis Board + citation modal
│
├── garage/
│   User-owned products
│   Maintenance tracking
│
└── api/
    ├── products/[id]/assistant/
    │   Gemini + Moss diagnostic agent
    │
    ├── products/[id]/vision/
    │   Image troubleshooting endpoint
    │
    └── ingest/
        Document ingestion pipeline

lib/
├── moss.ts
│   Three-tier retrieval layer
│
├── ingest.ts
│   PDF → chunks → indexing
│
├── gemini.ts
│   Structured generation + vision
│
├── prompts/diagnostician.ts
│   Diagnostic system prompt builder
│
├── types/assistant.ts
│   Shared Zod schemas
│
└── pdf.ts / chunk.ts
    Extraction and chunking utilities
```

---

## Database schema

```
companies            id . user_id . name . logo_url
products             id . company_id . name . category . description . image_url
documents            id . product_id . type . title . url . indexed
conversations        id . product_id . user_id . messages(jsonb) . hypotheses(jsonb) . stage
maintenance_tasks    id . product_id . title . interval_months . description
user_products        id . user_id . product_id . purchased_at
user_maintenance_log id . user_product_id . task_id . due_at . completed_at
document_chunks      id . document_id . product_id . title . page . content  [GIN FTS index]
profiles             id . role('user'|'company') . created_at
```

---

## Technical Highlights

### Hypothesis-Driven Diagnostics

Unlike traditional support chatbots, Mantis does not immediately commit to a diagnosis.

Instead it:

1. Generates multiple possible root causes.
2. Assigns confidence scores.
3. Updates confidence after every user response.
4. Eliminates unlikely causes.
5. Converges only when sufficient evidence exists.

### Citation-First Responses

Every diagnosis is traceable back to:

- Original document
- Exact page number
- Supporting manual excerpt

### Retrieval Resilience

Three independent retrieval layers ensure the assistant remains functional even during service degradation:

```text
Moss Cloud
    ↓
Local Moss
    ↓
Postgres FTS
```

### Vision-Assisted Troubleshooting

Users can upload images of:

- Warning lights
- Damaged components
- Error indicators

Gemini Vision converts visual evidence into structured context before diagnostic reasoning occurs.

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
supabase/migrations/0001_init.sql            # Core schema
supabase/migrations/0002_profiles.sql        # Auth trigger + profiles
supabase/migrations/0003_rls_policies.sql    # Row-level security
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
