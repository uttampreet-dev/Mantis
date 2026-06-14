import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Car,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Bot,
  CalendarDays,
  Wrench,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/site-nav";
import { markTaskComplete } from "./actions";

type TaskStatus = "overdue" | "due-soon" | "upcoming" | "no-schedule";

function getStatus(dueAt: string | null): TaskStatus {
  if (!dueAt) return "no-schedule";
  const due = new Date(dueAt);
  const now = new Date();
  if (due < now) return "overdue";
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (due <= thirtyDays) return "due-soon";
  return "upcoming";
}

function formatDueDate(dueAt: string | null): string {
  if (!dueAt) return "Not scheduled";
  return new Date(dueAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; icon: React.ReactNode; className: string; rowBg: string }
> = {
  overdue: {
    label: "Overdue",
    icon: <AlertTriangle className="h-3 w-3" />,
    className: "border-red-500/20 bg-red-500/10 text-red-400",
    rowBg: "border-red-500/10 bg-red-500/5",
  },
  "due-soon": {
    label: "Due soon",
    icon: <Clock className="h-3 w-3" />,
    className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
    rowBg: "border-yellow-500/10 bg-yellow-500/5",
  },
  upcoming: {
    label: "Upcoming",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "border-primary/20 bg-primary/10 text-primary",
    rowBg: "border-border",
  },
  "no-schedule": {
    label: "Not scheduled",
    icon: <CalendarDays className="h-3 w-3" />,
    className: "border-border bg-muted text-muted-foreground",
    rowBg: "border-border",
  },
};

export default async function GaragePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "company") redirect("/dashboard");

  const { data: rawUserProducts } = await supabase
    .from("user_products")
    .select(
      `id, purchased_at, created_at,
       products (
         id, name, image_url, category,
         companies (name),
         maintenance_tasks (id, title, interval_months, description)
       ),
       user_maintenance_log (
         id, due_at, completed_at, task_id
       )`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userProducts = (rawUserProducts ?? []) as any[];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="container mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Car className="h-5 w-5 text-muted-foreground" />
              My Garage
            </h1>
            <p className="text-sm text-muted-foreground">
              Owned products and maintenance schedule
            </p>
          </div>
          <Link
            href="/products"
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Browse products
          </Link>
        </div>

        {userProducts.length === 0 ? (
          <EmptyGarage />
        ) : (
          <div className="space-y-6">
            {userProducts.map((up) => {
              const product = Array.isArray(up.products)
                ? up.products[0]
                : up.products;
              if (!product) return null;

              const company = Array.isArray(product.companies)
                ? product.companies[0]
                : product.companies;

              const tasks: {
                id: string;
                title: string;
                interval_months: number;
                description: string | null;
              }[] = product.maintenance_tasks ?? [];

              const activeLogs: Record<
                string,
                { id: string; due_at: string | null; completed_at: string | null }
              > = {};
              (up.user_maintenance_log ?? [])
                .filter(
                  (l: { completed_at: string | null }) => !l.completed_at
                )
                .forEach(
                  (l: {
                    task_id: string;
                    id: string;
                    due_at: string | null;
                    completed_at: string | null;
                  }) => {
                    activeLogs[l.task_id] = l;
                  }
                );

              return (
                <div
                  key={up.id}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  {/* Product header */}
                  <div className="flex items-center gap-4 p-5">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-14 w-14 rounded-lg object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0">
                        <Bot className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold truncate">
                          {product.name}
                        </h2>
                        <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground shrink-0">
                          {product.category}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {company?.name ?? ""}
                      </p>
                    </div>
                    <Link
                      href={`/products/${product.id}/chat`}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Ask assistant
                    </Link>
                  </div>

                  {/* Maintenance tasks */}
                  {tasks.length > 0 ? (
                    <div className="border-t border-border p-5 space-y-3">
                      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Wrench className="h-3 w-3" />
                        Maintenance schedule
                      </h3>
                      <div className="space-y-2">
                        {tasks.map((task) => {
                          const log = activeLogs[task.id] ?? null;
                          const status = getStatus(log?.due_at ?? null);
                          const cfg = STATUS_CONFIG[status];

                          return (
                            <div
                              key={task.id}
                              className={`flex items-center gap-3 rounded-lg border p-3 ${cfg.rowBg}`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {task.title}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    every {task.interval_months}mo
                                  </span>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex shrink-0 items-center gap-2">
                                <span
                                  className={`hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg.className}`}
                                >
                                  {cfg.icon}
                                  {log?.due_at
                                    ? formatDueDate(log.due_at)
                                    : cfg.label}
                                </span>

                                {log && (
                                  <form action={markTaskComplete}>
                                    <input
                                      type="hidden"
                                      name="log_id"
                                      value={log.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="user_product_id"
                                      value={up.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="task_id"
                                      value={task.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="interval_months"
                                      value={task.interval_months}
                                    />
                                    <button
                                      type="submit"
                                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                        status === "overdue"
                                          ? "bg-primary text-primary-foreground hover:opacity-90"
                                          : "border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                                      }`}
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      Done
                                    </button>
                                  </form>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-border px-5 py-4">
                      <p className="text-xs text-muted-foreground">
                        No maintenance tasks defined for this product.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyGarage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-5 rounded-full border border-dashed border-border p-8">
        <Car className="h-10 w-10 text-muted-foreground/20" />
      </div>
      <h2 className="text-base font-semibold">Your garage is empty</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs">
        Browse the marketplace and add products to track their maintenance
        schedules here.
      </p>
      <Link
        href="/products"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Browse products
      </Link>
    </div>
  );
}
