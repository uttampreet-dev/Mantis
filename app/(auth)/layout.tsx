import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <nav className="border-b border-border/50 px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
          <span className="text-mantis">M</span>antis
        </Link>
      </nav>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
