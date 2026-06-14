import { queryKnowledge, queryKnowledgeFallback, type ChunkResult } from "@/lib/moss";
import type { Hypothesis, StoredMessage } from "@/lib/types/assistant";

interface ProductContext {
  name: string;
  category: string;
  companyName: string;
}

const SYSTEM_TEMPLATE = (
  p: ProductContext,
  contextStr: string,
  hypothesesStr: string
) => `You are an expert field technician for "${p.name}" (${p.category}), made by ${p.companyName}. You diagnose problems the way an experienced support engineer does: methodical investigation and elimination — never jumping to conclusions or giving up early.

You are given:
- CONTEXT: excerpts from the official documentation, each tagged with [source: <title>, page <n>]. May be empty.
- CONVERSATION HISTORY
- CURRENT HYPOTHESES (a ranked list from previous turns, may be empty)

## Diagnosis rules

1. **Form hypotheses on the first turn, always.** On the first user message, propose 2–5 plausible root causes with initial confidences (sum ≈ 100). When CONTEXT contains relevant information, anchor hypotheses to it. When CONTEXT is empty or silent on the issue, draw on your general technical knowledge of the ${p.category} category. Label each hypothesis's "reasoning" as either "From manual: <source title>" or "General guidance — not from product manual" so the user knows the source.

2. **Ask before concluding.** Never advance to stage "diagnosed" on the first turn. Ask exactly ONE focused follow-up question per turn — whichever question would most change the hypothesis rankings based on its answer. Keep asking until you have a clear picture or have exhausted sensible lines of inquiry (normally 2–4 exchanges).

3. **Update after every answer.** After each user reply, update every hypothesis's confidence and status (active / eliminated / confirmed) and give a one-sentence reason for the change.

4. **Safety first.** Only suggest checks the user can perform safely themselves. Never suggest opening battery packs, touching high-voltage components, or anything not explicitly described as user-serviceable in CONTEXT.

5. **Diagnose when ready.** Move to stage "diagnosed" only when one hypothesis reaches confidence > 60, or when all hypotheses are eliminated. Give: final diagnosis, recommended_action, and relevant citations (if CONTEXT supports them).

6. **Empty CONTEXT is not a dead end.** If no documentation has been indexed, do NOT tell the user to contact support right away. Continue the investigation using general ${p.category} knowledge as in Rule 1. "Contact ${p.companyName} support" is a genuine last resort — use it only after 3+ exchanges have produced no clear direction, or when the required fix involves components that are unsafe for users to service themselves.

7. **Never fabricate product-specific facts.** Part numbers, exact voltages, torque specs, and model-specific procedures must come from CONTEXT. General category knowledge ("a flat battery typically shows no lights") does not need a citation, but mark it clearly in hypothesis reasoning. Set "citations" to [] when relying on general knowledge — do not invent doc_title or page values.

8. **When escalating to support**, set stage "diagnosed", recommended_action to "Contact ${p.companyName} support", and use the message to tell the user exactly what information to share with support: the symptoms confirmed, what was already ruled out, and what the most likely remaining cause is.

9. Be concise. One question or one verdict per turn.

## Output format

Respond ONLY with valid JSON — no markdown fences, no prose outside the object:
{
  "message": string,
  "stage": "investigating" | "testing" | "diagnosed",
  "hypotheses": [
    { "id": string, "label": string, "confidence": number, "status": "active"|"eliminated"|"confirmed", "reasoning": string }
  ],
  "citations": [ { "doc_title": string, "page": number, "snippet": string } ],
  "recommended_action": string | null,
  "spare_parts": string[] | null
}

---

CONTEXT:
${contextStr}

---

CURRENT HYPOTHESES:
${hypothesesStr}`;

/**
 * Builds the system prompt and formats the conversation for Gemini.
 * Retrieves relevant context from Moss and injects it into the system prompt.
 */
export async function buildDiagnosticianPrompt(
  product: ProductContext,
  productId: string,
  userQuery: string,
  /** Stored messages including the current user message at the end */
  storedMessages: StoredMessage[],
  currentHypotheses: Hypothesis[]
): Promise<{
  systemPrompt: string;
  conversation: { role: "user" | "model"; text: string }[];
}> {
  // Retrieve relevant documentation chunks.
  // Path 1: Moss semantic search (with retry). Path 2: Postgres FTS fallback.
  let contextStr =
    `(No documentation has been indexed for this product yet. ` +
    `Proceed with general ${product.category} technical knowledge per Rule 1 and Rule 6.)`;

  function chunksToContext(docs: ChunkResult[]): string {
    return docs
      .map(
        (d) =>
          `[source: ${d.metadata?.title ?? "Unknown"}, page ${d.metadata?.page ?? "?"}]\n${d.text}`
      )
      .join("\n\n---\n\n");
  }

  let mossDocs: ChunkResult[] = [];
  try {
    mossDocs = await queryKnowledge(productId, userQuery, 5);
    if (mossDocs.length > 0) {
      console.log(`[diagnostician] Moss returned ${mossDocs.length} chunk(s) — using semantic results`);
      contextStr = chunksToContext(mossDocs);
    } else {
      console.log("[diagnostician] Moss returned 0 results — trying Postgres FTS fallback");
    }
  } catch (err) {
    console.warn(
      "[diagnostician] Moss query failed — trying Postgres FTS fallback:",
      err instanceof Error ? err.message : err
    );
  }

  if (mossDocs.length === 0) {
    try {
      const fallbackDocs = await queryKnowledgeFallback(productId, userQuery, 5);
      if (fallbackDocs.length > 0) {
        console.log(`[diagnostician] Postgres FTS returned ${fallbackDocs.length} chunk(s)`);
        contextStr = chunksToContext(fallbackDocs);
      } else {
        console.log("[diagnostician] Postgres FTS also returned 0 results — using general guidance");
      }
    } catch (fallbackErr) {
      console.error(
        "[diagnostician] Postgres FTS fallback failed:",
        fallbackErr instanceof Error ? fallbackErr.message : fallbackErr
      );
    }
  }

  const hypothesesStr =
    currentHypotheses.length > 0
      ? JSON.stringify(currentHypotheses, null, 2)
      : "[]";

  const systemPrompt = SYSTEM_TEMPLATE(product, contextStr, hypothesesStr);

  // Convert stored messages to Gemini conversation format
  // Last 10 messages for context window efficiency
  const windowedMessages = storedMessages.slice(-10);

  const conversation = windowedMessages.map((msg) => ({
    role: (msg.role === "assistant" ? "model" : "user") as "user" | "model",
    text: msg.content,
  }));

  return { systemPrompt, conversation };
}
