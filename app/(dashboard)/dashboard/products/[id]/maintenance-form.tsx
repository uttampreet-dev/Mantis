"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { addMaintenanceTask } from "./actions";

export function MaintenanceTaskForm({ productId }: { productId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await addMaintenanceTask(formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      toast.success("Maintenance task added.");
      setError(null);
      formRef.current?.reset();
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />

      <div className="space-y-1.5">
        <Label htmlFor="mt-title">Task title</Label>
        <Input
          id="mt-title"
          name="title"
          placeholder="e.g. Replace brake pads"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="mt-interval">Interval (months)</Label>
        <Input
          id="mt-interval"
          name="interval_months"
          type="number"
          min={1}
          max={120}
          placeholder="12"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="mt-desc">Description (optional)</Label>
        <Textarea
          id="mt-desc"
          name="description"
          placeholder="Steps or notes for this task…"
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="sm" disabled={loading} className="w-full">
        {loading ? "Adding…" : "Add task"}
      </Button>
    </form>
  );
}
