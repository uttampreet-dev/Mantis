# Mantis — AI Product Support Platform
### MOSS Hack '26 build plan (24 hours)

---

## 1. What the PS actually wants (in one paragraph)

A marketplace where companies create accounts, list products (name, category,
description, image), and upload support material (PDFs, docs, images, videos,
external/YouTube links). Users browse/search products, view a product page with
its resources, and talk to a **per-product AI assistant**. That assistant must
NOT just retrieve-and-display from the manual — it must behave like a technician:
form hypotheses about the cause, ask targeted follow-up questions to eliminate
unlikely ones, suggest safe checks, narrow down, and finally recommend a fix
with a traceable citation to the source manual. MOSS is the suggested retrieval
layer. Judges reward a small number of *polished, complete* features over a
sprawling half-built feature list.

---

## 2. The winning idea: "Mantis" — a live Diagnostic Board

**Don't build a chatbot. Build a visible reasoning engine.**

Every conversation with the product assistant maintains a structured state:
a ranked list of hypotheses (possible root causes), each with a confidence
score and status (`active` / `eliminated` / `confirmed`). The UI renders this
as a card board next to the chat. Every model turn:

1. Updates the hypothesis board (re-ranks, eliminates, confirms)
2. Asks exactly ONE diagnostic question (or gives the final verdict)
3. Attaches citations (doc title + page number) to any factual claim

This directly mirrors the 8-step "Diagnostic Workflow" in the PS, makes the
elimination process *visible*, and gives you a 60-second demo that no generic
RAG chatbot can match.

### Demo script (memorize this for the 8 PM checkpoint and final pitch)
1. Open product page for "Ola S1 Scooter" (seeded with a real manual PDF).
2. Type: "My horn is not working."
3. Hypothesis board appears with 4 ranked causes.
4. Assistant asks: "Does the headlight work normally?"
5. Answer "Yes" → board re-ranks live, two hypotheses fade out.
6. Assistant asks one more question, then: "Most likely cause: Fuse F3 (10A) is
   blown — see Service Manual, p.42" with a citation card that opens the PDF
   at that page.
7. (Bonus) "Here's a replacement 10A fuse you can order" with a spare-part link.
8. (Bonus) Switch to "My Garage" — show this scooter with a maintenance
   schedule and an overdue task you can mark complete.

---

## 3. Architecture & stack (100% free tier)

| Layer | Choice | Why |
|---|---|---|
| Frontend + API | Next.js 14 (App Router, TypeScript) + Tailwind + shadcn/ui | One codebase, fast scaffolding, Claude Code is excellent at this stack |
| DB + Auth + File storage | Supabase (free project) | Postgres + row-level auth + storage buckets for PDFs/images/videos in one free service |
| Retrieval | Moss (`@moss-dev/moss`, TS SDK) | The sponsor's product — single index, metadata-filtered by `product_id` |
| LLM (diagnostic agent + vision) | Google Gemini 2.5 Flash (free tier, AI Studio) | Free, fast, supports JSON-mode structured output AND image input (covers the bonus image-troubleshooting feature with the same key) |
| PDF text extraction | `unpdf` or `pdf-parse` (Node) | Pulls per-page text for chunking |
| Hosting | Vercel (free) | Trivial Next.js deploys; fallback Render if the moss native module misbehaves on Vercel |
| Source control | GitHub (fork of `pclub-uiet/Mantis`) | Required by the rules |

### High-level flow
```
Company uploads PDF → Supabase Storage
   → /api/ingest extracts text per page → chunks (~400 words, 50 overlap)
   → pushed to Moss index "product_knowledge" with metadata
        { product_id, document_id, title, page }

User opens product chat → /api/assistant
   → Moss.query("product_knowledge", userMessage, filter: product_id)
   → top-5 chunks + conversation state + hypothesis board → Gemini (JSON mode)
   → returns { message, hypotheses[], stage, citations[], recommended_action }
   → UI renders chat bubble + hypothesis board + citation cards
```

---

## 4. Data model (Supabase / Postgres)

```sql
create table companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  logo_url text,
  created_at timestamptz default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  name text not null,
  category text not null,
  description text,
  image_url text,
  created_at timestamptz default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) not null,
  type text check (type in ('pdf','doc','image','video','link')) not null,
  title text not null,
  url text not null,          -- storage path or external URL
  indexed boolean default false,
  created_at timestamptz default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) not null,
  user_id uuid references auth.users,
  messages jsonb default '[]',
  hypotheses jsonb default '[]',
  stage text default 'investigating',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bonus: ownership + maintenance
create table maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) not null,
  title text not null,
  interval_months int not null,
  description text
);

create table user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  product_id uuid references products(id) not null,
  purchased_at date,
  created_at timestamptz default now()
);

create table user_maintenance_log (
  id uuid primary key default gen_random_uuid(),
  user_product_id uuid references user_products(id) not null,
  task_id uuid references maintenance_tasks(id) not null,
  due_at timestamptz,
  completed_at timestamptz
);
```

---

## 5. Moss integration

Use **one index** (`product_knowledge`) with metadata filtering — simpler than
managing one index per product, and matches Moss's documented filter pattern.

```ts
// lib/moss.ts
import { MossClient, DocumentInfo } from "@moss-dev/moss";

export const moss = new MossClient(
  process.env.MOSS_PROJECT_ID!,
  process.env.MOSS_PROJECT_KEY!
);

const INDEX = "product_knowledge";

export async function indexChunks(docs: DocumentInfo[]) {
  // first call ever: createIndex(INDEX, docs)
  // every later call: addDocs with upsert
  await moss.addDocs(INDEX, docs, { upsert: true });
}

export async function queryKnowledge(productId: string, question: string, topK = 5) {
  await moss.loadIndex(INDEX);
  const results = await moss.query(INDEX, question, {
    topK,
    filter: { field: "product_id", condition: { $eq: productId } },
  });
  return results.docs; // [{ id, text, score, metadata: {title, page, document_id} }]
}
```

