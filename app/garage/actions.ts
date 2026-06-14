"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markTaskComplete(formData: FormData): Promise<void> {
  const logId = formData.get("log_id") as string;
  const userProductId = formData.get("user_product_id") as string;
  const taskId = formData.get("task_id") as string;
  const intervalMonths = parseInt(formData.get("interval_months") as string, 10);

  if (!logId || !userProductId || !taskId || isNaN(intervalMonths)) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_maintenance_log")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", logId);

  const nextDue = new Date();
  nextDue.setMonth(nextDue.getMonth() + intervalMonths);

  await supabase.from("user_maintenance_log").insert({
    user_product_id: userProductId,
    task_id: taskId,
    due_at: nextDue.toISOString(),
  });

  revalidatePath("/garage");
}
