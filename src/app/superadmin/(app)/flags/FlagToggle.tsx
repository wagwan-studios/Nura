"use client";

import { useState } from "react";

export function FlagToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  const [on, setOn] = useState(enabled);
  const [pending, setPending] = useState(false);

  return (
    <button
      className={`toggle${on ? " on" : ""}`}
      disabled={pending}
      onClick={async () => {
        setOn((v) => !v);
        setPending(true);
        await onToggle();
        setPending(false);
      }}
      aria-label="Toggle feature flag"
    />
  );
}
