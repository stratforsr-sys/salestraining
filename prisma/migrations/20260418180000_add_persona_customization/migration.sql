-- Persona customization fields
ALTER TABLE "Persona" ADD COLUMN "userId" TEXT;
ALTER TABLE "Persona" ADD COLUMN "sharedWithTeam" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Persona" ADD COLUMN "isArchived" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Persona" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Persona" ADD COLUMN "mood" TEXT;
ALTER TABLE "Persona" ADD COLUMN "communicationStyle" TEXT;
ALTER TABLE "Persona" ADD COLUMN "behaviorInstructions" TEXT;
ALTER TABLE "Persona" ADD COLUMN "behaviorStructured" TEXT;
ALTER TABLE "Persona" ADD COLUMN "hiddenMotives" TEXT;
ALTER TABLE "Persona" ADD COLUMN "difficultyOverrides" TEXT;
ALTER TABLE "Persona" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- RoleplaySession snapshot for historical integrity
ALTER TABLE "RoleplaySession" ADD COLUMN "personaSnapshot" TEXT;

-- Scorecard hidden motives scoring
ALTER TABLE "Scorecard" ADD COLUMN "hiddenMotivesScore" INTEGER;
ALTER TABLE "Scorecard" ADD COLUMN "hiddenMotivesDetails" TEXT;
