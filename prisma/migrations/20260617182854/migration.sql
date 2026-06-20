/*
  Warnings:

  - A unique constraint covering the columns `[subdomain]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('TRIAL', 'STARTER', 'GROWTH', 'SCALE');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'AT_RISK', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'WARNING', 'INFO');

-- AlterTable
ALTER TABLE "KnowledgeEntry" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "entriesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "healthScore" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "membersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mrr" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onboardingStage" TEXT,
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "queriesPerDay" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stageEnteredAt" TIMESTAMP(3),
ADD COLUMN     "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "subdomain" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAlert" (
    "id" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actionLabel" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,
    "relatedEntryId" TEXT,
    "assignedToId" TEXT,

    CONSTRAINT "PlatformAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'all',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiJob" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "source" TEXT,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "autoAccepted" BOOLEAN,
    "tokensUsed" INTEGER,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "AiJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "planFrom" TEXT,
    "planTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryLog" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "QueryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpersonationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "ImpersonationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_name_key" ON "FeatureFlag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ImpersonationToken_token_key" ON "ImpersonationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_subdomain_key" ON "Organization"("subdomain");

-- AddForeignKey
ALTER TABLE "PlatformAlert" ADD CONSTRAINT "PlatformAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAlert" ADD CONSTRAINT "PlatformAlert_relatedEntryId_fkey" FOREIGN KEY ("relatedEntryId") REFERENCES "KnowledgeEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAlert" ADD CONSTRAINT "PlatformAlert_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryLog" ADD CONSTRAINT "QueryLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationToken" ADD CONSTRAINT "ImpersonationToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
