export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getDueRepetitions, getWeakestTechniques } from "@/lib/knowledge-base";
import { getDashboardStats, getStreakStatus } from "@/actions/gamification";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getSession } from "@/lib/session";

export default async function DashboardPage() {
  const { userId } = await getSession();

  const [stats, dueReps, weakTechniques, modules, streakStatus] = await Promise.all([
    getDashboardStats(userId),
    getDueRepetitions(userId),
    getWeakestTechniques(userId, 5),
    prisma.module.findMany({
      where: { userId },
      include: {
        techniques: {
          include: { skillProgress: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    }),
    getStreakStatus(userId),
  ]);

  return (
    <DashboardClient
      stats={stats}
      dueReps={dueReps}
      weakTechniques={weakTechniques}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      modules={modules as any}
      streakStatus={streakStatus}
    />
  );
}
