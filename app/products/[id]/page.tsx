import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Building2, Tag, FileText, Car, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProductTabs } from "./product-tabs";
import { addToGarage } from "./actions";

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, category, description, image_url, companies(id, name), documents(id, type, title, url, indexed)"
    )
    .eq("id", params.id)
    .single();

  if (!product) notFound();

  // Garage status (only relevant for role=user)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isGarageUser = false;
  let inGarage = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "user") {
      isGarageUser = true;
      const { data: existing } = await supabase
        .from("user_products")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", params.id)
        .maybeSingle();
      inGarage = !!existing;
    }
  }

  const company = Array.isArray(product.companies)
    ? product.companies[0]
    : product.companies;
  const documents = (product.documents ?? []) as {
    id: string;
    type: string;
    title: string;
    url: string;
    indexed: boolean;
  }[];

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to marketplace
      </Link>

      {/* Hero section */}
      <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
        <div className="flex gap-6 items-start">
          {/* Image */}
          {product.image_url ? (
            <div className="shrink-0 h-28 w-28 rounded-xl overflow-hidden border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="shrink-0 flex h-28 w-28 items-center justify-center rounded-xl border bg-muted">
              <Bot className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}

          {/* Info */}
          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {product.category}
                </Badge>
                {company && (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    {company.name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  {documents.length} resource{documents.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                {product.description}
              </p>
            )}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col items-end justify-start gap-3">
          <Button asChild size="lg" className="gap-2 shadow-sm">
            <Link href={`/products/${product.id}/chat`}>
              <Bot className="h-5 w-5" />
              Ask the Assistant
            </Link>
          </Button>

          {isGarageUser && (
            inGarage ? (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link href="/garage">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  In My Garage
                </Link>
              </Button>
            ) : (
              <form action={addToGarage}>
                <input type="hidden" name="product_id" value={product.id} />
                <Button type="submit" size="sm" variant="outline" className="gap-1.5 w-full">
                  <Car className="h-4 w-4" />
                  Add to My Garage
                </Button>
              </form>
            )
          )}

          <p className="text-xs text-muted-foreground text-right">
            AI-powered diagnostic support
          </p>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Tabs */}
      <ProductTabs
        product={product as { id: string; name: string }}
        documents={documents}
      />
    </main>
  );
}
