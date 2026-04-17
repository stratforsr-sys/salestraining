"use server";

import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS, isUnlockedByStats } from "@/lib/achievements";

// ============================================================
// GET DASHBOARD STATS
// ============================================================
export async function getDashboardStats(userId: string) {
  // Total XP
  const streaks = await prisma.dailyStreak.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streakData = streaks as any[];
  const totalXp = streakData.reduce((sum: number, s: any) => sum + s.xpEarned, 0);

  // Current streak
  const currentStreak = calculateCurrentStreak(streakData.map((s: any) => s.date));

  // Techniques by level
  const techniques = await prisma.technique.findMany({
    where: { module: { userId } },
    include: { skillProgress: true },
  });

  const levelCounts: Record<string, number> = {
    beginner: 0,
    advanced: 0,
    competent: 0,
    skilled: 0,
    expert: 0,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const t of techniques as any[]) {
    const level = t.skillProgress?.level || "beginner";
    levelCounts[level] = (levelCounts[level] || 0) + 1;
  }

  // Total practice sessions
  const sessionCount = await prisma.practiceSession.count({
    where: { userId },
  });

  // Total practice time (minutes)
  const sessions = await prisma.practiceSession.findMany({
    where: { userId },
    select: { duration: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionsData = sessions as any[];
  const totalMinutes = Math.round(
    sessionsData.reduce((sum: number, s: any) => sum + s.duration, 0) / 60
  );

  // Modules count
  const moduleCount = await prisma.module.count({ where: { userId } });

  // Meetings analyzed
  const meetingCount = await prisma.realMeetingAnalysis.count({
    where: { userId },
  });

  return {
    totalXp,
    currentStreak,
    longestStreak: calculateLongestStreak(streakData.map((s: any) => s.date)),
    levelCounts,
    totalTechniques: techniques.length,
    sessionCount,
    totalMinutes,
    moduleCount,
    meetingCount,
  };
}

// ============================================================
// GET STREAK STATUS — used by dashboard reminder banner
// ============================================================
export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  practicedToday: boolean;
  practicedYesterday: boolean;
  daysSinceLastPractice: number | null;
  preferredTime: string;
  minutesToday: number;
  dailyGoalMinutes: number;
  goalMet: boolean;
}

export async function getStreakStatus(userId: string): Promise<StreakStatus> {
  const streaks = await prisma.dailyStreak.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 90,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streakData = streaks as any[];
  const dates = streakData.map((s) => s.date as Date);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayMs = yesterday.getTime();

  const normalized = dates
    .map((d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x.getTime();
    })
    .sort((a, b) => b - a);

  const unique = [...new Set(normalized)];
  const practicedToday = unique.includes(todayMs);
  const practicedYesterday = unique.includes(yesterdayMs);

  const daysSinceLastPractice =
    unique.length > 0
      ? Math.round((todayMs - unique[0]) / (24 * 60 * 60 * 1000))
      : null;

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const preferredTime = settings?.preferredTime || "18:00";
  const dailyGoalMinutes = settings?.dailyGoalMinutes ?? 60;

  const todayRow = streakData.find((s) => {
    const d = new Date(s.date as Date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === todayMs;
  });
  const minutesToday = (todayRow?.minutesSpent as number) || 0;

  return {
    currentStreak: calculateCurrentStreak(dates),
    longestStreak: calculateLongestStreak(dates),
    practicedToday,
    practicedYesterday,
    daysSinceLastPractice,
    preferredTime,
    minutesToday,
    dailyGoalMinutes,
    goalMet: minutesToday >= dailyGoalMinutes,
  };
}

// ============================================================
// GET ACHIEVEMENTS
// ============================================================
export async function getUserAchievements(userId: string) {
  return prisma.achievement.findMany({
    where: { userId },
    orderBy: { unlockedAt: "desc" },
  });
}

// ============================================================
// CHECK AND UNLOCK ACHIEVEMENTS
// ============================================================
export async function checkAchievements(userId: string) {
  const stats = await getDashboardStats(userId);
  const existing = await prisma.achievement.findMany({
    where: { userId },
    select: { name: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingNames = new Set((existing as any[]).map((a: any) => a.name));
  const newAchievements: { name: string; description: string; icon: string }[] = [];

  for (const def of ACHIEVEMENTS) {
    if (existingNames.has(def.name)) continue;
    if (isUnlockedByStats(def, stats)) {
      newAchievements.push({
        name: def.name,
        description: def.description,
        icon: def.icon,
      });
    }
  }

  for (const achievement of newAchievements) {
    await prisma.achievement.create({
      data: {
        userId,
        ...achievement,
      },
    });
  }

  return newAchievements;
}

// ============================================================
// HELPERS
// ============================================================
function calculateCurrentStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const sorted = dates
    .map(d => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
    .sort((a, b) => b - a); // Most recent first

  const unique = [...new Set(sorted)];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayMs = yesterday.getTime();

  // Must have practiced today or yesterday
  if (unique[0] !== todayMs && unique[0] !== yesterdayMs) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const diff = unique[i - 1] - unique[i];
    const oneDay = 24 * 60 * 60 * 1000;
    if (diff === oneDay) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function calculateLongestStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const sorted = dates
    .map(d => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
    .sort((a, b) => a - b);

  const unique = [...new Set(sorted)];

  let longest = 1;
  let current = 1;

  for (let i = 1; i < unique.length; i++) {
    const diff = unique[i] - unique[i - 1];
    const oneDay = 24 * 60 * 60 * 1000;
    if (diff === oneDay) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}
