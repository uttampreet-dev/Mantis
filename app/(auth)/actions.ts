"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as "company" | "user";
  const companyName = formData.get("company_name") as string | null;

  if (!email || !password || !role) {
    return { error: "All fields are required." };
  }
  if (role === "company" && !companyName?.trim()) {
    return { error: "Company name is required." };
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, company_name: companyName ?? "" },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  // If no email confirmation needed, session exists immediately
  if (data.session) {
    if (role === "company" && companyName) {
      await supabase
        .from("companies")
        .insert({ user_id: data.user!.id, name: companyName.trim() });
    }
    redirect(role === "company" ? "/dashboard" : "/products");
  }

  // Email confirmation required
  return { success: "Check your email to confirm your account." };
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Email and password are required." };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user!.id)
    .single();

  const role = profile?.role ?? data.user!.user_metadata?.role ?? "user";
  redirect(role === "company" ? "/dashboard" : "/products");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
