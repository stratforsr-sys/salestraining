import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  try {
    await db.execute("ALTER TABLE RealMeetingAnalysis ADD COLUMN bbbtuuiccCoverage TEXT");
    console.log("Added bbbtuuiccCoverage column");
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (/duplicate column/i.test(msg)) {
      console.log("Column already exists — skipping");
    } else {
      throw e;
    }
  }
}

main().then(() => db.close()).catch((e) => { console.error(e); process.exit(1); });
