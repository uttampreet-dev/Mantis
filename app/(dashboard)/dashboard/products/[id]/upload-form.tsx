"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addDocument } from "./actions";

export function UploadDocumentForm({ productId }: { productId: string }) {
  const [mode, setMode] = useState<"file" | "link">("file");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");
    const result = await addDocument(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    } else {
      toast.success("Document added and queued for indexing.");
      router.refresh();
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="mode" value={mode} />

      {/* Mode toggle */}
      <div className="flex rounded-md border overflow-hidden">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
            mode === "file"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-accent"
          }`}
        >
          <UploadCloud className="h-4 w-4" />
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setMode("link")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
            mode === "link"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-accent"
          }`}
        >
          <Link2 className="h-4 w-4" />
          External Link
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder={mode === "file" ? "e.g. Service Manual" : "e.g. YouTube Tutorial"}
          required
        />
      </div>

      {mode === "file" ? (
        <div className="space-y-2">
          <Label htmlFor="file">File</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.avi,.mov"
            required
          />
          <p className="text-xs text-muted-foreground">
            Accepted: PDF, DOC, images, videos
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            name="url"
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            required
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Uploading…" : "Add Document"}
      </Button>
    </form>
  );
}
