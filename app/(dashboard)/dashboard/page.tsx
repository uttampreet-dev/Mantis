import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PackageOpen, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AddProductDialog } from "./product-dialog";
import { EditProductDialog } from "./product-dialog";
import { DeleteProductButton } from "./delete-product-btn";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "user") redirect("/products");

  // Fetch company
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("user_id", user.id)
    .single();

  // Fetch products with doc counts
  const { data: products } = company
    ? await supabase
        .from("products")
        .select("id, name, category, description, image_url, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {company?.name ?? "Dashboard"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <AddProductDialog />
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* No company warning */}
      {!company && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your company profile wasn&apos;t created automatically. Please contact
          support or re-sign-up.
        </div>
      )}

      {/* Products grid */}
      {products && products.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col overflow-hidden">
              {product.image_url ? (
                <div className="relative h-40 w-full bg-muted">
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center bg-muted">
                  <PackageOpen className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">
                    {product.name}
                  </CardTitle>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {product.category}
                  </Badge>
                </div>
              </CardHeader>
              {product.description && (
                <CardContent className="py-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                </CardContent>
              )}
              <CardFooter className="mt-auto flex items-center justify-between pt-4">
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Manage documents
                </Link>
                <div className="flex items-center">
                  <EditProductDialog product={product} />
                  <DeleteProductButton productId={product.id} />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <PackageOpen className="mb-4 h-10 w-10 text-muted-foreground/50" />
          <h3 className="text-sm font-medium">No products yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first product to get started.
          </p>
        </div>
      )}
    </div>
  );
}
