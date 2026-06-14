import { redirect } from "next/navigation";
import Link from "next/link";
import { Car, CheckCircle2, Clock, AlertTriangle, Bot, CalendarDays, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  if (!dueAt) return "No schedule";
  const due = new Date(dueAt);
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_STYLES: Record<TaskStatus, { badge: string; icon: React.ReactNode; label: string }> = {
  overdue: {
    badge: "border-red-200 bg-red-50 text-red-700",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    label: "Overdue",
  },
  "due-soon": {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    icon: <Clock className="h-3.5 w-3.5" />,
    label: "Due soon",
  },
  upcoming: {
    badge: "border-green-200 bg-green-50 text-green-700",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: "Upcoming",
  },
  "no-schedule": {
    badge: "border-muted-foreground/20 bg-muted text-muted-foreground",
    icon: <CalendarDays className="h-3.5 w-3.5" />,
    label: "Not scheduled",
  },
};

export default async function GaragePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "company") redirect("/dashboard");

  // Fetch user's products with maintenance info in one go
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
    <main className="container mx-auto max-w-4xl px-4 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Car className="h-6 w-6" />
            My Garage
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your products and maintenance schedule
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/products">Browse products</Link>
        </Button>
      </div>

      {userProducts.length === 0 ? (
        <EmptyGarage />
      ) : (
        <div className="space-y-8">
          {userProducts.map((up) => {
            const product = Array.isArray(up.products) ? up.products[0] : up.products;
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

            // Active (uncompleted) log entries keyed by task_id
            const activeLogs: Record<
              string,
              { id: string; due_at: string | null; completed_at: string | null }
            > = {};
            (up.user_maintenance_log ?? [])
              .filter((l: { completed_at: string | null }) => !l.completed_at)
              .forEach((l: { task_id: string; id: string; due_at: string | null; completed_at: string | null }) => {
                activeLogs[l.task_id] = l;
              });

            return (
              <div key={up.id} className="rounded-xl border bg-card overflow-hidden">
                {/* Product header */}
                <div className="flex items-center gap-4 p-5">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-14 w-14 rounded-lg object-cover border shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg border bg-muted flex items-center justify-center shrink-0">
                      <Bot className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold truncate">{product.name}</h2>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {product.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {company?.name ?? ""}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
                    <Link href={`/products/${product.id}/chat`}>
                      <Bot className="h-3.5 w-3.5" />
                      Ask assistant
                    </Link>
                  </Button>
                </div>

                {/* Maintenance tasks */}
                {tasks.length > 0 ? (
                  <>
                    <Separator />
                    <div className="p-5 space-y-3">
                      <h3 className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                        <Wrench className="h-3.5 w-3.5" />
                        Maintenance schedule
                      </h3>
                      <div className="space-y-2">
                        {tasks.map((task) => {
                          const log = activeLogs[task.id] ?? null;
                          const status = getStatus(log?.due_at ?? null);
                          const style = STATUS_STYLES[status];

                          return (
                            <div
                              key={task.id}
                              className={`flex items-center gap-3 rounded-lg border p-3 ${
                                status === "overdue" ? "border-red-100 bg-red-50/30" : ""
                              } ${status === "due-soon" ? "border-amber-100 bg-amber-50/20" : ""}`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium">{task.title}</span>
                                  <span className="text-xs text-muted-foreground">
                                    every {task.interval_months}{" "}
                                    {task.interval_months === 1 ? "month" : "months"}
                                  </span>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex shrink-0 items-center gap-2">
                                {/* Status badge */}
                                <span
                                  className={`hidden sm:flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${style.badge}`}
                                >
                                  {style.icon}
                                  {log?.due_at ? formatDueDate(log.due_at) : style.label}
                                </span>

                                {/* Mark complete — only if there's a log entry */}
                                {log && (
                                  <form action={markTaskComplete}>
                                    <input type="hidden" name="log_id" value={log.id} />
                                    <input type="hidden" name="user_product_id" value={up.id} />
                                    <input type="hidden" name="task_id" value={task.id} />
                                    <input
                                      type="hidden"
                                      name="interval_months"
                                      value={task.interval_months}
                                    />
                                    <Button
                                      type="submit"
                                      size="sm"
                                      variant={status === "overdue" ? "default" : "outline"}
                                      className="h-7 text-xs gap-1"
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      Done
                                    </Button>
                                  </form>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Separator />
                    <p className="p-5 text-sm text-muted-foreground">
                      No maintenance tasks defined for this product yet.
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function EmptyGarage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 rounded-full border-2 border-dashed border-muted-foreground/20 p-8">
        <Car className="h-10 w-10 text-muted-foreground/30" />
      </div>
      <h2 className="text-lg font-semibold">Your garage is empty</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs">
        Browse the marketplace and add products to track their maintenance schedules here.
      </p>
      <Button asChild className="mt-6">
        <Link href="/products">Browse products</Link>
      </Button>
    </div>
  );
}
