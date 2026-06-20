import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteKnowledgeEntry, updateKnowledgeEntry, flagEntryForReview } from "@/lib/actions";
import KnowledgeForm from "@/components/KnowledgeForm";

export default async function KnowledgeEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const [entry, users] = await Promise.all([
    prisma.knowledgeEntry.findFirst({
      where: { id, organizationId: session!.user.organizationId },
      include: { citations: { include: { source: true } }, source: true, author: true, owner: true },
    }),
    prisma.user.findMany({
      where: { organizationId: session!.user.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!entry) notFound();

  const updateAction = updateKnowledgeEntry.bind(null, entry.id);
  const deleteAction = deleteKnowledgeEntry.bind(null, entry.id);
  const flagAction = flagEntryForReview.bind(null, entry.id);

  return (
    <div className="space-y-6">
      <div className="page-header-row">
        <div className="page-header">
          <Link href="/dashboard/knowledge" className="text-sm font-medium" style={{ color: "var(--orange)" }}>
            ← Knowledge Base
          </Link>
          <h1 style={{ marginTop: 4 }}>{entry.title}</h1>
          {entry.author && <p>Authored by {entry.author.name}</p>}
          <p>Owner: {entry.owner?.name ?? "Unassigned"}</p>
        </div>
        <div className="flex gap-3">
          <form action={deleteAction}>
            <button className="btn btn-secondary" style={{ color: "var(--red)", borderColor: "var(--red-bdr)" }}>
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card">
          <div className="card-body">
            <KnowledgeForm entry={entry} users={users} action={updateAction} />
          </div>
        </div>

        <div className="space-y-4">
          {entry.citations.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Citations</span>
              </div>
              <div className="card-body space-y-3">
                {entry.citations.map((c) => (
                  <div key={c.id} className="text-sm">
                    <p className="italic" style={{ color: "var(--text)" }}>&ldquo;{c.excerpt}&rdquo;</p>
                    <p className="mt-1" style={{ fontSize: 11, color: "var(--faint)" }}>
                      {c.author ? `— ${c.author}` : ""} {c.source ? `· ${c.source.name}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <span className="card-title">Flag for review</span>
            </div>
            <div className="card-body">
              <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
                Notify {entry.owner?.name ?? entry.author?.name ?? "the team"} that this entry may need attention.
              </p>
              <form action={flagAction} className="space-y-3">
                <input
                  name="note"
                  className="input"
                  placeholder="Optional note (e.g. this looks outdated)"
                />
                <button className="btn btn-secondary">Flag for review</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
