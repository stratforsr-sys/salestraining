import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN!;
const db = createClient({ url, authToken });

async function main() {
  const tables = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log("Tables:", tables.rows.map((r) => r.name));

  const checkTables = [
    "User",
    "UserSettings",
    "Module",
    "Technique",
    "IfThenPattern",
    "SkillProgress",
    "RepetitionCard",
    "Persona",
    "PracticeSession",
    "ExerciseAttempt",
    "RoleplaySession",
    "Scorecard",
    "TimestampedFeedback",
    "RealMeetingAnalysis",
    "MeetingFeedbackItem",
    "GeneratedExercise",
    "ReflectionEntry",
    "Achievement",
    "DailyStreak",
  ];

  for (const t of checkTables) {
    try {
      const info = await db.execute(`PRAGMA table_info(${t})`);
      if (info.rows.length === 0) {
        console.log(`  [MISSING] ${t}`);
      } else {
        const cols = info.rows.map((r) => r.name).join(", ");
        console.log(`  [ok] ${t}: ${cols}`);
      }
    } catch (e: unknown) {
      console.log(`  [ERR] ${t}: ${(e as Error).message}`);
    }
  }
}

main().then(() => db.close()).catch((e) => { console.error(e); process.exit(1); });
