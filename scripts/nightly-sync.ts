import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { syncAllAutoSyncSources } from "../src/lib/connectors/sync-source";

async function main() {
  const startedAt = Date.now();

  console.log("Nightly Nura source sync started", {
    startedAt: new Date().toISOString(),
  });

  const results = await syncAllAutoSyncSources({
    concurrency: Number(
      process.env.NIGHTLY_SYNC_CONCURRENCY ||
        process.env.SOURCE_SYNC_CONCURRENCY ||
        "2"
    ),
  });

  const ok = results.filter((result) => result.ok).length;
  const failed = results.filter(
    (result) => !result.ok && !(result as any).skipped
  ).length;
  const skipped = results.filter((result) => (result as any).skipped).length;

  console.log("Nightly Nura source sync completed", {
    durationMs: Date.now() - startedAt,
    total: results.length,
    ok,
    failed,
    skipped,
    results,
  });
}

main()
  .catch((error) => {
    console.error("Nightly Nura source sync failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });