import { GoogleGenerativeAI } from "@google/generative-ai";
import { AssistantResponseSchema, type AssistantResponse } from "./types/assistant";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function stripMarkdownFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
}

async function attemptCall(
  systemPrompt: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  userMessage: string
): Promise<string> {
  const model = genai.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json" },
    systemInstruction: systemPrompt,
  });

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

/**
 * Calls Gemini 2.5 Flash with JSON mode and validates against the assistant schema.
 * Retries once if the response fails parsing.
 */
export async function callGemini(
  systemPrompt: string,
  /** Full conversation ending with the current user message */
  conversation: { role: "user" | "model"; text: string }[]
): Promise<AssistantResponse> {
  const history = conversation.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));
  const userMessage = conversation[conversation.length - 1].text;

  let raw: string;
  try {
    raw = await attemptCall(systemPrompt, history, userMessage);
  } catch (err) {
    throw new Error(`Gemini API error: ${err instanceof Error ? err.message : err}`);
  }

  const tryParse = (text: string): AssistantResponse | null => {
    try {
      const parsed = JSON.parse(stripMarkdownFences(text));
      return AssistantResponseSchema.parse(parsed);
    } catch {
      return null;
    }
  };

  const first = tryParse(raw);
  if (first) return first;

  // Retry once with an explicit correction instruction
  const retrySystemPrompt =
    systemPrompt +
    "\n\nCRITICAL: Your previous response was not valid JSON. " +
    "Return ONLY valid JSON that exactly matches the schema. " +
    "No markdown fences, no text before or after the JSON object.";

  const retryRaw = await attemptCall(retrySystemPrompt, history, userMessage);
  const second = tryParse(retryRaw);
  if (second) return second;

  throw new Error(
    `Gemini returned invalid JSON after retry. Raw: ${retryRaw.slice(0, 300)}`
  );
}

const VISION_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

/**
 * Sends an image to Gemini and returns a factual description of diagnostic
 * indicators visible in the photo (warning lights, error codes, damage, part IDs).
 */
export async function callGeminiVision(
  imageBase64: string,
  mimeType: string,
  productName: string
): Promise<string> {
  if (!VISION_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}`);
  }

  const model = genai.getGenerativeModel({ model: MODEL });

  const prompt = `You are a visual diagnostic assistant. The user has sent a photo related to their ${productName}.

Identify and describe any of the following that are visible:
- Warning lights or indicator lights (name each light and its color/state)
- Error codes or fault codes shown on displays or labels
- Visible damage, wear, corrosion, or unusual conditions on parts
- Part labels, component identifiers, or model/serial numbers
- Any other diagnostic clues useful for troubleshooting

Be specific and factual — describe exactly what you see, do not guess at root causes.
If the image is unclear or you cannot identify something, say so.
Keep your response under 120 words.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBase64,
        mimeType,
      },
    },
  ]);

  return result.response.text().trim();
}
