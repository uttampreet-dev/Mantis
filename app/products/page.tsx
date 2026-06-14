import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/site-nav";
import { ProductGrid } from "@/components/marketplace/product-grid";

export const revalidate = 60;

export default async function ProductsPage() {
  const supabase = createClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, description, image_url, companies(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="container mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-sm text-muted-foreground">
            Browse products and get AI-powered diagnostic support.
          </p>
        </div>
        <ProductGrid
          products={(products ?? []).map((p) => ({
            ...p,
            companies: Array.isArray(p.companies)
              ? p.companies[0] ?? null
              : p.companies,
          }))}
        />
      </main>
    </div>
  );
}
