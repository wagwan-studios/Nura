
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function TeamPage() {
  const session = await auth();
  const users = await prisma.user.findMany({
    where: { organizationId: session!.user.organizationId },
    orderBy: { name: "asc" },
    include: { _count: { select: { ownedEntries: true } } },
  });

  const groups = new Map<string, typeof users>();
  for (const user of users) {
    const dept = user.department ?? "Unassigned";
    if (!groups.has(dept)) groups.set(dept, []);
    groups.get(dept)!.push(user);
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Team</h1>
        <p>Who owns what across your organization&apos;s institutional knowledge.</p>
      </div>

      <div className="grid-3">
        {[...groups.entries()].map(([dept, members]) => (
          <div key={dept} className="card">
            <div className="card-header">
              <span className="card-title">{dept}</span>
            </div>
            <div className="card-body space-y-3">
              {members.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{u.name ?? u.email}</div>
                    <div className="text-sm truncate" style={{ color: "var(--muted)" }}>
                      {u.title ?? u.role}
                    </div>
                  </div>
                  <span className="pill pill-muted" style={{ whiteSpace: "nowrap" }}>
                    {u._count.ownedEntries} owned
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
