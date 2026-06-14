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

const TYPE_META: Record<
  string,
  { icon: React.ReactNode; label: string; iconBg: string; iconColor: string }
> = {
  pdf: {
    icon: <FileText className="h-3.5 w-3.5" />,
    label: "PDF",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-400",
  },
  doc: {
    icon: <FileIcon className="h-3.5 w-3.5" />,
    label: "Document",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  image: {
    icon: <ImageIcon className="h-3.5 w-3.5" />,
    label: "Image",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
  },
  video: {
    icon: <Video className="h-3.5 w-3.5" />,
    label: "Video",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-400",
  },
  link: {
    icon: <Link2 className="h-3.5 w-3.5" />,
    label: "Link",
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-400",
  },
};

function DocRow({ doc }: { doc: Document }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[doc.type] ?? TYPE_META.link;
  const ytId =
    doc.type === "video" || doc.type === "link" ? getYouTubeId(doc.url) : null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-border/80">
      <div className="flex items-center gap-3 p-3">
        <span
          className={`rounded-md p-2 shrink-0 ${meta.iconBg} ${meta.iconColor}`}
        >
          {meta.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{doc.title}</p>
          <span className="text-[11px] text-muted-foreground">{meta.label}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {ytId ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Play className="h-3 w-3" />
              {expanded ? "Hide" : "Watch"}
            </button>
          ) : doc.type === "image" ? (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Download className="h-3 w-3" />
              Download
            </a>
          ) : (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Open
            </a>
          )}
        </div>
      </div>

      {/* Embedded YouTube */}
      {expanded && ytId && (
        <div className="border-t border-border">
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
        <div className="border-t border-border p-3">
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <FileText className="mb-4 h-8 w-8 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">No resources uploaded yet.</p>
      </div>
    );
  }

  const byType = TYPE_ORDER.reduce<Record<string, Document[]>>((acc, t) => {
    const docs = documents.filter((d) => d.type === t);
    if (docs.length) acc[t] = docs;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(byType).map(([type, docs]) => {
        const meta = TYPE_META[type];
        return (
          <div key={type}>
            <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className={`rounded-md p-1 ${meta.iconBg} ${meta.iconColor}`}>
                {meta.icon}
              </span>
              {meta.label}s
              <span className="font-mono text-muted-foreground/50">({docs.length})</span>
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
