"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type AskSource = {
  number: number;
  id: string;
  sourceId: string | null;
  rawRecordId: string | null;
  similarity: number;
  preview: string;
  provider?: string | null;
  recordType?: string | null;
  title?: string | null;
  time?: string | null;
};

type PremiumAnswer = {
  status: string;
  confidence: string;
  answer: string;
  why: string;
  missingInfo: string;
  sourceCount: number;
  providers: string[];
  sources: AskSource[];
  intent?: string | null;
};

type AskResponse = {
  answer: string;
  sources: AskSource[];
  premium?: PremiumAnswer | null;
  cached?: boolean;
};

function getProviderStyles(provider?: string | null) {
  const key = String(provider || "").toUpperCase();

  if (key.includes("SLACK")) {
    return {
      background: "#f5edff",
      color: "#6d28d9",
      border: "#eadcff",
    };
  }

  if (key.includes("GITHUB")) {
    return {
      background: "#eef2ff",
      color: "#3730a3",
      border: "#dfe3ff",
    };
  }

  if (key.includes("GMAIL")) {
    return {
      background: "#fff1f2",
      color: "#be123c",
      border: "#ffe4e6",
    };
  }

  if (key.includes("NOTION")) {
    return {
      background: "#f5f5f4",
      color: "#292524",
      border: "#e7e5e4",
    };
  }

  return {
    background: "#f3f4f6",
    color: "#374151",
    border: "#e5e7eb",
  };
}

