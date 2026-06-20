import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { regenerateApiKey } from "@/lib/actions";

export default async function AgentApiPage() {
  const session = await auth();
  const organization = await prisma.organization.findUnique({
    where: { id: session!.user.organizationId },
  });

  const recentQueries = await prisma.agentQueryLog.findMany({
    where: { organizationId: session!.user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const curlExample = `curl -X POST ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/agent/query \\
  -H "Authorization: Bearer ${organization?.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "How do we handle refund requests over $500?"}'`;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Agent API</h1>
        <p>Let your AI agents query Nura before acting, so they follow HIQOR&apos;s real processes.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">API key</span>
        </div>
        <div className="card-body flex items-center gap-3">
          <code className="mono" style={{ background: "var(--bg-warm)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "8px 12px", fontSize: 13 }}>
            {organization?.apiKey}
          </code>
          <form action={regenerateApiKey}>
            <button className="btn btn-secondary">Regenerate</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Usage</span>
        </div>
        <div className="card-body">
          <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
            POST to <code className="mono" style={{ background: "var(--bg-warm)", padding: "1px 5px", borderRadius: 4 }}>/api/agent/query</code> with your API key to
            retrieve relevant knowledge entries and citations for a natural-language question.
          </p>
          <pre className="mono" style={{ overflowX: "auto", background: "var(--text)", color: "var(--bg)", borderRadius: "var(--r-md)", padding: 16, fontSize: 12 }}>{curlExample}</pre>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent agent queries</span>
        </div>
        {recentQueries.length === 0 ? (
          <div className="card-body text-center" style={{ color: "var(--muted)" }}>
            No agent queries yet.
          </div>
        ) : (
          <div className="card-body space-y-0">
            {recentQueries.map((log) => (
              <div key={log.id} className="text-sm" style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <p>{log.query}</p>
                <p style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>
                  {log.resultIds.length} result{log.resultIds.length === 1 ? "" : "s"} ·{" "}
                  {log.createdAt.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
