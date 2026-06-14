import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ChatInterface } from "./chat-interface";

export default async function ProductChatPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, name, category, companies(name)")
    .eq("id", params.id)
    .single();

  if (!product) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companiesField = (product as any).companies;
  const company = Array.isArray(companiesField)
    ? companiesField[0]
    : companiesField;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/products/${params.id}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">{product.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {company?.name ?? ""} · AI Diagnostic Assistant
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 text-xs">
          <Sparkles className="h-3 w-3" />
          Powered by Gemini
        </Badge>
      </div>

      {/* Live chat interface */}
      <ChatInterface
        productId={params.id}
        productName={product.name}
        companyName={company?.name ?? ""}
      />
    </div>
  );
}
