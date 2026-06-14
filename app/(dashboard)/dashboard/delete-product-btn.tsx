"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteProduct } from "./actions";

export function DeleteProductButton({ productId }: { productId: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await deleteProduct(formData);
    if (result?.error) {
      toast.error(result.error);
      setPending(false);
    } else {
      toast.success("Product deleted.");
      router.refresh();
    }
  }

  return (
    <form
      action={handleSubmit}
      onSubmit={(e) => {
        if (!confirm("Delete this product and all its documents?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="product_id" value={productId} />
      <Button variant="ghost" size="icon" type="submit" disabled={pending} title="Delete product">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </form>
  );
}
