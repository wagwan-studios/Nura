"use client";

import { useState } from "react";

export function ResolveButton({ onResolve }: { onResolve: () => void }) {
  const [resolving, setResolving] = useState(false);

  return (
    <button
      className="btn btn-secondary"
      disabled={resolving}
      onClick={async () => {
        setResolving(true);
        await onResolve();
      }}
    >
      {resolving ? "Resolving..." : "Resolve"}
    </button>
  );
}
