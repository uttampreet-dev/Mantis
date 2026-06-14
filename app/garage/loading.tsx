export default function GarageLoading() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1.5">
          <div className="h-8 w-40 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-56 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Product cards */}
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border overflow-hidden">
            {/* Product header row */}
            <div className="flex items-center gap-4 p-5">
              <div className="h-14 w-14 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 rounded-md bg-muted animate-pulse" />
                <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
              </div>
              <div className="h-8 w-28 rounded-lg bg-muted animate-pulse shrink-0" />
            </div>

            {/* Maintenance task rows */}
            <div className="border-t p-5 space-y-3">
              <div className="h-4 w-36 rounded-md bg-muted animate-pulse" />
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-48 rounded-md bg-muted animate-pulse" />
                    <div className="h-3 w-32 rounded-md bg-muted animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <div className="h-6 w-28 rounded-full bg-muted animate-pulse" />
                    <div className="h-7 w-14 rounded-md bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
