-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "apiKey" TEXT;

UPDATE "Organization" SET "apiKey" = 'org_' || gen_random_uuid()::text WHERE "apiKey" IS NULL;

ALTER TABLE "Organization" ALTER COLUMN "apiKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_apiKey_key" ON "Organization"("apiKey");
