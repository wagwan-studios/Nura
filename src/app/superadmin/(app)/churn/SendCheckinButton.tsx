"use client";

import { useState } from "react";

export function SendCheckinButton({ onSend }: { onSend: () => Promise<string> }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [note, setNote] = useState("");

  if (state === "sent") {
    return <span className="pill pill-green">Sent ✓</span>;
  }

  return (
    <button
      className="btn btn-secondary"
      disabled={state === "sending"}
      title={note}
      onClick={async () => {
        setState("sending");
        const result = await onSend();
        setNote(result);
        setState("sent");
      }}
    >
      {state === "sending" ? "Sending..." : "Send check-in"}
    </button>
  );
}
