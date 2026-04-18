import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const statements = [
  `ALTER TABLE "Persona" ADD COLUMN "userId" TEXT`,
  `ALTER TABLE "Persona" ADD COLUMN "sharedWithTeam" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "Persona" ADD COLUMN "isArchived" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "Persona" ADD COLUMN "archivedAt" DATETIME`,
  `ALTER TABLE "Persona" ADD COLUMN "mood" TEXT`,
  `ALTER TABLE "Persona" ADD COLUMN "communicationStyle" TEXT`,
  `ALTER TABLE "Persona" ADD COLUMN "behaviorInstructions" TEXT`,
  `ALTER TABLE "Persona" ADD COLUMN "behaviorStructured" TEXT`,
  `ALTER TABLE "Persona" ADD COLUMN "hiddenMotives" TEXT`,
  `ALTER TABLE "Persona" ADD COLUMN "difficultyOverrides" TEXT`,
  `ALTER TABLE "Persona" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE "RoleplaySession" ADD COLUMN "personaSnapshot" TEXT`,
  `ALTER TABLE "Scorecard" ADD COLUMN "hiddenMotivesScore" INTEGER`,
  `ALTER TABLE "Scorecard" ADD COLUMN "hiddenMotivesDetails" TEXT`,
];

async function main() {
  for (const sql of statements) {
    try {
      await db.execute(sql);
      console.log(`✓ ${sql.slice(0, 80)}...`);
    } catch (e: unknown) {
      const msg = (e as Error).message;
      if (/duplicate column/i.test(msg)) {
        console.log(`— already applied: ${sql.slice(0, 80)}...`);
      } else {
        console.error(`✗ ${sql}`);
        throw e;
      }
    }
  }
  console.log("\nPersona-customization migration complete.");
}

main()
  .then(() => db.close())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
