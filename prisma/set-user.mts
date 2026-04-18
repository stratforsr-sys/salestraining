import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const TARGET_NAME = "Zen";
const TARGET_PIN = "1432";

const db = createClient({ url, authToken });

async function main() {
  const byName = await db.execute({
    sql: "SELECT id, name FROM User WHERE name = ? LIMIT 1",
    args: [TARGET_NAME],
  });

  if (byName.rows.length > 0) {
    const id = byName.rows[0].id as string;
    await db.execute({
      sql: "UPDATE User SET pin = ? WHERE id = ?",
      args: [TARGET_PIN, id],
    });
    console.log(`Updated existing user "${TARGET_NAME}" (id=${id}) → PIN ${TARGET_PIN}`);
    return;
  }

  const firstUser = await db.execute({
    sql: "SELECT id, name FROM User ORDER BY createdAt ASC LIMIT 1",
    args: [],
  });

  if (firstUser.rows.length > 0) {
    const id = firstUser.rows[0].id as string;
    const oldName = firstUser.rows[0].name as string;
    await db.execute({
      sql: "UPDATE User SET name = ?, pin = ? WHERE id = ?",
      args: [TARGET_NAME, TARGET_PIN, id],
    });
    console.log(`Renamed "${oldName}" (id=${id}) → "${TARGET_NAME}" with PIN ${TARGET_PIN}`);
    return;
  }

  const newId = randomUUID();
  await db.execute({
    sql: "INSERT INTO User (id, name, pin, createdAt) VALUES (?, ?, ?, datetime('now'))",
    args: [newId, TARGET_NAME, TARGET_PIN],
  });
  console.log(`Created user "${TARGET_NAME}" (id=${newId}) with PIN ${TARGET_PIN}`);
}

main()
  .then(() => db.close())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
