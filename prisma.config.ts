import { defineConfig } from "prisma/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    adapter: () =>
      new PrismaLibSql({
        url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
        authToken: process.env.TURSO_AUTH_TOKEN,
      }),
  },
});
