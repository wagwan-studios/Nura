-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('SLACK', 'EMAIL', 'NOTION', 'JIRA', 'GDOCS', 'MANUAL');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'SYNCING', 'ERROR');

-- CreateEnum
CREATE TYPE "KnowledgeType" AS ENUM ('PROCESS', 'DECISION', 'EXCEPTION', 'POLICY');

-- CreateEnum
CREATE TYPE "KnowledgeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SourceStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "config" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "KnowledgeType" NOT NULL DEFAULT 'PROCESS',
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'PUBLISHED',
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceId" TEXT,
    "authorId" TEXT,

    CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "author" TEXT,
    "url" TEXT,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "knowledgeEntryId" TEXT NOT NULL,
    "sourceId" TEXT,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentQueryLog" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "resultIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "AgentQueryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_organizationId_idx" ON "KnowledgeEntry"("organizationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_knowledgeEntryId_fkey" FOREIGN KEY ("knowledgeEntryId") REFERENCES "KnowledgeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentQueryLog" ADD CONSTRAINT "AgentQueryLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
