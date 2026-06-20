import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { searchKnowledge } from "@/lib/search";
import { synthesizeAnswer } from "@/lib/anthropic";
import { SourceIcon } from "@/components/SourceIcon";
import { TYPE_PILL, SOURCE_ICON_BG } from "@/lib/ui";

const SUGGESTIONS = [
  "How do we onboard a new aggregation partner?",
  "What's required to promote a carrier to production?",
  "What consent do we need at point of participation?",
  "What's our PII retention policy?",
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  const query = q?.trim() ?? "";

  const results = query ? await searchKnowledge(session!.user.organizationId, query) : [];
  const answer = query ? await synthesizeAnswer(query, results) : null;

  if (query) {
    await prisma.queryLog.create({
      data: { organizationId: session!.user.organizationId, question: query, resultCount: results.length },
    });
  }

  if (!query) {
    return (
      <div className="flex flex-col items-center" style={{ paddingTop: "8vh" }}>
        <h1 className="serif" style={{ fontSize: 34, marginBottom: 8 }}>
          Ask Nura
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: 28, textAlign: "center" }}>
          Ask &ldquo;how do we handle X?&rdquo; and get answers sourced from HIQOR&apos;s knowledge base.
        </p>
        <form action="/dashboard/search" method="get" className="ask-input-wrap" style={{ marginBottom: 20 }}>
          <input
            name="q"
            autoFocus
            placeholder="How do we handle refund requests over $500?"
            className="ask-input"
          />
          <button className="ask-send-btn" aria-label="Ask">↑</button>
        </form>
        <div className="suggest-chips" style={{ justifyContent: "center", maxWidth: 640 }}>
          {SUGGESTIONS.map((s) => (
            <Link key={s} href={`/dashboard/search?q=${encodeURIComponent(s)}`} className="suggest-chip">
              {s}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ maxWidth: 760 }}>
      <form action="/dashboard/search" method="get" className="ask-input-wrap">
        <input name="q" defaultValue={query} className="ask-input" />
        <button className="ask-send-btn" aria-label="Ask">↑</button>
      </form>

      <div className="flex gap-3">
        <div className="msg-nura-avatar">N</div>
        <div className="flex-1 space-y-3">
          {answer && (
            <div className="msg-nura-answer">
              <div className="msg-nura-text">{answer}</div>
              {results.length > 0 && (
                <div className="msg-sources">
                  {results.map((entry) =>
                    entry.source ? (
                      <span
                        key={entry.id}
                        className="source-chip"
                        style={{ background: SOURCE_ICON_BG[entry.source.type] ?? "var(--bg-warm)" }}
                      >
                        <SourceIcon type={entry.source.type} className="source-chip-icon" />
                        {entry.source.name}
                      </span>
                    ) : null
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-semibold">
              {results.length} matching entr{results.length === 1 ? "y" : "ies"}
            </h2>
            {results.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                No matching knowledge found. Try different keywords, or{" "}
                <Link href="/dashboard/knowledge/new" style={{ color: "var(--orange)" }}>
                  add this knowledge
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-3">
                {results.map((entry) => (
                  <Link key={entry.id} href={`/dashboard/knowledge/${entry.id}`} className="k-entry">
                    <div className="k-entry-header">
                      <span className="k-entry-title">{entry.title}</span>
                      <span className={`pill ${TYPE_PILL[entry.type] ?? "pill-muted"}`}>{entry.type}</span>
                    </div>
                    <p className="k-entry-text">{entry.summary}</p>
                    {entry.source && (
                      <div className="k-entry-footer">
                        <span className="source-chip" style={{ background: SOURCE_ICON_BG[entry.source.type] ?? "var(--bg-warm)" }}>
                          <SourceIcon type={entry.source.type} className="source-chip-icon" />
                          {entry.source.name}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