function formatProvider(provider?: string | null) {
  if (!provider) return "Source";

  return provider
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRecordType(recordType?: string | null) {
  if (!recordType) return null;

  return recordType
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getMatchLabel(score: number) {
  if (score >= 0.78) return "High match";
  if (score >= 0.55) return "Medium match";
  return "Related";
}

function SourceChip({ source }: { source: AskSource }) {
  const provider = formatProvider(source.provider);
  const styles = getProviderStyles(source.provider);

  const title =
    source.title ||
    formatRecordType(source.recordType) ||
    `Source ${source.number}`;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 999,
        border: `1px solid ${styles.border}`,
        background: "#ffffff",
        padding: "7px 11px",
        fontSize: 12,
        fontWeight: 700,
        color: "#374151",
        boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
        maxWidth: 270,
      }}
    >
      <span
        style={{
          borderRadius: 999,
          background: styles.background,
          color: styles.color,
          padding: "2px 7px",
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {provider}
      </span>

      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
    </span>
  );
}

function MarkdownAnswer({ content }: { content: string }) {
  return (
    <div
      style={{
        color: "#111827",
        fontSize: 15,
        lineHeight: 1.78,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1
              style={{
                fontSize: 22,
                lineHeight: 1.3,
                margin: "20px 0 10px",
                fontWeight: 900,
                letterSpacing: "-0.03em",
              }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              style={{
                fontSize: 17,
                lineHeight: 1.35,
                margin: "22px 0 10px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              style={{
                fontSize: 14,
                lineHeight: 1.4,
                margin: "18px 0 8px",
                fontWeight: 900,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                color: "#374151",
              }}
            >
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p
              style={{
                margin: "8px 0",
                color: "#1f2937",
              }}
            >
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul
              style={{
                margin: "8px 0 12px",
                paddingLeft: 20,
              }}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              style={{
                margin: "8px 0 12px",
                paddingLeft: 20,
              }}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li
              style={{
                margin: "5px 0",
                paddingLeft: 2,
                color: "#1f2937",
              }}
            >
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong style={{ fontWeight: 900, color: "#111827" }}>
              {children}
            </strong>
          ),
          code: ({ children }) => (
            <code
              style={{
                borderRadius: 7,
                background: "#f3f4f6",
                padding: "2px 6px",
                fontSize: 13,
                color: "#111827",
              }}
            >
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function PremiumAnswerCard({
  premium,
  answer,
  sources,
}: {
  premium: PremiumAnswer | null;
  answer: string;
  sources: AskSource[];
}) {
  const finalAnswer = premium?.answer || answer;

  const finalSources =
    premium?.sources && premium.sources.length > 0
      ? premium.sources
      : sources || [];

  const status = premium?.status || "ANSWER";
  const confidence = premium?.confidence || "Medium confidence";
  const isFound = status.toLowerCase().includes("found");
  const visibleSourceChips = finalSources.slice(0, 8);
  const hiddenSourceCount = Math.max(finalSources.length - visibleSourceChips.length, 0);

  return (
    <div
      style={{
        marginTop: 24,
        overflow: "hidden",
        borderRadius: 24,
        border: "1px solid #e5e1d8",
        background:
          "linear-gradient(180deg, rgba(250,249,246,1) 0%, rgba(244,242,237,1) 100%)",
        boxShadow:
          "0 24px 80px rgba(17, 24, 39, 0.10), 0 2px 8px rgba(17, 24, 39, 0.04)",
      }}
    >
      <div
        style={{
          padding: "18px 22px",
          borderBottom: "1px solid rgba(229, 225, 216, 0.9)",
          background: "rgba(255,255,255,0.68)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 999,
              border: isFound ? "1px solid #a7f3d0" : "1px solid #fde68a",
              background: isFound ? "#ecfdf5" : "#fffbeb",
              color: isFound ? "#047857" : "#92400e",
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span>{isFound ? "✓" : "!"}</span>
            {status}
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#374151",
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {confidence}
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#374151",
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {finalSources.length} source{finalSources.length === 1 ? "" : "s"} reviewed
          </span>
        </div>
      </div>

      <div style={{ padding: 22 }}>
        <section>
          <div
            style={{
              marginBottom: 10,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#78716c",
            }}
          >
            Answer
          </div>

          <MarkdownAnswer content={finalAnswer} />
        </section>

        {premium?.why ? (
          <section
            style={{
              marginTop: 22,
              borderRadius: 18,
              border: "1px solid #e5e7eb",
              background: "rgba(255,255,255,0.78)",
              padding: 16,
            }}
          >
            <div
              style={{
                marginBottom: 8,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#78716c",
              }}
            >
              Why Nura says this
            </div>

            <p
              style={{
                margin: 0,
                color: "#374151",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              {premium.why}
            </p>
          </section>
        ) : null}

        {finalSources.length > 0 ? (
          <section style={{ marginTop: 22 }}>
            <div
              style={{
                marginBottom: 12,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#78716c",
              }}
            >
              Sources
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {visibleSourceChips.map((source) => (
                <SourceChip
                  key={`${source.id}-${source.number}`}
                  source={source}
                />
              ))}

              {hiddenSourceCount > 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    padding: "7px 11px",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#6b7280",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                  }}
                >
                  +{hiddenSourceCount} more
                </span>
              ) : null}
            </div>
          </section>
        ) : null}

        {finalSources.length > 0 ? (
          <section style={{ marginTop: 22 }}>
            <div
              style={{
                marginBottom: 12,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#78716c",
              }}
            >
              Evidence preview
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {finalSources.slice(0, 3).map((source) => {
                const provider = formatProvider(source.provider);
                const recordType = formatRecordType(source.recordType);
                const styles = getProviderStyles(source.provider);

                return (
                  <div
                    key={`evidence-${source.id}-${source.number}`}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 18,
                      padding: 15,
                      background: "rgba(255,255,255,0.78)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 7,
                            fontSize: 12,
                            color: "#6b7280",
                            fontWeight: 700,
                          }}
                        >
                          <span
                            style={{
                              borderRadius: 999,
                              background: styles.background,
                              color: styles.color,
                              padding: "2px 7px",
                              fontSize: 11,
                              fontWeight: 900,
                            }}
                          >
                            {provider}
                          </span>

                          {recordType ? (
                            <>
                              <span>·</span>
                              <span>{recordType}</span>
                            </>
                          ) : null}

                          {source.time ? (
                            <>
                              <span>·</span>
                              <span>{source.time}</span>
                            </>
                          ) : null}
                        </div>

                        <h3
                          style={{
                            margin: "7px 0 0",
                            fontSize: 14,
                            fontWeight: 900,
                            color: "#111827",
                          }}
                        >
                          {source.title || `Source ${source.number}`}
                        </h3>
                      </div>

                      <span
                        style={{
                          flexShrink: 0,
                          borderRadius: 999,
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          padding: "5px 9px",
                          fontSize: 11,
                          color: "#6b7280",
                          fontWeight: 800,
                          height: "fit-content",
                        }}
                      >
                        {getMatchLabel(Number(source.similarity || 0))}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        color: "#4b5563",
                        fontSize: 14,
                        lineHeight: 1.65,
                      }}
                    >
                      {source.preview}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {premium?.missingInfo ? (
          <section
            style={{
              marginTop: 22,
              borderRadius: 18,
              border: "1px dashed #d6d3d1",
              background: "rgba(255,255,255,0.52)",
              padding: 16,
            }}
          >
            <div
              style={{
                marginBottom: 8,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#78716c",
              }}
            >
              Missing information
            </div>

            <p
              style={{
                margin: 0,
                color: "#57534e",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              {premium.missingInfo}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default function AskNuraClient({
  initialQuestion = "",
}: {
  initialQuestion?: string;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState("");
  const [premium, setPremium] = useState<PremiumAnswer | null>(null);
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
    setPremium(null);
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
      setPremium(askData.premium || null);
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

  const hasAutoAskedRef = useRef(false);

useEffect(() => {
  const question = initialQuestion.trim();

  if (!question || hasAutoAskedRef.current) return;

  hasAutoAskedRef.current = true;

  const timer = window.setTimeout(() => {
    void askNura(question);
  }, 0);

  return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initialQuestion]);

  // useEffect(() => {
  //   if (initialQuestion.trim()) {
  //     askNura(initialQuestion);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 900,
            marginBottom: 8,
            letterSpacing: "-0.045em",
            color: "#111827",
          }}
        >
          Ask Nura
        </h1>

        <p style={{ color: "#6b7280", fontSize: 15 }}>
          Ask questions from your connected company knowledge.
        </p>
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 22,
          padding: 16,
          background: "#ffffff",
          boxShadow: "0 16px 50px rgba(17,24,39,0.06)",
        }}
      >
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask across Slack, GitHub, Gmail, Notion, docs, and connected company knowledge..."
          rows={4}
          style={{
            width: "100%",
            resize: "vertical",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 15,
            fontSize: 15,
            lineHeight: 1.6,
            outline: "none",
            color: "#111827",
            background: "#fafafa",
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
              padding: "11px 20px",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
              background: "#111827",
              color: "#fff",
              opacity: loading ? 0.7 : 1,
              boxShadow: "0 10px 25px rgba(17,24,39,0.18)",
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
            borderRadius: 16,
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      ) : null}

      {answer ? (
        <PremiumAnswerCard
          premium={premium}
          answer={answer}
          sources={sources}
        />
      ) : null}
    </div>
  );
}
// "use client";

// import { useEffect, useState } from "react";

// type AskSource = {
//   number: number;
//   id: string;
//   sourceId: string | null;
//   rawRecordId: string | null;
//   similarity: number;
//   preview: string;
//   provider?: string | null;
//   recordType?: string | null;
//   title?: string | null;
//   time?: string | null;
// };

// type PremiumAnswer = {
//   status: string;
//   confidence: string;
//   answer: string;
//   why: string;
//   missingInfo: string;
//   sourceCount: number;
//   providers: string[];
//   sources: AskSource[];
//   intent?: string | null;
// };

// type AskResponse = {
//   answer: string;
//   sources: AskSource[];
//   premium?: PremiumAnswer | null;
//   cached?: boolean;
// };

// function SourceChip({ source }: { source: AskSource }) {
//   const provider = source.provider || "Source";
//   const title =
//     source.title ||
//     source.recordType?.replaceAll("_", " ") ||
//     `Source ${source.number}`;

//   return (
//     <span
//       style={{
//         display: "inline-flex",
//         alignItems: "center",
//         gap: 8,
//         borderRadius: 999,
//         border: "1px solid #e5e7eb",
//         background: "#ffffff",
//         padding: "7px 11px",
//         fontSize: 12,
//         fontWeight: 600,
//         color: "#374151",
//         boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
//         maxWidth: 260,
//       }}
//     >
//       <span style={{ color: "#111827", textTransform: "capitalize" }}>
//         {provider}
//       </span>
//       <span
//         style={{
//           width: 4,
//           height: 4,
//           borderRadius: 999,
//           background: "#d1d5db",
//           flexShrink: 0,
//         }}
//       />
//       <span
//         style={{
//           overflow: "hidden",
//           textOverflow: "ellipsis",
//           whiteSpace: "nowrap",
//           textTransform: "capitalize",
//         }}
//       >
//         {title}
//       </span>
//     </span>
//   );
// }

// function PremiumAnswerCard({
//   premium,
//   answer,
//   sources,
// }: {
//   premium: PremiumAnswer | null;
//   answer: string;
//   sources: AskSource[];
// }) {
//   const finalAnswer = premium?.answer || answer;
//   const finalSources =
//     premium?.sources && premium.sources.length > 0
//       ? premium.sources
//       : sources || [];

//   const status = premium?.status || "ANSWER";
//   const confidence = premium?.confidence || "Medium confidence";
//   const isFound = status.toLowerCase().includes("found");

//   return (
//     <div
//       style={{
//         marginTop: 24,
//         overflow: "hidden",
//         borderRadius: 24,
//         border: "1px solid #e5e1d8",
//         background:
//           "linear-gradient(180deg, rgba(250,249,246,1) 0%, rgba(244,242,237,1) 100%)",
//         boxShadow:
//           "0 24px 80px rgba(17, 24, 39, 0.10), 0 2px 8px rgba(17, 24, 39, 0.04)",
//       }}
//     >
//       <div
//         style={{
//           padding: "18px 22px",
//           borderBottom: "1px solid rgba(229, 225, 216, 0.9)",
//           background: "rgba(255,255,255,0.62)",
//           backdropFilter: "blur(12px)",
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             flexWrap: "wrap",
//             gap: 10,
//             alignItems: "center",
//           }}
//         >
//           <span
//             style={{
//               display: "inline-flex",
//               alignItems: "center",
//               gap: 8,
//               borderRadius: 999,
//               border: isFound ? "1px solid #a7f3d0" : "1px solid #fde68a",
//               background: isFound ? "#ecfdf5" : "#fffbeb",
//               color: isFound ? "#047857" : "#92400e",
//               padding: "7px 12px",
//               fontSize: 12,
//               fontWeight: 800,
//               letterSpacing: "0.08em",
//               textTransform: "uppercase",
//             }}
//           >
//             <span>{isFound ? "✓" : "!"}</span>
//             {status}
//           </span>

//           <span
//             style={{
//               display: "inline-flex",
//               alignItems: "center",
//               borderRadius: 999,
//               border: "1px solid #e5e7eb",
//               background: "#ffffff",
//               color: "#374151",
//               padding: "7px 12px",
//               fontSize: 12,
//               fontWeight: 700,
//             }}
//           >
//             {confidence}
//           </span>

//           <span
//             style={{
//               display: "inline-flex",
//               alignItems: "center",
//               borderRadius: 999,
//               border: "1px solid #e5e7eb",
//               background: "#ffffff",
//               color: "#374151",
//               padding: "7px 12px",
//               fontSize: 12,
//               fontWeight: 700,
//             }}
//           >
//             {finalSources.length} source{finalSources.length === 1 ? "" : "s"}
//           </span>
//         </div>
//       </div>

//       <div style={{ padding: 22 }}>
//         <section>
//           <div
//             style={{
//               marginBottom: 10,
//               fontSize: 11,
//               fontWeight: 800,
//               letterSpacing: "0.18em",
//               textTransform: "uppercase",
//               color: "#78716c",
//             }}
//           >
//             Answer
//           </div>

//           <div
//             style={{
//               color: "#111827",
//               fontSize: 16,
//               lineHeight: 1.8,
//               whiteSpace: "pre-wrap",
//             }}
//           >
//             {finalAnswer}
//           </div>
//         </section>

//         {premium?.why ? (
//           <section
//             style={{
//               marginTop: 22,
//               borderRadius: 18,
//               border: "1px solid #e5e7eb",
//               background: "rgba(255,255,255,0.72)",
//               padding: 16,
//             }}
//           >
//             <div
//               style={{
//                 marginBottom: 8,
//                 fontSize: 11,
//                 fontWeight: 800,
//                 letterSpacing: "0.18em",
//                 textTransform: "uppercase",
//                 color: "#78716c",
//               }}
//             >
//               Why Nura says this
//             </div>

//             <p
//               style={{
//                 margin: 0,
//                 color: "#374151",
//                 fontSize: 14,
//                 lineHeight: 1.7,
//               }}
//             >
//               {premium.why}
//             </p>
//           </section>
//         ) : null}

//         {finalSources.length > 0 ? (
//           <section style={{ marginTop: 22 }}>
//             <div
//               style={{
//                 marginBottom: 12,
//                 fontSize: 11,
//                 fontWeight: 800,
//                 letterSpacing: "0.18em",
//                 textTransform: "uppercase",
//                 color: "#78716c",
//               }}
//             >
//               Sources
//             </div>

//             <div
//               style={{
//                 display: "flex",
//                 flexWrap: "wrap",
//                 gap: 8,
//               }}
//             >
//               {finalSources.slice(0, 8).map((source) => (
//                 <SourceChip
//                   key={`${source.id}-${source.number}`}
//                   source={source}
//                 />
//               ))}
//             </div>
//           </section>
//         ) : null}

//         {finalSources.length > 0 ? (
//           <section style={{ marginTop: 22 }}>
//             <div
//               style={{
//                 marginBottom: 12,
//                 fontSize: 11,
//                 fontWeight: 800,
//                 letterSpacing: "0.18em",
//                 textTransform: "uppercase",
//                 color: "#78716c",
//               }}
//             >
//               Evidence preview
//             </div>

//             <div style={{ display: "grid", gap: 10 }}>
//               {finalSources.slice(0, 3).map((source) => (
//                 <div
//                   key={`evidence-${source.id}-${source.number}`}
//                   style={{
//                     border: "1px solid #e5e7eb",
//                     borderRadius: 18,
//                     padding: 15,
//                     background: "rgba(255,255,255,0.74)",
//                   }}
//                 >
//                   <div
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       gap: 12,
//                       marginBottom: 8,
//                     }}
//                   >
//                     <div>
//                       <div
//                         style={{
//                           display: "flex",
//                           flexWrap: "wrap",
//                           alignItems: "center",
//                           gap: 7,
//                           fontSize: 12,
//                           color: "#6b7280",
//                           fontWeight: 600,
//                         }}
//                       >
//                         <span
//                           style={{
//                             color: "#111827",
//                             textTransform: "capitalize",
//                           }}
//                         >
//                           {source.provider || "Source"}
//                         </span>

//                         {source.recordType ? (
//                           <>
//                             <span>·</span>
//                             <span style={{ textTransform: "capitalize" }}>
//                               {source.recordType.replaceAll("_", " ")}
//                             </span>
//                           </>
//                         ) : null}

//                         {source.time ? (
//                           <>
//                             <span>·</span>
//                             <span>{source.time}</span>
//                           </>
//                         ) : null}
//                       </div>

//                       <h3
//                         style={{
//                           margin: "5px 0 0",
//                           fontSize: 14,
//                           fontWeight: 800,
//                           color: "#111827",
//                         }}
//                       >
//                         {source.title || `Source ${source.number}`}
//                       </h3>
//                     </div>

//                     <span
//                       style={{
//                         flexShrink: 0,
//                         fontSize: 12,
//                         color: "#9ca3af",
//                         fontWeight: 600,
//                       }}
//                     >
//                       {Number(source.similarity).toFixed(3)}
//                     </span>
//                   </div>

//                   <p
//                     style={{
//                       margin: 0,
//                       color: "#4b5563",
//                       fontSize: 14,
//                       lineHeight: 1.65,
//                     }}
//                   >
//                     {source.preview}
//                   </p>
//                 </div>
//               ))}
//             </div>
//           </section>
//         ) : null}

//         {premium?.missingInfo ? (
//           <section
//             style={{
//               marginTop: 22,
//               borderRadius: 18,
//               border: "1px dashed #d6d3d1",
//               background: "rgba(255,255,255,0.48)",
//               padding: 16,
//             }}
//           >
//             <div
//               style={{
//                 marginBottom: 8,
//                 fontSize: 11,
//                 fontWeight: 800,
//                 letterSpacing: "0.18em",
//                 textTransform: "uppercase",
//                 color: "#78716c",
//               }}
//             >
//               Missing information
//             </div>

//             <p
//               style={{
//                 margin: 0,
//                 color: "#57534e",
//                 fontSize: 14,
//                 lineHeight: 1.7,
//               }}
//             >
//               {premium.missingInfo}
//             </p>
//           </section>
//         ) : null}
//       </div>
//     </div>
//   );
// }

// export default function AskNuraClient({
//   initialQuestion = "",
// }: {
//   initialQuestion?: string;
// }) {
//   const [question, setQuestion] = useState(initialQuestion);
//   const [answer, setAnswer] = useState("");
//   const [premium, setPremium] = useState<PremiumAnswer | null>(null);
//   const [sources, setSources] = useState<AskSource[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   async function askNura(nextQuestion?: string) {
//     const cleanQuestion = (nextQuestion ?? question).trim();

//     if (!cleanQuestion) {
//       setError("Please enter a question.");
//       return;
//     }

//     setLoading(true);
//     setError("");
//     setAnswer("");
//     setPremium(null);
//     setSources([]);

//     try {
//       const res = await fetch("/api/ask-nura", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           question: cleanQuestion,
//         }),
//       });

//       const text = await res.text();

//       let data: AskResponse | { error?: string; message?: string };

//       try {
//         data = JSON.parse(text);
//       } catch {
//         throw new Error(text || "Invalid response from server.");
//       }

//       if (!res.ok) {
//         throw new Error(
//           "message" in data && data.message
//             ? data.message
//             : "error" in data && data.error
//               ? data.error
//               : "Ask Nura failed."
//         );
//       }

//       const askData = data as AskResponse;

//       setAnswer(askData.answer || "No answer returned.");
//       setPremium(askData.premium || null);
//       setSources(askData.sources || []);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Something went wrong.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
//     if (event.key === "Enter" && !event.shiftKey) {
//       event.preventDefault();
//       askNura();
//     }
//   }

//   useEffect(() => {
//     if (initialQuestion.trim()) {
//       askNura(initialQuestion);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return (
//     <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px" }}>
//       <div style={{ marginBottom: 24 }}>
//         <h1
//           style={{
//             fontSize: 34,
//             fontWeight: 800,
//             marginBottom: 8,
//             letterSpacing: "-0.04em",
//             color: "#111827",
//           }}
//         >
//           Ask Nura
//         </h1>

//         <p style={{ color: "#6b7280", fontSize: 15 }}>
//           Ask questions from your connected company knowledge.
//         </p>
//       </div>

//       <div
//         style={{
//           border: "1px solid #e5e7eb",
//           borderRadius: 22,
//           padding: 16,
//           background: "#ffffff",
//           boxShadow: "0 16px 50px rgba(17,24,39,0.06)",
//         }}
//       >
//         <textarea
//           value={question}
//           onChange={(event) => setQuestion(event.target.value)}
//           onKeyDown={handleKeyDown}
//           placeholder="Ask across Slack, GitHub, Gmail, Notion, docs, and connected company knowledge..."
//           rows={4}
//           style={{
//             width: "100%",
//             resize: "vertical",
//             border: "1px solid #e5e7eb",
//             borderRadius: 16,
//             padding: 15,
//             fontSize: 15,
//             lineHeight: 1.6,
//             outline: "none",
//             color: "#111827",
//             background: "#fafafa",
//           }}
//         />

//         <div
//           style={{
//             display: "flex",
//             justifyContent: "flex-end",
//             marginTop: 12,
//           }}
//         >
//           <button
//             onClick={() => askNura()}
//             disabled={loading}
//             style={{
//               border: "none",
//               borderRadius: 999,
//               padding: "11px 20px",
//               fontWeight: 800,
//               cursor: loading ? "not-allowed" : "pointer",
//               background: "#111827",
//               color: "#fff",
//               opacity: loading ? 0.7 : 1,
//               boxShadow: "0 10px 25px rgba(17,24,39,0.18)",
//             }}
//           >
//             {loading ? "Thinking..." : "Ask Nura"}
//           </button>
//         </div>
//       </div>

//       {error ? (
//         <div
//           style={{
//             marginTop: 20,
//             padding: 14,
//             borderRadius: 16,
//             background: "#fef2f2",
//             color: "#991b1b",
//             border: "1px solid #fecaca",
//           }}
//         >
//           {error}
//         </div>
//       ) : null}

//       {answer ? (
//         <PremiumAnswerCard
//           premium={premium}
//           answer={answer}
//           sources={sources}
//         />
//       ) : null}
//     </div>
//   );
// }
