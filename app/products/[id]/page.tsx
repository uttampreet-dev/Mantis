import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Building2, Tag, FileText, Car, CheckCircle2, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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

    if (profile?.role !== "company") {
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
    <main className="container mx-auto max-w-5xl px-6 py-8">
        {/* Back */}
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to marketplace
        </Link>

        {/* Hero */}
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] items-start mb-10">
          <div className="flex gap-5 items-start">
            {product.image_url ? (
              <div className="shrink-0 h-24 w-24 rounded-xl overflow-hidden border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="shrink-0 flex h-24 w-24 items-center justify-center rounded-xl border border-border bg-muted">
                <Bot className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}

            <div className="space-y-2 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight leading-tight">
                {product.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {product.category}
                </span>
                {company && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    {company.name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  {documents.length} resource{documents.length !== 1 ? "s" : ""}
                </span>
              </div>
              {product.description && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                  {product.description}
                </p>
              )}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              href={`/products/${product.id}/chat`}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 shadow-lg shadow-primary/20"
            >
              <Zap className="h-4 w-4" />
              Ask Assistant
            </Link>

            {isGarageUser && (
              inGarage ? (
                <Link
                  href="/garage"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  In My Garage
                </Link>
              ) : (
                <form action={addToGarage}>
                  <input type="hidden" name="product_id" value={product.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Car className="h-4 w-4" />
                    Add to Garage
                  </button>
                </form>
              )
            )}

            <p className="text-[11px] text-muted-foreground/60 text-right">
              AI-powered diagnostic support
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mb-8" />

        {/* Tabs */}
        <ProductTabs
          product={product as { id: string; name: string }}
          documents={documents}
        />
    </main>
  );
}
