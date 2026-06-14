"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function getDocType(file: File): "pdf" | "doc" | "image" | "video" {
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "doc";
}

/** Fire-and-forget: hits /api/ingest so the heavy work runs in a separate request. */
function triggerIngest(documentId: string) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  fetch(`${siteUrl}/api/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ documentId }),
  }).catch((err) => console.error("[ingest trigger]", err));
}

export async function addDocument(formData: FormData) {
  const productId = formData.get("product_id") as string;
  const mode = formData.get("mode") as "file" | "link";
  const title = (formData.get("title") as string)?.trim();

  if (!productId || !title) return { error: "Title is required." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  let url: string;
  let type: string;

  if (mode === "link") {
    url = (formData.get("url") as string)?.trim();
    if (!url) return { error: "URL is required." };
    type = "link";
  } else {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return { error: "Please select a file." };

    type = getDocType(file);
    const ext = file.name.split(".").pop();
    const storagePath = `documents/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-files")
      .upload(storagePath, file);

    if (uploadError) return { error: uploadError.message };

    const { data: urlData } = supabase.storage
      .from("product-files")
      .getPublicUrl(storagePath);
    url = urlData.publicUrl;
  }

  const { data: inserted, error } = await supabase
    .from("documents")
    .insert({ product_id: productId, type, title, url, indexed: false })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Trigger background ingestion — does not block the response
  if (inserted?.id) {
    triggerIngest(inserted.id);
  }

  revalidatePath(`/dashboard/products/${productId}`);
  return { success: true };
}

export async function deleteDocument(formData: FormData) {
  const documentId = formData.get("document_id") as string;
  const productId = formData.get("product_id") as string;
  if (!documentId) return { error: "Missing document ID." };

  const supabase = createClient();
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/products/${productId}`);
  return { success: true };
}

export async function addMaintenanceTask(formData: FormData) {
  const productId = formData.get("product_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const intervalMonths = parseInt(formData.get("interval_months") as string, 10);
  const description = (formData.get("description") as string)?.trim() || null;

  if (!productId || !title) return { error: "Title is required." };
  if (isNaN(intervalMonths) || intervalMonths < 1)
    return { error: "Interval must be at least 1 month." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("maintenance_tasks").insert({
    product_id: productId,
    title,
    interval_months: intervalMonths,
    description,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/products/${productId}`);
  return { success: true };
}

export async function deleteMaintenanceTask(formData: FormData): Promise<void> {
  const taskId = formData.get("task_id") as string;
  const productId = formData.get("product_id") as string;
  if (!taskId) return;

  const supabase = createClient();
  await supabase.from("maintenance_tasks").delete().eq("id", taskId);
  revalidatePath(`/dashboard/products/${productId}`);
}
