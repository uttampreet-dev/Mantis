export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold tracking-tight">Mantis</h1>
      <p className="mt-4 text-muted-foreground">
        AI-powered product support platform
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/products"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Browse Products
        </a>
        <a
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Dashboard
        </a>
      </div>
    </main>
  );
}
