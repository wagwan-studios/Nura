import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { approveKnowledgeEntry, rejectKnowledgeEntry } from "@/lib/actions";
import { SourceIcon } from "@/components/SourceIcon";
import { TYPE_PILL, SOURCE_ICON_BG } from "@/lib/ui";

export default async function KnowledgePage() {
  const session = await auth();
  const allEntries = await prisma.knowledgeEntry.findMany({
    where: { organizationId: session!.user.organizationId },
    orderBy: { updatedAt: "desc" },
    include: { source: true, owner: true },
  });

  const drafts = allEntries.filter((e) => e.status === "DRAFT");
  const entries = allEntries.filter((e) => e.status !== "DRAFT");

  return (
    <div className="space-y-6">
      <div className="page-header-row">
        <div className="page-header">
          <h1>Knowledge Base</h1>
          <p>Processes, decisions, exceptions, and policies captured from your tools.</p>
        </div>
        <Link href="/dashboard/knowledge/new" className="btn btn-primary">
          + New entry
        </Link>
      </div>

      {drafts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pending Review</span>
            <span className="pill pill-muted">{drafts.length}</span>
          </div>
          <div className="card-body space-y-3">
            {drafts.map((entry) => (
              <div key={entry.id} className="k-entry" style={{ display: "block" }}>
                <div className="k-entry-header">
                  <Link href={`/dashboard/knowledge/${entry.id}`} className="k-entry-title">
                    {entry.title}
                  </Link>
                  <span className={`pill ${TYPE_PILL[entry.type] ?? "pill-muted"}`}>{entry.type}</span>
                </div>
                <p className="k-entry-text">{entry.summary}</p>
                <div className="k-entry-footer">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="pill pill-muted">#{tag}</span>
                  ))}
                  {entry.source && (
                    <span className="source-chip" style={{ background: SOURCE_ICON_BG[entry.source.type] ?? "var(--bg-warm)" }}>
                      <SourceIcon type={entry.source.type} className="source-chip-icon" />
                      {entry.source.name}
                    </span>
                  )}
                </div>
                <div className="flex gap-3" style={{ marginTop: 10 }}>
                  <form action={approveKnowledgeEntry.bind(null, entry.id)}>
                    <button className="btn btn-primary">Approve</button>
                  </form>
                  <form action={rejectKnowledgeEntry.bind(null, entry.id)}>
                    <button className="btn btn-secondary" style={{ color: "var(--red)", borderColor: "var(--red-bdr)" }}>
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="card">
          <div className="card-body text-center" style={{ color: "var(--muted)" }}>
            No knowledge entries yet.{" "}
            <Link href="/dashboard/knowledge/new" style={{ color: "var(--orange)" }}>
              Create your first entry
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Link key={entry.id} href={`/dashboard/knowledge/${entry.id}`} className="k-entry">
              <div className="k-entry-header">
                <span className="k-entry-title">{entry.title}</span>
                <span className={`pill ${TYPE_PILL[entry.type] ?? "pill-muted"}`}>{entry.type}</span>
              </div>
              <p className="k-entry-text">{entry.summary}</p>
              <div className="k-entry-footer">
                {entry.tags.map((tag) => (
                  <span key={tag} className="pill pill-muted">#{tag}</span>
                ))}
                {entry.owner && <span className="pill pill-muted">Owner: {entry.owner.name}</span>}
                {entry.source && (
                  <span className="source-chip" style={{ background: SOURCE_ICON_BG[entry.source.type] ?? "var(--bg-warm)" }}>
                    <SourceIcon type={entry.source.type} className="source-chip-icon" />
                    {entry.source.name}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
