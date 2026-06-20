import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function GapsPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const logs = await prisma.queryLog.findMany({
    where: { organizationId, resultCount: 0 },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const groups = new Map<string, { question: string; count: number; lastAsked: Date }>();
  for (const log of logs) {
    const key = log.question.trim().toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (log.createdAt > existing.lastAsked) existing.lastAsked = log.createdAt;
    } else {
      groups.set(key, { question: log.question, count: 1, lastAsked: log.createdAt });
    }
  }

  const gaps = [...groups.values()].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Knowledge Gaps</h1>
        <p>Questions your team asked Nura that had no matching knowledge entry — close the gap by adding an answer.</p>
      </div>

      {gaps.length === 0 ? (
        <div className="card">
          <div className="card-body text-center" style={{ color: "var(--muted)" }}>
            No gaps yet. Every question asked so far has matched something in the knowledge base.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {gaps.map((gap) => (
            <div key={gap.question} className="k-entry" style={{ display: "block" }}>
              <div className="k-entry-header">
                <span className="k-entry-title">&ldquo;{gap.question}&rdquo;</span>
                <span className="pill pill-muted">
                  asked {gap.count} time{gap.count === 1 ? "" : "s"}
                </span>
              </div>
              <div className="k-entry-footer">
                <Link
                  href={`/dashboard/knowledge/new?title=${encodeURIComponent(gap.question)}`}
                  className="btn btn-secondary"
                >
                  + Add answer
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
