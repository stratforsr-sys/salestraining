"use server";

import { prisma } from "@/lib/prisma";
import { analyzeNotes } from "@/lib/gemini";
import { buildModuleKnowledgeBase } from "@/lib/knowledge-base";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

// ============================================================
// HELPERS — authorization
// ============================================================
async function assertModuleOwnership(moduleId: string): Promise<void> {
  const { userId } = await getSession();
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, select: { userId: true } });
  if (!mod || mod.userId !== userId) throw new Error("Module not found");
}

async function assertTechniqueOwnership(techniqueId: string): Promise<string> {
  const { userId } = await getSession();
  const tech = await prisma.technique.findUnique({
    where: { id: techniqueId },
    select: { moduleId: true, module: { select: { userId: true } } },
  });
  if (!tech || tech.module.userId !== userId) throw new Error("Technique not found");
  return tech.moduleId;
}

async function assertPatternOwnership(patternId: string): Promise<string> {
  const { userId } = await getSession();
  const pattern = await prisma.ifThenPattern.findUnique({
    where: { id: patternId },
    select: {
      techniqueId: true,
      technique: { select: { moduleId: true, module: { select: { userId: true } } } },
    },
  });
  if (!pattern || pattern.technique.module.userId !== userId) throw new Error("Pattern not found");
  return pattern.technique.moduleId;
}

// ============================================================
// CREATE MODULE + ANALYZE NOTES
// ============================================================
export async function createModule(
  name: string,
  notes: string,
  source?: string
) {
  const { userId } = await getSession();
  const module = await prisma.module.create({
    data: {
      userId,
      name,
      rawNotes: {
        create: {
          content: notes,
          source: source || undefined,
        },
      },
    },
  });

  const analysis = await analyzeNotes(name, notes);

  for (let i = 0; i < analysis.techniques.length; i++) {
    const tech = analysis.techniques[i];

    await prisma.technique.create({
      data: {
        moduleId: module.id,
        name: tech.name,
        description: tech.description,
        whenToUse: tech.whenToUse,
        howToUse: tech.howToUse,
        difficulty: tech.difficulty,
        order: i,
        ifThenPatterns: {
          create: tech.ifThenPatterns.map(p => ({
            trigger: p.trigger,
            response: p.response,
            context: p.context || null,
          })),
        },
        skillProgress: {
          create: {
            level: "beginner",
            totalReps: 0,
            avgScore: 0,
            bestScore: 0,
            lastScore: 0,
            consecutiveHighScores: 0,
            totalXp: 0,
          },
        },
        repetitionCard: {
          create: {
            interval: 1,
            easeFactor: 2.5,
            repetitions: 0,
            nextReviewAt: new Date(),
          },
        },
      },
    });
  }

  revalidatePath("/modules");
  revalidatePath(`/modules/${module.id}`);
  return { moduleId: module.id, techniquesCreated: analysis.techniques.length };
}

// ============================================================
// ADD NOTES TO EXISTING MODULE
// ============================================================
export async function addNotesToModule(
  moduleId: string,
  notes: string,
  source?: string
) {
  await assertModuleOwnership(moduleId);
  const existingKb = await buildModuleKnowledgeBase(moduleId);
  const module = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!module) throw new Error("Module not found");

  await prisma.rawNote.create({
    data: {
      moduleId,
      content: notes,
      source: source || undefined,
    },
  });

  const analysis = await analyzeNotes(module.name, notes, existingKb);
  const maxOrder = await prisma.technique.count({ where: { moduleId } });

  let created = 0;
  for (let i = 0; i < analysis.techniques.length; i++) {
    const tech = analysis.techniques[i];

    await prisma.technique.create({
      data: {
        moduleId,
        name: tech.name,
        description: tech.description,
        whenToUse: tech.whenToUse,
        howToUse: tech.howToUse,
        difficulty: tech.difficulty,
        order: maxOrder + i,
        ifThenPatterns: {
          create: tech.ifThenPatterns.map(p => ({
            trigger: p.trigger,
            response: p.response,
            context: p.context || null,
          })),
        },
        skillProgress: {
          create: {
            level: "beginner",
            totalReps: 0,
            avgScore: 0,
            bestScore: 0,
            lastScore: 0,
            consecutiveHighScores: 0,
            totalXp: 0,
          },
        },
        repetitionCard: {
          create: {
            interval: 1,
            easeFactor: 2.5,
            repetitions: 0,
            nextReviewAt: new Date(),
          },
        },
      },
    });
    created++;
  }

  revalidatePath(`/modules/${moduleId}`);
  return { newTechniques: created };
}

// ============================================================
// TECHNIQUE CRUD
// ============================================================
export async function createTechnique(
  moduleId: string,
  data: {
    name: string;
    description: string;
    whenToUse: string;
    howToUse: string;
    difficulty?: string;
  }
) {
  await assertModuleOwnership(moduleId);
  if (!data.name.trim()) throw new Error("Namn krävs");

  const maxOrder = await prisma.technique.count({ where: { moduleId } });
  const technique = await prisma.technique.create({
    data: {
      moduleId,
      name: data.name.trim(),
      description: data.description.trim(),
      whenToUse: data.whenToUse.trim(),
      howToUse: data.howToUse.trim(),
      difficulty: data.difficulty || "medium",
      order: maxOrder,
      skillProgress: {
        create: {
          level: "beginner",
          totalReps: 0,
          avgScore: 0,
          bestScore: 0,
          lastScore: 0,
          consecutiveHighScores: 0,
          totalXp: 0,
        },
      },
      repetitionCard: {
        create: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          nextReviewAt: new Date(),
        },
      },
    },
  });

  revalidatePath(`/modules/${moduleId}`);
  return { techniqueId: technique.id };
}

