import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toggleOnboardingProgress } from "@/lib/actions";
import { KnowledgeType } from "@prisma/client";
import { TYPE_PILL } from "@/lib/ui";

const typeOrder: KnowledgeType[] = ["POLICY", "PROCESS", "EXCEPTION", "DECISION"];

const typeLabels: Record<string, string> = {
  POLICY: "Policies",
  PROCESS: "Processes",
  EXCEPTION: "Exceptions",
  DECISION: "Decisions",
};

export default async function OnboardingPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const userId = session!.user.id;

  const [entries, progress, org] = await Promise.all([
    prisma.knowledgeEntry.findMany({
      where: { organizationId, status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.onboardingProgress.findMany({ where: { userId } }),
    prisma.organization.findUnique({ where: { id: organizationId } }),
  ]);

  const completedIds = new Set(progress.map((p) => p.knowledgeEntryId));
  const total = entries.length;
  const completed = entries.filter((e) => completedIds.has(e.id)).length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  const grouped = typeOrder
    .map((type) => ({ type, items: entries.filter((e) => e.type === type) }))
    .filter((g) => g.items.length > 0);

  const suggestedQuestions = entries.slice(0, 4).map((e) => e.title);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Welcome to {org?.name ?? "the team"}</h1>
        <p>
          A guided tour of how we work. Read through each item below to get up to speed on our
          key processes, policies, decisions, and exceptions.
        </p>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Your progress</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {completed} of {total} read
            </p>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%`, background: "var(--orange)" }} />
          </div>
          {total > 0 && pct === 100 && (
            <p className="mt-3 text-sm font-medium" style={{ color: "var(--green)" }}>
              You&apos;re all caught up! Try asking Nura a question below.
            </p>
          )}
        </div>
      </div>

      {total === 0 ? (
        <div className="card">
          <div className="card-body text-center" style={{ color: "var(--muted)" }}>
            No published knowledge yet.{" "}
            <Link href="/dashboard/knowledge/new" style={{ color: "var(--orange)" }}>
              Add your first entry
            </Link>{" "}
            to start building an onboarding guide.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.type} className="card">
              <div className="card-header">
                <span className="card-title">{typeLabels[group.type]}</span>
              </div>
              <div className="card-body space-y-2">
                {group.items.map((entry) => {
                  const done = completedIds.has(entry.id);
                  return (
                    <div key={entry.id} className="flex items-start gap-3" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                      <form action={toggleOnboardingProgress} className="mt-0.5">
                        <input type="hidden" name="entryId" value={entry.id} />
                        <input type="hidden" name="completed" value={done ? "true" : "false"} />
                        <button
                          type="submit"
                          aria-label={done ? "Mark as unread" : "Mark as read"}
                          className="flex items-center justify-center text-xs"
                          style={{
                            width: 20, height: 20, borderRadius: 4,
                            border: `1.5px solid ${done ? "var(--orange)" : "var(--border-mid)"}`,
                            background: done ? "var(--orange)" : "var(--white)",
                            color: done ? "white" : "transparent",
                          }}
                        >
                          ✓
                        </button>
                      </form>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <Link
                            href={`/dashboard/knowledge/${entry.id}`}
                            className="text-sm font-medium"
                            style={{ color: done ? "var(--faint)" : "var(--text)" }}
                          >
                            {entry.title}
                          </Link>
                          <span className={`pill ${TYPE_PILL[entry.type] ?? "pill-muted"}`}>{entry.type}</span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: done ? "var(--faint)" : "var(--muted)" }}>
                          {entry.summary}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestedQuestions.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Try asking Nura</span>
          </div>
          <div className="card-body">
            <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
              Once you&apos;ve skimmed the basics, try Ask Nura with a real question:
            </p>
            <div className="space-y-2">
              {suggestedQuestions.map((q) => (
                <Link
                  key={q}
                  href={`/dashboard/search?q=${encodeURIComponent(q)}`}
                  className="block text-sm"
                  style={{ border: "1.5px solid var(--border)", borderRadius: "var(--r-md)", padding: "10px 14px" }}
                >
                  &ldquo;{q}&rdquo;
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
