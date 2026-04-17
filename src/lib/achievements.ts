export interface AchievementStats {
  currentStreak: number;
  longestStreak: number;
  levelCounts: Record<string, number>;
  totalXp: number;
  sessionCount: number;
  meetingCount: number;
}

export interface AchievementDef {
  name: string;
  description: string;
  icon: string;
  category: "streak" | "skill" | "volume" | "milestone";
  progress: (s: AchievementStats) => { current: number; target: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    name: "7-dagars streak",
    description: "Tranat 7 dagar i rad!",
    icon: "flame",
    category: "streak",
    progress: (s) => ({ current: Math.min(s.currentStreak, 7), target: 7 }),
  },
  {
    name: "30-dagars streak",
    description: "Tranat 30 dagar i rad! Otroligt!",
    icon: "fire",
    category: "streak",
    progress: (s) => ({ current: Math.min(s.currentStreak, 30), target: 30 }),
  },
  {
    name: "Forsta Kompetent",
    description: "Din forsta teknik pa Kompetent-niva!",
    icon: "star",
    category: "skill",
    progress: (s) => ({
      current: Math.min(
        (s.levelCounts.competent || 0) + (s.levelCounts.skilled || 0) + (s.levelCounts.expert || 0),
        1
      ),
      target: 1,
    }),
  },
  {
    name: "5 Skickliga tekniker",
    description: "5 tekniker pa Skicklig-niva!",
    icon: "trophy",
    category: "skill",
    progress: (s) => ({
      current: Math.min((s.levelCounts.skilled || 0) + (s.levelCounts.expert || 0), 5),
      target: 5,
    }),
  },
  {
    name: "Forsta REFLEX",
    description: "Din forsta teknik sitter som en reflex!",
    icon: "lightning",
    category: "skill",
    progress: (s) => ({ current: Math.min(s.levelCounts.expert || 0, 1), target: 1 }),
  },
  {
    name: "10 sessioner",
    description: "Genomfort 10 traningssessioner!",
    icon: "target",
    category: "volume",
    progress: (s) => ({ current: Math.min(s.sessionCount, 10), target: 10 }),
  },
  {
    name: "50 sessioner",
    description: "50 sessioner! Du ar pa vag mot mastery.",
    icon: "medal",
    category: "volume",
    progress: (s) => ({ current: Math.min(s.sessionCount, 50), target: 50 }),
  },
  {
    name: "1000 XP",
    description: "Samlat 1000 XP!",
    icon: "gem",
    category: "volume",
    progress: (s) => ({ current: Math.min(s.totalXp, 1000), target: 1000 }),
  },
  {
    name: "Forsta motesanalys",
    description: "Analyserat ditt forsta riktiga mote!",
    icon: "magnifier",
    category: "milestone",
    progress: (s) => ({ current: Math.min(s.meetingCount, 1), target: 1 }),
  },
];

export function isUnlockedByStats(def: AchievementDef, stats: AchievementStats): boolean {
  const p = def.progress(stats);
  return p.current >= p.target;
}
