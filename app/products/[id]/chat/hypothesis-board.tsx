"use client";

import { CheckCircle2, XCircle, Circle, Wrench, Package } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import type { Hypothesis } from "@/lib/types/assistant";

interface Props {
  hypotheses: Hypothesis[];
  stage: "investigating" | "testing" | "diagnosed";
  recommendedAction: string | null;
  spareParts: string[] | null;
}

const stageConfig = {
  investigating: {
    text: "Investigating",
    className: "bg-primary/10 text-primary border border-primary/20",
  },
  testing: {
    text: "Testing",
    className: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  },
  diagnosed: {
    text: "Diagnosed",
    className: "bg-primary/10 text-primary border border-primary/20 glow-mantis-sm",
  },
};

function StatusIcon({ status }: { status: Hypothesis["status"] }) {
  if (status === "confirmed")
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />;
  if (status === "eliminated")
    return <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />;
  return <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
}

export function HypothesisBoard({
  hypotheses,
  stage,
  recommendedAction,
  spareParts,
}: Props) {
  const sorted = [...hypotheses].sort((a, b) => {
    if (a.status === "confirmed") return -1;
    if (b.status === "confirmed") return 1;
    if (a.status === "eliminated" && b.status !== "eliminated") return 1;
    if (b.status === "eliminated" && a.status !== "eliminated") return -1;
    return b.confidence - a.confidence;
  });

  const isEmpty = hypotheses.length === 0;
  const cfg = stageConfig[stage];

  return (
    <div className="flex flex-col h-full">
      {/* Stage badge row */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Status
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.className}`}>
          {cfg.text}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Diagnosis card */}
        <AnimatePresence>
          {stage === "diagnosed" && recommendedAction && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2.5 glow-mantis-sm"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs font-semibold text-primary">
                  Recommended Fix
                </span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {recommendedAction}
              </p>
              {spareParts && spareParts.length > 0 && (
                <div className="pt-2 border-t border-primary/20 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3 w-3 text-primary/70" />
                    <span className="text-[11px] font-medium text-primary/80">
                      Parts needed
                    </span>
                  </div>
                  {spareParts.map((part, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Wrench className="h-3 w-3 text-primary/40 shrink-0" />
                      {part}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hypothesis cards */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center pt-6 text-center">
            <div className="mb-3 rounded-full border-2 border-dashed border-border p-4">
              <Circle className="h-5 w-5 text-muted-foreground/25" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              Hypotheses appear here
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/60 max-w-[160px] leading-relaxed">
              Describe your issue and the assistant will rank root causes.
            </p>
            {/* Ghost placeholders */}
            <div className="mt-5 w-full space-y-2 opacity-20 pointer-events-none">
              {[72, 18, 10].map((pct, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-2.5 text-left">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="h-2 w-20 rounded bg-muted-foreground/40" />
                    <div className="h-3.5 w-7 rounded bg-muted-foreground/30 font-mono" />
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-muted-foreground/40"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <LayoutGroup>
            <AnimatePresence initial={false}>
              {sorted.map((h) => (
                <HypothesisCard key={h.id} hypothesis={h} />
              ))}
            </AnimatePresence>
          </LayoutGroup>
        )}
      </div>
    </div>
  );
}

function HypothesisCard({ hypothesis: h }: { hypothesis: Hypothesis }) {
  const isEliminated = h.status === "eliminated";
  const isConfirmed = h.status === "confirmed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isEliminated ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`rounded-lg border p-2.5 space-y-2 transition-shadow ${
        isConfirmed
          ? "border-primary/30 bg-primary/5 glow-mantis-sm"
          : "border-border bg-card"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <StatusIcon status={h.status} />
          <span
            className={`text-[12px] font-medium leading-tight ${
              isEliminated
                ? "line-through text-muted-foreground/50"
                : isConfirmed
                ? "text-primary"
                : "text-foreground"
            }`}
          >
            {h.label}
          </span>
        </div>
        <span
          className={`shrink-0 font-mono text-[11px] px-1.5 py-0.5 rounded border ${
            isConfirmed
              ? "border-primary/30 text-primary bg-primary/10"
              : isEliminated
              ? "border-border text-muted-foreground/40 bg-muted"
              : "border-border text-muted-foreground bg-muted"
          }`}
        >
          {h.confidence}%
        </span>
      </div>

      {/* Confidence bar */}
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            isConfirmed ? "bg-primary" : isEliminated ? "bg-muted-foreground/20" : "bg-muted-foreground/50"
          }`}
          initial={false}
          animate={{ width: `${h.confidence}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Reasoning */}
      {h.reasoning && (
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed line-clamp-2">
          {h.reasoning}
        </p>
      )}
    </motion.div>
  );
}
