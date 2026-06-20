import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ingestTranscript } from "@/lib/actions";
import { SourceIcon } from "@/components/SourceIcon";
import { TYPE_PILL, SOURCE_ICON_BG } from "@/lib/ui";

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const source = await prisma.source.findFirst({
    where: { id, organizationId: session!.user.organizationId },
    include: { entries: { orderBy: { createdAt: "desc" } } },
  });

  if (!source) notFound();

  const ingestAction = ingestTranscript.bind(null, source.id);
  const hasLLM = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <Link href="/dashboard/sources" className="text-sm font-medium" style={{ color: "var(--orange)" }}>
          ← Sources
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <div className="integration-logo" style={{ background: SOURCE_ICON_BG[source.type] ?? "var(--bg-warm)" }}>
            <SourceIcon type={source.type} className="h-6 w-6" />
          </div>
          <div>
            <h1 style={{ marginBottom: 0 }}>{source.name}</h1>
            <p style={{ marginTop: 0 }}>{source.type}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Ingest a transcript</span>
        </div>
        <div className="card-body">
          <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
            Paste a Slack thread, email chain, or doc excerpt from {source.name}. Nura will extract reusable
            processes, decisions, and exceptions as draft knowledge entries.
            {!hasLLM && (
              <span className="block mt-1" style={{ color: "var(--orange)" }}>
                ANTHROPIC_API_KEY not set — text will be saved as a single raw draft entry instead of being
                structured by AI.
              </span>
            )}
          </p>
          <form action={ingestAction} className="space-y-3">
            <textarea
              name="text"
              required
              rows={8}
              placeholder={`alice: hey how do we handle refund requests over $500?\nbob: anything over $500 needs a manager sign-off, ping #finance-approvals with the order id`}
              className="input mono"
            />
            <button className="btn btn-primary">Extract knowledge</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Entries from this source</span>
        </div>
        {source.entries.length === 0 ? (
          <div className="card-body text-center" style={{ color: "var(--muted)" }}>
            No entries yet.
          </div>
        ) : (
          <div className="card-body space-y-3">
            {source.entries.map((entry) => (
              <Link key={entry.id} href={`/dashboard/knowledge/${entry.id}`} className="k-entry">
                <div className="k-entry-header">
                  <span className="k-entry-title">{entry.title}</span>
                  <span className={`pill ${TYPE_PILL[entry.type] ?? "pill-muted"}`}>{entry.type}</span>
                  {entry.status === "DRAFT" && <span className="pill pill-muted">DRAFT</span>}
                </div>
                <p className="k-entry-text">{entry.summary}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
