export default function ProductsLoading() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-10">
      {/* Page header */}
      <div className="mb-8 space-y-2">
        <div className="h-9 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-5 w-80 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Search + filter bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="h-9 flex-1 rounded-lg bg-muted animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-20 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
      </div>

      {/* Product card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border overflow-hidden">
            <div className="h-44 bg-muted animate-pulse" />
            <div className="p-4 space-y-2.5">
              <div className="h-5 w-4/5 rounded-md bg-muted animate-pulse" />
              <div className="h-4 w-1/3 rounded-full bg-muted animate-pulse" />
              <div className="space-y-1.5 pt-1">
                <div className="h-3 w-full rounded-md bg-muted animate-pulse" />
                <div className="h-3 w-3/4 rounded-md bg-muted animate-pulse" />
              </div>
              <div className="h-8 w-full rounded-lg bg-muted animate-pulse mt-1" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
