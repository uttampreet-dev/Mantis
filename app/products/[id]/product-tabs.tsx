"use client";

import { useState } from "react";
import { ResourcesTab } from "./resources-tab";

interface Document {
  id: string;
  type: string;
  title: string;
  url: string;
  indexed: boolean;
}

const TABS = ["Resources"] as const;

export function ProductTabs({
  documents,
}: {
  product: { id: string; name: string };
  documents: Document[];
}) {
  const [active, setActive] = useState<(typeof TABS)[number]>("Resources");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
            {tab === "Resources" && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                {documents.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {active === "Resources" && <ResourcesTab documents={documents} />}
    </div>
  );
}
