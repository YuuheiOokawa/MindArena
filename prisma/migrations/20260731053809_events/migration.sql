-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "themeKey" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_milestones" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requiredScore" INTEGER NOT NULL,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "rewardPrizeCurrency" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "event_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_scores" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_milestone_claims" (
    "id" TEXT NOT NULL,
    "eventMilestoneId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_milestone_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_code_key" ON "events"("code");

-- CreateIndex
CREATE INDEX "events_startAt_endAt_idx" ON "events"("startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_milestones_eventId_code_key" ON "event_milestones"("eventId", "code");

-- CreateIndex
CREATE INDEX "event_scores_eventId_score_idx" ON "event_scores"("eventId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "event_scores_eventId_playerProfileId_key" ON "event_scores"("eventId", "playerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "event_milestone_claims_eventMilestoneId_playerProfileId_key" ON "event_milestone_claims"("eventMilestoneId", "playerProfileId");

-- AddForeignKey
ALTER TABLE "event_milestones" ADD CONSTRAINT "event_milestones_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_scores" ADD CONSTRAINT "event_scores_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_scores" ADD CONSTRAINT "event_scores_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_milestone_claims" ADD CONSTRAINT "event_milestone_claims_eventMilestoneId_fkey" FOREIGN KEY ("eventMilestoneId") REFERENCES "event_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_milestone_claims" ADD CONSTRAINT "event_milestone_claims_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
