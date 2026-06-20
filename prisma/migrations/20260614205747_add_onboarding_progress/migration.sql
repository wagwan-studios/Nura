-- CreateTable
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "knowledgeEntryId" TEXT NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_userId_knowledgeEntryId_key" ON "OnboardingProgress"("userId", "knowledgeEntryId");

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_knowledgeEntryId_fkey" FOREIGN KEY ("knowledgeEntryId") REFERENCES "KnowledgeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
