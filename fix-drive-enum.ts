import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Add GOOGLE_DRIVE to Postgres enum if it does not exist
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'GOOGLE_DRIVE'
        AND enumtypid = '"SourceType"'::regtype
      ) THEN
        ALTER TYPE "SourceType" ADD VALUE 'GOOGLE_DRIVE';
      END IF;
    END
    $$;
  `);

  // Convert old source rows if any still have GDRIVE
  await prisma.$executeRawUnsafe(`
    UPDATE "Source"
    SET "type" = 'GOOGLE_DRIVE'
    WHERE "type"::text = 'GDRIVE';
  `);

  // Convert old connected account provider if any
  await prisma.$executeRawUnsafe(`
    UPDATE "ConnectedAccount"
    SET "provider" = 'GOOGLE_DRIVE'
    WHERE "provider" = 'GDRIVE';
  `);

  console.log("GOOGLE_DRIVE enum fixed successfully.");
}

main()
  .catch((error) => {
    console.error("Fix failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });