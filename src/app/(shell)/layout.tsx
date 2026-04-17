export const dynamic = "force-dynamic";

import { TopNav } from "@/components/nav/top-nav";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, userName } = await getSession();

  const xpAgg = await prisma.dailyStreak.aggregate({
    where: { userId },
    _sum: { xpEarned: true },
  });
  const totalXp = xpAgg._sum.xpEarned ?? 0;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--bg-root)" }}>
      <TopNav userName={userName} totalXp={totalXp} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
