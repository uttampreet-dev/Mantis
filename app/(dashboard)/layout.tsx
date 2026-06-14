import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background px-6 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="font-bold text-lg tracking-tight">
          Mantis
        </Link>
        <span className="text-muted-foreground/50 select-none">|</span>
        <span className="text-sm text-muted-foreground">Company Dashboard</span>
      </header>
      <main className="container mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
