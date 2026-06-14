"use client";

import { useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Link2,
  FileIcon,
  Download,
  ExternalLink,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Document {
  id: string;
  type: string;
  title: string;
  url: string;
  indexed: boolean;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
  );
  return match ? match[1] : null;
}

const TYPE_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pdf: {
    icon: <FileText className="h-4 w-4" />,
    label: "PDF",
    color: "text-red-500 bg-red-50",
  },
  doc: {
    icon: <FileIcon className="h-4 w-4" />,
    label: "Document",
    color: "text-blue-500 bg-blue-50",
  },
  image: {
    icon: <ImageIcon className="h-4 w-4" />,
    label: "Image",
    color: "text-green-600 bg-green-50",
  },
  video: {
    icon: <Video className="h-4 w-4" />,
    label: "Video",
    color: "text-purple-500 bg-purple-50",
  },
  link: {
    icon: <Link2 className="h-4 w-4" />,
    label: "Link",
    color: "text-orange-500 bg-orange-50",
  },
};

function DocRow({ doc }: { doc: Document }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[doc.type] ?? TYPE_META.link;
  const ytId = doc.type === "video" || doc.type === "link" ? getYouTubeId(doc.url) : null;

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <span className={`rounded-md p-1.5 ${meta.color}`}>{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{doc.title}</p>
          <Badge variant="outline" className="mt-0.5 text-xs">
            {meta.label}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {ytId ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
            >
              <Play className="h-3 w-3" />
              {expanded ? "Hide" : "Watch"}
            </button>
          ) : doc.type === "image" ? (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              View
            </a>
          ) : doc.type === "pdf" || doc.type === "doc" ? (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              <Download className="h-3 w-3" />
              Download
            </a>
          ) : (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Open
            </a>
          )}
        </div>
      </div>

      {/* Embedded YouTube */}
      {expanded && ytId && (
        <div className="border-t">
          <div className="relative aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${ytId}`}
              title={doc.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      )}

      {/* Inline image preview */}
      {doc.type === "image" && (
        <div className="border-t p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={doc.url}
            alt={doc.title}
            className="max-h-48 w-full rounded-md object-contain"
          />
        </div>
      )}
    </div>
  );
}

const TYPE_ORDER = ["pdf", "doc", "video", "image", "link"];

export function ResourcesTab({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <FileText className="mb-4 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          No resources uploaded yet.
        </p>
      </div>
    );
  }

  const byType = TYPE_ORDER.reduce<Record<string, Document[]>>((acc, t) => {
    const docs = documents.filter((d) => d.type === t);
    if (docs.length) acc[t] = docs;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(byType).map(([type, docs]) => {
        const meta = TYPE_META[type];
        return (
          <div key={type}>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className={`rounded-md p-1 ${meta.color}`}>{meta.icon}</span>
              {meta.label}s ({docs.length})
            </h3>
            <div className="space-y-2">
              {docs.map((doc) => (
                <DocRow key={doc.id} doc={doc} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
