import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PackageOpen, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AddProductDialog } from "./product-dialog";
import { EditProductDialog } from "./product-dialog";
import { DeleteProductButton } from "./delete-product-btn";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "user") redirect("/products");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("user_id", user.id)
    .single();

  const { data: products } = company
    ? await supabase
        .from("products")
        .select("id, name, category, description, image_url, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Products</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {products?.length ?? 0} product{(products?.length ?? 0) !== 1 ? "s" : ""} listed
          </p>
        </div>
        <AddProductDialog />
      </div>

      {/* No company warning */}
      {!company && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
          Company profile not found. Please re-sign up or contact support.
        </div>
      )}

      {/* Products */}
      {products && products.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
            >
              {product.image_url ? (
                <div className="relative h-36 w-full bg-muted">
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-36 items-center justify-center bg-muted">
                  <PackageOpen className="h-8 w-8 text-muted-foreground/20" />
                </div>
              )}

              <div className="flex flex-1 flex-col p-4 gap-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                      {product.name}
                    </h3>
                    <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {product.category}
                    </span>
                  </div>
                  {product.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between">
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Manage docs
                  </Link>
                  <div className="flex items-center">
                    <EditProductDialog product={product} />
                    <DeleteProductButton productId={product.id} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <div className="mb-4 rounded-full border border-dashed border-border p-5">
            <PackageOpen className="h-8 w-8 text-muted-foreground/20" />
          </div>
          <h3 className="text-sm font-medium">No products yet</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Add your first product to start offering AI-powered support.
          </p>
          <div className="mt-5">
            <AddProductDialog />
          </div>
        </div>
      )}
    </div>
  );
}
