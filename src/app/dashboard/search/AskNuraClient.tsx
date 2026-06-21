"use client";

import { useEffect, useState } from "react";

type AskSource = {
  number: number;
  id: string;
  sourceId: string | null;
  rawRecordId: string | null;
  similarity: number;
  preview: string;
};

type AskResponse = {
  answer: string;
  sources: AskSource[];
};

export default function AskNuraClient({
  initialQuestion = "",
}: {
  initialQuestion?: string;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<AskSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function askNura(nextQuestion?: string) {
    const cleanQuestion = (nextQuestion ?? question).trim();

    if (!cleanQuestion) {
      setError("Please enter a question.");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);

    try {
      const res = await fetch("/api/ask-nura", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: cleanQuestion,
        }),
      });

      const text = await res.text();

      let data: AskResponse | { error?: string; message?: string };

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || "Invalid response from server.");
      }

      if (!res.ok) {
        throw new Error(
          "message" in data && data.message
            ? data.message
            : "error" in data && data.error
              ? data.error
              : "Ask Nura failed."
        );
      }

      const askData = data as AskResponse;

      setAnswer(askData.answer || "No answer returned.");
      setSources(askData.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askNura();
    }
  }

  useEffect(() => {
    if (initialQuestion.trim()) {
      askNura(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          Ask Nura
        </h1>
        <p style={{ color: "var(--muted-foreground, #666)" }}>
          Ask questions from your connected company knowledge.
        </p>
      </div>

      <div
        style={{
          border: "1px solid var(--border, #e5e7eb)",
          borderRadius: 16,
          padding: 16,
          background: "var(--card, #fff)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
        }}
      >
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Example: What can Slack read? Can GitHub read pull requests?"
          rows={4}
          style={{
            width: "100%",
            resize: "vertical",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 12,
            padding: 14,
            fontSize: 15,
            outline: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 12,
          }}
        >
          <button
            onClick={() => askNura()}
            disabled={loading}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "10px 18px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              background: "#111827",
              color: "#fff",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Thinking..." : "Ask Nura"}
          </button>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 12,
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      ) : null}

      {answer ? (
        <div
          style={{
            marginTop: 24,
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 16,
            padding: 20,
            background: "var(--card, #fff)",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
            Answer
          </h2>

          <div
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
              color: "var(--foreground, #111827)",
            }}
          >
            {answer}
          </div>
        </div>
      ) : null}

      {sources.length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
            Sources
          </h2>

          <div style={{ display: "grid", gap: 12 }}>
            {sources.map((source) => (
              <div
                key={source.id}
                style={{
                  border: "1px solid var(--border, #e5e7eb)",
                  borderRadius: 12,
                  padding: 14,
                  background: "var(--card, #fff)",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <span>Source {source.number}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    Score: {Number(source.similarity).toFixed(4)}
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "#4b5563",
                    lineHeight: 1.6,
                    fontSize: 14,
                  }}
                >
                  {source.preview}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}