import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/ingest";

// Must run on Node.js — @moss-dev/moss uses native Rust bindings
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Protect with service-role key so only internal callers can trigger
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
  if (!auth || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let documentId: string;
  try {
    const body = await request.json();
    documentId = body?.documentId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }

  try {
    const result = await ingestDocument(documentId);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ingest] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
