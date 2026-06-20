"use client";

import { useState } from "react";

export function FixAllButton({ onFix }: { onFix: () => void }) {
  const [state, setState] = useState<"idle" | "fixing" | "done">("idle");

  if (state === "done") return <span className="pill pill-green">Fixed ✓</span>;

  return (
    <button
      className="btn btn-primary"
      disabled={state === "fixing"}
      onClick={async () => {
        setState("fixing");
        await onFix();
        setState("done");
      }}
    >
      {state === "fixing" ? "Fixing..." : "Fix all integration issues"}
    </button>
  );
}
