"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addToGarage(formData: FormData): Promise<void> {
  const productId = formData.get("product_id") as string;
  if (!productId) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Idempotent: skip if already in garage
  const { data: existing } = await supabase
    .from("user_products")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    revalidatePath(`/products/${productId}`);
    return;
  }

  const { data: userProduct } = await supabase
    .from("user_products")
    .insert({ user_id: user.id, product_id: productId })
    .select("id")
    .single();

  if (!userProduct) return;

  // Seed maintenance log entries for every existing task
  const { data: tasks } = await supabase
    .from("maintenance_tasks")
    .select("id, interval_months")
    .eq("product_id", productId);

  if (tasks && tasks.length > 0) {
    const logEntries = tasks.map((task) => {
      const dueAt = new Date();
      dueAt.setMonth(dueAt.getMonth() + task.interval_months);
      return {
        user_product_id: userProduct.id,
        task_id: task.id,
        due_at: dueAt.toISOString(),
      };
    });
    await supabase.from("user_maintenance_log").insert(logEntries);
  }

  revalidatePath(`/products/${productId}`);
}
