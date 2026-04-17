export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SkillTreeClient } from "@/components/skill-tree/skill-tree-client";

type SkillProgressRow = {
  level: string;
  totalReps: number;
  avgScore: number;
  bestScore: number;
  totalXp: number;
  consecutiveHighScores: number;
  lastPracticedAt: Date | null;
} | null;

type RepetitionCardRow = {
  nextReviewAt: Date;
} | null;

type TechniqueRow = {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  howToUse: string;
  difficulty: string;
  skillProgress: SkillProgressRow;
  repetitionCard: RepetitionCardRow;
  _count: { ifThenPatterns: number };
};

type ModuleRow = {
  id: string;
  name: string;
  description: string | null;
  techniques: TechniqueRow[];
};

export default async function SkillTreePage() {
  const { userId } = await getSession();

  const modules = await prisma.module.findMany({
    where: { userId },
    include: {
      techniques: {
        include: {
          skillProgress: true,
          repetitionCard: true,
          _count: { select: { ifThenPatterns: true } },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const payload = (modules as unknown as ModuleRow[]).map((m: ModuleRow) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    techniques: m.techniques.map((t: TechniqueRow) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      whenToUse: t.whenToUse,
      howToUse: t.howToUse,
      difficulty: t.difficulty,
      level: (t.skillProgress?.level as string) || "beginner",
      totalReps: t.skillProgress?.totalReps || 0,
      avgScore: t.skillProgress?.avgScore || 0,
      bestScore: t.skillProgress?.bestScore || 0,
      totalXp: t.skillProgress?.totalXp || 0,
      consecutiveHighScores: t.skillProgress?.consecutiveHighScores || 0,
      lastPracticedAt: t.skillProgress?.lastPracticedAt
        ? t.skillProgress.lastPracticedAt.toISOString()
        : null,
      nextReviewAt: t.repetitionCard?.nextReviewAt
        ? t.repetitionCard.nextReviewAt.toISOString()
        : null,
      patternCount: t._count.ifThenPatterns,
    })),
  }));

  return <SkillTreeClient modules={payload} />;
}
