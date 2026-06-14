import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const role = data.user.user_metadata?.role;
      const companyName = data.user.user_metadata?.company_name;

      if (role === "company" && companyName) {
        const { data: existing } = await supabase
          .from("companies")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (!existing) {
          await supabase
            .from("companies")
            .insert({ user_id: data.user.id, name: companyName });
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
