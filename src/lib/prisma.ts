import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
