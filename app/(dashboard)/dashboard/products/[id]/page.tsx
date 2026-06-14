import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Video,
  Link2,
  FileIcon,
  CheckCircle2,
  Clock,
  Trash2,
  Wrench,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UploadDocumentForm } from "./upload-form";
import { DeleteDocumentButton } from "./delete-doc-btn";
import { MaintenanceTaskForm } from "./maintenance-form";
import { deleteMaintenanceTask } from "./actions";

const DOC_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4 text-red-500" />,
  doc: <FileIcon className="h-4 w-4 text-blue-500" />,
  image: <ImageIcon className="h-4 w-4 text-green-500" />,
  video: <Video className="h-4 w-4 text-purple-500" />,
  link: <Link2 className="h-4 w-4 text-orange-500" />,
};

export default async function ProductDocumentsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch product with company info
  const { data: product } = await supabase
    .from("products")
    .select("id, name, category, description, image_url, company_id, companies(name, user_id)")
    .eq("id", params.id)
    .single();

  if (!product) notFound();

  // Verify ownership
  const company = Array.isArray(product.companies) ? product.companies[0] : product.companies;
  if (company?.user_id !== user.id) redirect("/dashboard");

  // Fetch documents
  const { data: documents } = await supabase
    .from("documents")
    .select("id, type, title, url, indexed, created_at")
    .eq("product_id", params.id)
    .order("created_at", { ascending: false });

  // Fetch maintenance tasks
  const { data: maintenanceTasks } = await supabase
    .from("maintenance_tasks")
    .select("id, title, interval_months, description")
    .eq("product_id", params.id);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back nav */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      {/* Product header */}
      <div className="flex gap-4 items-start">
        {product.image_url ? (
          <div className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden bg-muted">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{product.category}</Badge>
            <span className="text-sm text-muted-foreground">
              {company?.name}
            </span>
          </div>
          {product.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {product.description}
            </p>
          )}
        </div>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Document</CardTitle>
          </CardHeader>
          <CardContent>
            <UploadDocumentForm productId={params.id} />
          </CardContent>
        </Card>

        {/* Documents list */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm">
            Documents{" "}
            <span className="text-muted-foreground font-normal">
              ({documents?.length ?? 0})
            </span>
          </h2>

          {documents && documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <span className="shrink-0">
                    {DOC_ICONS[doc.type] ?? <FileIcon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground uppercase">
                        {doc.type}
                      </span>
                      {doc.indexed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Indexed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="h-3 w-3" />
                          Not indexed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Open
                    </a>
                    <DeleteDocumentButton
                      documentId={doc.id}
                      productId={params.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No documents yet. Add a PDF or link to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Maintenance Tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Add Maintenance Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MaintenanceTaskForm productId={params.id} />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold text-sm">
            Maintenance Tasks{" "}
            <span className="text-muted-foreground font-normal">
              ({maintenanceTasks?.length ?? 0})
            </span>
          </h2>

          {maintenanceTasks && maintenanceTasks.length > 0 ? (
            <div className="space-y-2">
              {maintenanceTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Every {task.interval_months}{" "}
                      {task.interval_months === 1 ? "month" : "months"}
                      {task.description ? ` · ${task.description}` : ""}
                    </p>
                  </div>
                  <form action={deleteMaintenanceTask}>
                    <input type="hidden" name="task_id" value={task.id} />
                    <input type="hidden" name="product_id" value={params.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No maintenance tasks yet. Add one to help users track upkeep.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
