import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callGeminiVision } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const productId = params.id;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  // Fetch product name for the vision prompt
  const admin = createAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("name")
    .eq("id", productId)
    .single();

  const productName = product?.name ?? "this product";

  // Convert image to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  let description: string;
  try {
    description = await callGeminiVision(base64, file.type, productName);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Vision analysis failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ description });
}
