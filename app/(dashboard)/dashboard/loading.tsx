export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-8 w-52 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-40 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-16 rounded-md bg-muted animate-pulse" />
        </div>
      </div>

      {/* Product cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border overflow-hidden flex flex-col">
            <div className="h-40 bg-muted animate-pulse" />
            <div className="p-4 space-y-2 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="h-5 w-3/4 rounded-md bg-muted animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-muted animate-pulse shrink-0" />
              </div>
              <div className="h-3 w-full rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-2/3 rounded-md bg-muted animate-pulse" />
            </div>
            <div className="px-4 pb-4 flex items-center justify-between">
              <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
              <div className="flex gap-1">
                <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
                <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
