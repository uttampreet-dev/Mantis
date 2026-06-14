"use client";

import { CheckCircle2, XCircle, Circle, Wrench, Package } from "lucide-react";
import type { Hypothesis } from "@/lib/types/assistant";

interface Props {
  hypotheses: Hypothesis[];
  stage: "investigating" | "testing" | "diagnosed";
  recommendedAction: string | null;
  spareParts: string[] | null;
}

const stageLabel = {
  investigating: { text: "Investigating", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  testing: { text: "Testing hypotheses", color: "bg-amber-500/10 text-amber-700 border-amber-200" },
  diagnosed: { text: "Diagnosed", color: "bg-green-500/10 text-green-700 border-green-200" },
};

function StatusIcon({ status }: { status: Hypothesis["status"] }) {
  if (status === "confirmed") return <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />;
  if (status === "eliminated") return <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  return <Circle className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
}

export function HypothesisBoard({ hypotheses, stage, recommendedAction, spareParts }: Props) {
  const sorted = [...hypotheses].sort((a, b) => {
    // Confirmed first, then by confidence, eliminated last
    if (a.status === "confirmed") return -1;
    if (b.status === "confirmed") return 1;
    if (a.status === "eliminated" && b.status !== "eliminated") return 1;
    if (b.status === "eliminated" && a.status !== "eliminated") return -1;
    return b.confidence - a.confidence;
  });

  const isEmpty = hypotheses.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Stage badge */}
      <div className="px-4 py-2.5 border-b shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Status
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${stageLabel[stage].color}`}
          >
            {stageLabel[stage].text}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Diagnosis card (when diagnosed) */}
        {stage === "diagnosed" && recommendedAction && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">
                Recommended Fix
              </span>
            </div>
            <p className="text-sm text-green-900 leading-relaxed">
              {recommendedAction}
            </p>
            {spareParts && spareParts.length > 0 && (
              <div className="pt-2 border-t border-green-200 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-green-700" />
                  <span className="text-xs font-medium text-green-800">
                    Spare parts
                  </span>
                </div>
                <ul className="space-y-1">
                  {spareParts.map((part, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-green-900">
                      <Wrench className="h-3 w-3 text-green-600 shrink-0" />
                      {part}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Hypothesis cards */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center pt-8 text-center">
            <div className="mb-3 rounded-full border-2 border-dashed border-muted-foreground/20 p-5">
              <Circle className="h-6 w-6 text-muted-foreground/25" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Hypotheses appear here
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70 max-w-[180px]">
              Describe your issue and the assistant will generate ranked root causes.
            </p>

            {/* Ghost placeholders */}
            <div className="mt-6 w-full space-y-2 opacity-20">
              {[72, 18, 10].map((pct, i) => (
                <div key={i} className="rounded-lg border bg-background p-3 text-left">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="h-2.5 w-24 rounded bg-muted-foreground/40" />
                    <div className="h-4 w-8 rounded bg-muted-foreground/30" />
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-muted-foreground/40" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          sorted.map((h) => (
            <HypothesisCard key={h.id} hypothesis={h} />
          ))
        )}
      </div>
    </div>
  );
}

function HypothesisCard({ hypothesis: h }: { hypothesis: Hypothesis }) {
  const isEliminated = h.status === "eliminated";
  const isConfirmed = h.status === "confirmed";

  const barColor = isConfirmed
    ? "bg-green-500"
    : isEliminated
    ? "bg-muted-foreground/30"
    : "bg-primary";

  const badgeColor = isConfirmed
    ? "bg-green-100 text-green-800 border-green-200"
    : isEliminated
    ? "bg-muted text-muted-foreground border-muted-foreground/20"
    : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <div
      className={`rounded-xl border bg-background p-3 space-y-2 transition-all duration-300 ${
        isConfirmed ? "border-green-200 shadow-sm shadow-green-100" : ""
      } ${isEliminated ? "opacity-50" : ""}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <StatusIcon status={h.status} />
          <span
            className={`text-xs font-medium leading-tight truncate ${
              isEliminated ? "line-through text-muted-foreground" : ""
            }`}
          >
            {h.label}
          </span>
        </div>
        <span
          className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full border font-mono font-medium ${badgeColor}`}
        >
          {h.confidence}%
        </span>
      </div>

      {/* Confidence bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-[width] duration-700 ease-out`}
          style={{ width: `${h.confidence}%` }}
        />
      </div>

      {/* Reasoning */}
      {h.reasoning && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {h.reasoning}
        </p>
      )}
    </div>
  );
}