export async function updateTechnique(
  techniqueId: string,
  data: {
    name?: string;
    description?: string;
    whenToUse?: string;
    howToUse?: string;
    difficulty?: string;
  }
) {
  const moduleId = await assertTechniqueOwnership(techniqueId);
  const cleaned: typeof data = {};
  if (data.name !== undefined) cleaned.name = data.name.trim();
  if (data.description !== undefined) cleaned.description = data.description.trim();
  if (data.whenToUse !== undefined) cleaned.whenToUse = data.whenToUse.trim();
  if (data.howToUse !== undefined) cleaned.howToUse = data.howToUse.trim();
  if (data.difficulty !== undefined) {
    if (!["easy", "medium", "hard"].includes(data.difficulty)) throw new Error("Ogiltig svårighetsgrad");
    cleaned.difficulty = data.difficulty;
  }

  await prisma.technique.update({ where: { id: techniqueId }, data: cleaned });
  revalidatePath(`/modules/${moduleId}`);
  return { ok: true };
}

export async function deleteTechnique(techniqueId: string) {
  const moduleId = await assertTechniqueOwnership(techniqueId);
  await prisma.technique.delete({ where: { id: techniqueId } });
  revalidatePath(`/modules/${moduleId}`);
  return { ok: true };
}

// ============================================================
// IF-THEN PATTERN CRUD
// ============================================================
export async function createIfThenPattern(
  techniqueId: string,
  data: { trigger: string; response: string; context?: string }
) {
  const moduleId = await assertTechniqueOwnership(techniqueId);
  if (!data.trigger.trim() || !data.response.trim()) throw new Error("Trigger och respons krävs");

  const pattern = await prisma.ifThenPattern.create({
    data: {
      techniqueId,
      trigger: data.trigger.trim(),
      response: data.response.trim(),
      context: data.context?.trim() || null,
    },
  });

  revalidatePath(`/modules/${moduleId}`);
  return { patternId: pattern.id };
}

export async function updateIfThenPattern(
  patternId: string,
  data: { trigger?: string; response?: string; context?: string | null }
) {
  const moduleId = await assertPatternOwnership(patternId);
  const cleaned: { trigger?: string; response?: string; context?: string | null } = {};
  if (data.trigger !== undefined) cleaned.trigger = data.trigger.trim();
  if (data.response !== undefined) cleaned.response = data.response.trim();
  if (data.context !== undefined) cleaned.context = data.context === null ? null : data.context.trim() || null;

  await prisma.ifThenPattern.update({ where: { id: patternId }, data: cleaned });
  revalidatePath(`/modules/${moduleId}`);
  return { ok: true };
}

export async function deleteIfThenPattern(patternId: string) {
  const moduleId = await assertPatternOwnership(patternId);
  await prisma.ifThenPattern.delete({ where: { id: patternId } });
  revalidatePath(`/modules/${moduleId}`);
  return { ok: true };
}

// ============================================================
// GET ALL MODULES WITH PROGRESS
// ============================================================
export async function getModulesWithProgress(userId: string) {
  const modules = await prisma.module.findMany({
    where: { userId },
    include: {
      techniques: {
        include: {
          skillProgress: true,
          repetitionCard: true,
        },
      },
      _count: { select: { rawNotes: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (modules as any[]).map((mod: any) => {
    const techniques = mod.techniques as any[];
    const avgLevel = techniques.reduce((sum: number, t: any) => {
      const levelValues: Record<string, number> = {
        beginner: 1, advanced: 2, competent: 3, skilled: 4, expert: 5,
      };
      return sum + (levelValues[t.skillProgress?.level || "beginner"] || 1);
    }, 0) / (techniques.length || 1);

    const nextReview = techniques
      .map((t: any) => t.repetitionCard?.nextReviewAt)
      .filter(Boolean)
      .sort((a: any, b: any) => (a.getTime() - b.getTime()))[0];

    return {
      id: mod.id,
      name: mod.name,
      description: mod.description,
      techniqueCount: techniques.length,
      noteCount: mod._count?.rawNotes || 0,
      avgLevel: Math.round(avgLevel * 10) / 10,
      avgLevelLabel: getLevelLabel(avgLevel),
      nextReview,
      lastTrained: techniques
        .map((t: any) => t.skillProgress?.lastPracticedAt)
        .filter(Boolean)
        .sort((a: any, b: any) => b.getTime() - a.getTime())[0] || null,
    };
  });
}

function getLevelLabel(avg: number): string {
  if (avg >= 4.5) return "Expert";
  if (avg >= 3.5) return "Skicklig";
  if (avg >= 2.5) return "Kompetent";
  if (avg >= 1.5) return "Avancerad";
  return "Nyborjare";
}
