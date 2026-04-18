import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN!;

const db = createClient({ url, authToken });

async function main() {
  const users = await db.execute("SELECT COUNT(*) as c FROM User");
  const personas = await db.execute("SELECT COUNT(*) as c FROM Persona");
  const modules = await db.execute("SELECT COUNT(*) as c FROM Module");
  const techs = await db.execute("SELECT COUNT(*) as c FROM Technique");
  console.log({
    users: users.rows[0].c,
    personas: personas.rows[0].c,
    modules: modules.rows[0].c,
    techniques: techs.rows[0].c,
  });
}

main().then(() => db.close()).catch((e) => { console.error(e); process.exit(1); });
