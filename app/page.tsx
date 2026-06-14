import Link from "next/link";
import { ArrowRight, Zap, ChevronRight } from "lucide-react";

const DEMO_HYPOTHESES = [
  { label: "Blown fuse F3 (10A)", confidence: 72, status: "confirmed" },
  { label: "Faulty horn relay", confidence: 18, status: "eliminated" },
  { label: "Broken horn button", confidence: 10, status: "eliminated" },
];

const DEMO_MESSAGES = [
  { role: "user", text: "My horn is not working." },
  {
    role: "assistant",
    text: "I've identified 3 possible causes. Does the headlight work normally?",
  },
  { role: "user", text: "Yes, headlight works fine." },
  {
    role: "assistant",
    text: "Most likely cause: Fuse F3 (10A) is blown — see Service Manual, p.42.",
    citation: "Service Manual · p.42",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            <span className="text-mantis">M</span>antis
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_480px] lg:gap-16 items-start">
          {/* Left: text */}
          <div className="space-y-6 pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-primary" />
              MOSS Hack &apos;26 · AI Diagnostic Platform
            </div>
            <h1 className="text-4xl font-bold tracking-tight leading-tight lg:text-5xl">
              Support that{" "}
              <span className="text-mantis">reasons,</span>
              <br />
              not just retrieves.
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-md">
              Mantis builds a live diagnostic board while it talks to your
              customers — ranking hypotheses, eliminating causes, and citing the
              exact page in the manual.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Browse products
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                List your product
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* Right: Diagnostic board preview */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xl">
            {/* Chat column */}
            <div className="flex divide-x divide-border">
              {/* Messages */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="border-b border-border px-4 py-2.5 shrink-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    Chat · Ola S1 Scooter
                  </p>
                </div>
                <div className="flex flex-col gap-3 p-4 flex-1">
                  {DEMO_MESSAGES.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted text-foreground rounded-tl-sm"
                        }`}
                      >
                        {msg.text}
                        {msg.citation && (
                          <div className="mt-1.5 flex items-center gap-1 rounded-md bg-background/40 px-2 py-0.5 text-[10px] text-primary">
                            <span className="opacity-70">from</span> {msg.citation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hypothesis board */}
              <div className="w-48 flex flex-col shrink-0">
                <div className="border-b border-border px-3 py-2.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Diagnostic Board
                  </p>
                </div>
                <div className="p-3 space-y-2 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                      Diagnosed
                    </span>
                  </div>
                  {DEMO_HYPOTHESES.map((h, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-2 space-y-1.5 transition-all ${
                        h.status === "confirmed"
                          ? "border-primary/30 bg-primary/5 glow-mantis-sm"
                          : "border-border bg-background/30 opacity-40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[11px] font-medium leading-tight ${
                            h.status === "eliminated"
                              ? "line-through text-muted-foreground"
                              : h.status === "confirmed"
                              ? "text-primary"
                              : "text-foreground"
                          }`}
                        >
                          {h.label}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {h.confidence}%
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            h.status === "confirmed" ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                          style={{ width: `${h.confidence}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-t border-border/50 bg-muted/20 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Hypothesis-driven",
                desc: "Forms 2–5 ranked root causes, then eliminates them one question at a time.",
              },
              {
                title: "Cited answers",
                desc: "Every factual claim links to the exact page in the official manual.",
              },
              {
                title: "My Garage",
                desc: "Track owned products, maintenance schedules, and upcoming service tasks.",
              },
            ].map((f) => (
              <div key={f.title} className="space-y-2">
                <div className="h-0.5 w-8 rounded-full bg-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            <span className="text-mantis font-medium">Mantis</span> · MOSS Hack &apos;26
          </span>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/products" className="hover:text-foreground transition-colors">
              Products
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
