import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildDiagnosticianPrompt } from "@/lib/prompts/diagnostician";
import { callGemini } from "@/lib/gemini";
import type {
  StoredMessage,
  Hypothesis,
  EnrichedCitation,
} from "@/lib/types/assistant";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const productId = params.id;

  let body: { conversationId?: string; message: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { conversationId: existingConvId, message } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();

  // Fetch product + company
  const { data: product } = await admin
    .from("products")
    .select("id, name, category, companies(name)")
    .eq("id", productId)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companiesField = (product as any).companies;
  const company = Array.isArray(companiesField)
    ? companiesField[0]
    : companiesField;

  // Get or create conversation
  let conversationId = existingConvId ?? null;
  let existingMessages: StoredMessage[] = [];
  let existingHypotheses: Hypothesis[] = [];

  if (conversationId) {
    const { data: conv } = await admin
      .from("conversations")
      .select("messages, hypotheses, stage")
      .eq("id", conversationId)
      .single();
    if (conv) {
      existingMessages = (conv.messages as unknown as StoredMessage[]) ?? [];
      existingHypotheses = (conv.hypotheses as unknown as Hypothesis[]) ?? [];
    }
  } else {
    const { data: newConv, error: convErr } = await admin
      .from("conversations")
      .insert({
        product_id: productId,
        user_id: user?.id ?? null,
        messages: [],
        hypotheses: [],
        stage: "investigating",
      })
      .select("id")
      .single();

    if (convErr || !newConv) {
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }
    conversationId = newConv.id;
  }

  // Append new user message
  const userMsg: StoredMessage = {
    role: "user",
    content: message.trim(),
    timestamp: new Date().toISOString(),
  };
  const allMessages = [...existingMessages, userMsg];

  // Build prompt + Gemini-format conversation
  const { systemPrompt, conversation } = await buildDiagnosticianPrompt(
    {
      name: product.name,
      category: product.category,
      companyName: company?.name ?? "the manufacturer",
    },
    productId,
    message.trim(),
    allMessages,
    existingHypotheses
  );

  // Call Gemini
  let geminiResponse;
  try {
    geminiResponse = await callGemini(systemPrompt, conversation);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI error" },
      { status: 500 }
    );
  }

  // Persist updated state
  const assistantMsg: StoredMessage = {
    role: "assistant",
    content: geminiResponse.message,
    timestamp: new Date().toISOString(),
  };
  const updatedMessages = [...allMessages, assistantMsg];

  await admin
    .from("conversations")
    .update({
      messages: updatedMessages as unknown as Record<string, unknown>[],
      hypotheses: geminiResponse.hypotheses as unknown as Record<
        string,
        unknown
      >[],
      stage: geminiResponse.stage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId!);

  // Enrich citations: look up document URL by title
  const enrichedCitations: EnrichedCitation[] = await Promise.all(
    geminiResponse.citations.map(async (citation) => {
      const { data: doc } = await admin
        .from("documents")
        .select("url, type")
        .eq("product_id", productId)
        .ilike("title", citation.doc_title)
        .limit(1)
        .maybeSingle();

      let url: string | null = null;
      if (doc) {
        if (doc.type === "link") {
          url = doc.url;
        } else if (doc.url.startsWith("http")) {
          // Already a public URL (uploaded via setup scripts)
          url = doc.url;
          if (doc.type === "pdf" && citation.page > 0) {
            url += `#page=${citation.page}`;
          }
        } else {
          const { data: signed } = await admin.storage
            .from("product-files")
            .createSignedUrl(doc.url, 3600);
          url = signed?.signedUrl ?? null;
          if (url && doc.type === "pdf" && citation.page > 0) {
            url += `#page=${citation.page}`;
          }
        }
      }

      return {
        ...citation,
        url,
        doc_type: doc?.type ?? null,
      };
    })
  );

  return NextResponse.json({
    ...geminiResponse,
    conversationId,
    citations: enrichedCitations,
  });
}
