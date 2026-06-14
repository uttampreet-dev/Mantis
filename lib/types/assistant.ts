import { z } from "zod";

export const HypothesisSchema = z.object({
  id: z.string(),
  label: z.string(),
  confidence: z.number().min(0).max(100),
  status: z.enum(["active", "eliminated", "confirmed"]),
  reasoning: z.string(),
});

export const CitationSchema = z.object({
  doc_title: z.string(),
  page: z.number(),
  snippet: z.string(),
  url: z.string().nullable().optional(),
});

export const AssistantResponseSchema = z.object({
  message: z.string(),
  stage: z.enum(["investigating", "testing", "diagnosed"]),
  hypotheses: z.array(HypothesisSchema),
  citations: z.array(CitationSchema),
  recommended_action: z.string().nullable(),
  spare_parts: z.array(z.string()).nullable(),
});

export type Hypothesis = z.infer<typeof HypothesisSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface EnrichedCitation extends Citation {
  url: string | null;
  doc_type: string | null;
}

export interface AssistantApiResponse extends AssistantResponse {
  conversationId: string;
  citations: EnrichedCitation[];
}
