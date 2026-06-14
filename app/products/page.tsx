import { createClient } from "@/lib/supabase/server";
import { ProductGrid } from "@/components/marketplace/product-grid";

export const revalidate = 60;

export default async function ProductsPage() {
  const supabase = createClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, description, image_url, companies(name)")
    .order("created_at", { ascending: false });

  return (
    <main className="container mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
        <p className="mt-2 text-muted-foreground">
          Browse products and get AI-powered support from expert technicians.
        </p>
      </div>
      <ProductGrid
        products={(products ?? []).map((p) => ({
          ...p,
          companies: Array.isArray(p.companies) ? p.companies[0] ?? null : p.companies,
        }))}
      />
    </main>
  );
}
