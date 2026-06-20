import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import KnowledgeForm from "@/components/KnowledgeForm";
import { createKnowledgeEntry } from "@/lib/actions";

export default async function NewKnowledgeEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string }>;
}) {
  const session = await auth();
  const { title } = await searchParams;
  const users = await prisma.user.findMany({
    where: { organizationId: session!.user.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>New knowledge entry</h1>
        <p>Document a process, decision, exception, or policy so it&apos;s searchable and agent-ready.</p>
      </div>
      <div className="card" style={{ maxWidth: 720 }}>
        <div className="card-body">
          <KnowledgeForm action={createKnowledgeEntry} users={users} initialTitle={title} />
        </div>
      </div>
    </div>
  );
}
