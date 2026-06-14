import Link from "next/link";
import { LayoutGrid, Package, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./dashboard/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let companyName = "Dashboard";
  if (user) {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("user_id", user.id)
      .single();
    if (company?.name) companyName = company.name;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-border px-5">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
            <span className="text-mantis">M</span>antis
          </Link>
        </div>

        {/* Company name */}
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="truncate text-sm font-medium text-foreground mt-0.5">
            {companyName}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LayoutGrid className="h-4 w-4 shrink-0" />
            Products
          </Link>
          <Link
            href="/products"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Package className="h-4 w-4 shrink-0" />
            Marketplace
          </Link>
        </nav>

        {/* Sign out */}
        <div className="border-t border-border p-3">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center border-b border-border px-6">
          <p className="text-sm text-muted-foreground">Company Dashboard</p>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
