-- AlterEnum
ALTER TYPE "SourceType" RENAME TO "SourceType_old";
CREATE TYPE "SourceType" AS ENUM ('SLACK', 'NOTION', 'GMAIL', 'JIRA', 'LINEAR', 'GITHUB', 'CONFLUENCE', 'GOOGLE_DRIVE', 'ZOOM', 'HUBSPOT', 'MANUAL');
ALTER TABLE "Source" ALTER COLUMN "type" TYPE "SourceType" USING ("type"::text::"SourceType");
DROP TYPE "SourceType_old";
