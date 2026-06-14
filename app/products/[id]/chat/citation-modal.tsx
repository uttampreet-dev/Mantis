"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";
import type { EnrichedCitation } from "@/lib/types/assistant";

interface Props {
  citation: EnrichedCitation | null;
  onClose: () => void;
}

export function CitationModal({ citation, onClose }: Props) {
  return (
    <Dialog open={!!citation} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{citation?.doc_title ?? "Source"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {citation?.page && citation.page > 0 ? (
            <p className="text-xs text-muted-foreground">Page {citation.page}</p>
          ) : null}

          <blockquote className="rounded-lg border-l-4 border-primary/40 bg-muted/50 px-4 py-3 text-sm italic text-muted-foreground">
            &ldquo;{citation?.snippet}&rdquo;
          </blockquote>

          {citation?.url ? (
            <Button asChild size="sm" variant="outline" className="gap-2 w-full">
              <a href={citation.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open source
                {citation.doc_type === "pdf" && citation.page
                  ? ` (page ${citation.page})`
                  : ""}
              </a>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
