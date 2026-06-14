import Link from "next/link";
import { Car } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export async function SiteNav() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  const isUser = role === "user";
  const isCompany = role === "company";

  return (
    <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto max-w-6xl px-6 flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
            <span className="text-mantis">M</span>antis
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/products"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Products
            </Link>
            {isUser && (
              <Link
                href="/garage"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Car className="h-3.5 w-3.5" />
                My Garage
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            isCompany ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/garage"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Car className="h-3.5 w-3.5" />
                My Garage
              </Link>
            )
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