Ingestion (PDF → chunks):

```ts
// pseudo: for each page of text extracted via unpdf/pdf-parse
const chunks = chunkByWords(pageText, 400, 50); // size, overlap
chunks.forEach((chunk, i) =>
  docs.push({
    id: `${documentId}-p${page}-c${i}`,
    text: chunk,
    metadata: { product_id: productId, document_id: documentId, title, page: String(page) },
  })
);
```

"Smart use of MOSS" angle for judges: metadata filtering per product on a
single shared index, hybrid search (so exact part numbers like "F3" still
match alongside semantic queries like "horn doesn't work"), and citations
returned straight from `metadata.title` / `metadata.page`.

---

## 6. The Diagnostic Agent — system prompt & schema

This is the most important file in the whole project. Put it in
`lib/prompts/diagnostician.ts`.

### System prompt (give this to the LLM verbatim, with placeholders filled)

```
You are an expert field technician for "{PRODUCT_NAME}" ({CATEGORY}), made by
{COMPANY_NAME}. You diagnose problems the way an experienced support engineer
does: through investigation and elimination — never by dumping information.

You are given:
- CONTEXT: excerpts from the official documentation, each tagged with
  [source: <title>, page <n>]
- CONVERSATION HISTORY
- CURRENT HYPOTHESES (a ranked list from previous turns, may be empty)

Rules:
1. On the first user message describing a problem, propose 2-5 plausible root
   causes grounded in CONTEXT, each with an initial confidence (sum ≈ 100).
2. Never state a conclusion immediately. Ask exactly ONE focused follow-up
   question that would best split the hypothesis space (the question whose
   two possible answers most change the rankings).
3. After every user answer, update each hypothesis's confidence and status
   (active / eliminated / confirmed) and briefly say why it changed.
4. Only suggest SAFE checks the user can do themselves. Never suggest opening
   battery packs, high-voltage components, or anything CONTEXT doesn't mark
   as user-serviceable.
5. Stop investigating once one hypothesis has confidence > 60, or all
   hypotheses are exhausted. Then give: final diagnosis, recommended
   corrective action, and cite the exact source(s).
6. EVERY factual claim about the product (part names, locations, fuse ratings,
   procedures) must be backed by a citation from CONTEXT. If CONTEXT doesn't
   cover it, say so plainly and suggest contacting {COMPANY_NAME} support —
   never invent specs or part numbers.
7. Be concise. One question or one verdict per turn, plus a one-sentence
   reason for the hypothesis changes.

Respond ONLY with valid JSON matching this schema, no markdown, no commentary:
{
  "message": string,                 // what the user sees in chat
  "stage": "investigating" | "testing" | "diagnosed",
  "hypotheses": [
    { "id": string, "label": string, "confidence": number, "status": "active"|"eliminated"|"confirmed", "reasoning": string }
  ],
  "citations": [ { "doc_title": string, "page": number, "snippet": string } ],
  "recommended_action": string | null,
  "spare_parts": string[] | null
}
```

### Conversation loop (per request)
1. Append user message to `conversations.messages`.
2. `queryKnowledge(productId, userMessage)` → format as `CONTEXT`.
3. Build prompt = system prompt + CONTEXT + last ~10 messages + current
   `hypotheses`.
4. Call Gemini with `responseMimeType: "application/json"`.
5. Parse JSON, append assistant message, overwrite `hypotheses` and `stage`,
   save to Supabase, return to client.
6. Frontend renders chat bubble + re-renders hypothesis board (animate
   confidence bar changes, fade `eliminated` cards, highlight `confirmed`).

---

## 7. Bonus features to actually build (pick exactly 2)

1. **Image-based troubleshooting** — user uploads a photo (dashboard warning
   light, damaged part). Send the image + a short description prompt to
   Gemini ("describe what's visible and any error codes/lights"), feed that
   description into the diagnostic loop as if it were a user message. Same
   API key as the text agent, so it's cheap to add and very demoable.

2. **My Garage + maintenance reminders** — `user_products` lets a user "own"
   a product; `maintenance_tasks` (seeded by the company, e.g. "Replace filter
   every 12 months") get instantiated into `user_maintenance_log` with a
   `due_at`. A simple `/garage` page lists owned products with
   upcoming/overdue tasks and a "mark done" button that recomputes the next
   `due_at`.

Skip auto-extraction of maintenance schedules and voice input — high effort,
low demo reliability, not worth it for 24 hours.

---

## 8. Setup — accounts & keys (do this first, ~30 min)

1. **GitHub**: fork `pclub-uiet/Mantis` to your account (required for submission).
2. **Supabase**: create a free project → copy `Project URL`, `anon key`,
   `service role key`. Create a storage bucket `product-files` (public read).
3. **Moss**: sign up at `moss.dev` → get `MOSS_PROJECT_ID` and
   `MOSS_PROJECT_KEY` (free tier).
4. **Gemini**: get a free API key at Google AI Studio (`aistudio.google.com`)
   → `GEMINI_API_KEY`.
5. **Vercel**: connect your forked repo for one-click deploys.

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MOSS_PROJECT_ID=
MOSS_PROJECT_KEY=
GEMINI_API_KEY=
```

> Note on Moss in serverless: `@moss-dev/moss` embeds a Rust runtime via
> native bindings. It works fine on Vercel Node.js functions (not Edge
> runtime) for Linux x64, which is what Vercel uses. If you hit native-module
> build errors during deploy, fall back to running the Next.js app on Render
> (free web service, full container, zero native-module issues) — same code,
> different host.

---

