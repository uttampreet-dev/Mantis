"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, PackageOpen } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Product {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  companies: { name: string } | null;
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-lg hover:shadow-black/20"
    >
      {/* Image */}
      <div className="relative h-44 w-full overflow-hidden bg-muted">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PackageOpen className="h-10 w-10 text-muted-foreground/20" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
          </div>
          <span className="inline-block rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {product.category}
          </span>
        </div>

        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
            {product.description}
          </p>
        )}

        <p className="mt-auto text-xs text-muted-foreground/60 pt-1">
          by{" "}
          <span className="font-medium text-muted-foreground">
            {product.companies?.name ?? "Unknown"}
          </span>
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category))).sort();
    return ["All", ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;
    if (activeCategory !== "All") {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.companies?.name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, search, activeCategory]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input border-border h-9 text-sm"
          />
        </div>
      </div>

      {/* Category pills */}
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:border-border/80 hover:bg-accent hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Count */}
      {(search || activeCategory !== "All") && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <PackageOpen className="mb-4 h-10 w-10 text-muted-foreground/20" />
          <h3 className="text-sm font-medium">No products found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            {search
              ? `No results for "${search}". Try a different term.`
              : "No products in this category yet."}
          </p>
          {(search || activeCategory !== "All") && (
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("All");
              }}
              className="mt-4 text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
