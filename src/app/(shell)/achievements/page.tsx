export const dynamic = "force-dynamic";

import { getDashboardStats, getUserAchievements } from "@/actions/gamification";
import { ACHIEVEMENTS, isUnlockedByStats } from "@/lib/achievements";
import { getSession } from "@/lib/session";
import { AchievementsClient } from "@/components/achievements/achievements-client";

type UserAchievement = { name: string; unlockedAt: Date };

export default async function AchievementsPage() {
  const { userId } = await getSession();
  const [stats, user] = await Promise.all([
    getDashboardStats(userId),
    getUserAchievements(userId) as unknown as Promise<UserAchievement[]>,
  ]);

  const unlockedMap = new Map(user.map((a) => [a.name, a.unlockedAt.toISOString()]));

  const items = ACHIEVEMENTS.map((def) => {
    const unlockedAt = unlockedMap.get(def.name) ?? null;
    const { current, target } = def.progress(stats);
    const unlocked = unlockedAt !== null || isUnlockedByStats(def, stats);
    return {
      name: def.name,
      description: def.description,
      icon: def.icon,
      category: def.category,
      unlocked,
      unlockedAt,
      progress: { current, target },
    };
  });

  return <AchievementsClient items={items} totalUnlocked={items.filter((i) => i.unlocked).length} />;
}
