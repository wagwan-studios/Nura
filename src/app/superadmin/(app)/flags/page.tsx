import { prisma } from "@/lib/prisma";
import { toggleFlag } from "./actions";
import { FlagToggle } from "./FlagToggle";

export default async function FeatureFlagsPage() {
  const flags = await prisma.featureFlag.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="screen">
      <div className="page-row">
        <div>
          <div className="page-title">Feature Flags</div>
          <div className="page-sub">{flags.filter((f) => f.enabled).length} of {flags.length} flags enabled</div>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: "4px 16px" }}>
          {flags.map((flag) => (
            <div className="flag-row" key={flag.id}>
              <div style={{ flex: 1 }}>
                <div className="flag-name">{flag.name}</div>
                <div className="flag-desc">{flag.description}</div>
              </div>
              <span className="flag-scope">{flag.scope}</span>
              <FlagToggle enabled={flag.enabled} onToggle={toggleFlag.bind(null, flag.id)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
