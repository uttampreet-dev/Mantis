"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function getCompany() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("user_id", user.id)
    .single();

  return { supabase, user, company };
}

export async function addProduct(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const imageFile = formData.get("image") as File | null;

  if (!name || !category) return { error: "Name and category are required." };

  const { supabase, company } = await getCompany();
  if (!company) return { error: "Company profile not found. Please contact support." };

  let image_url: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop();
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("product-files")
      .upload(path, imageFile);
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("product-files").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }
  }

  const { error } = await supabase.from("products").insert({
    company_id: company.id,
    name,
    category,
    description: description || null,
    image_url,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateProduct(formData: FormData) {
  const productId = formData.get("product_id") as string;
  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const imageFile = formData.get("image") as File | null;

  if (!productId || !name || !category) return { error: "Missing required fields." };

  const { supabase } = await getCompany();

  let image_url: string | undefined;
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop();
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("product-files")
      .upload(path, imageFile);
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("product-files").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }
  }

  const updates: Record<string, string | null> = { name, category, description: description || null };
  if (image_url) updates.image_url = image_url;

  const { error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteProduct(formData: FormData) {
  const productId = formData.get("product_id") as string;
  if (!productId) return { error: "Missing product ID." };

  const { supabase } = await getCompany();
  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}
