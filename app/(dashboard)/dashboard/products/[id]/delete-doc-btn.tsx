"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteDocument } from "./actions";

export function DeleteDocumentButton({
  documentId,
  productId,
}: {
  documentId: string;
  productId: string;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    if (!confirm("Remove this document?")) return;
    setPending(true);
    const result = await deleteDocument(formData);
    if (result?.error) {
      toast.error(result.error);
      setPending(false);
    } else {
      toast.success("Document removed.");
      router.refresh();
    }
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="document_id" value={documentId} />
      <input type="hidden" name="product_id" value={productId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={pending}
        title="Delete document"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </form>
  );
}
