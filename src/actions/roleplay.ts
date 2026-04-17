"use server";

import { prisma } from "@/lib/prisma";
import { roleplayResponse, evaluateRoleplayFull, type ConversationMessage, type TechniqueContext, type PersonaContext } from "@/lib/gemini";
import { buildKnowledgeBase } from "@/lib/knowledge-base";
import { getXpReward } from "@/lib/spaced-repetition";
import { checkAchievements } from "@/actions/gamification";

// ============================================================
// START ROLEPLAY
// ============================================================
export async function startRoleplay(
  sessionId: string,
  personaId: string,
  meetingType: string,
  difficulty: string,
  focusTechniqueId?: string
) {
  const persona = await prisma.persona.findUnique({ where: { id: personaId } });
  if (!persona) throw new Error("Persona not found");

  const roleplay = await prisma.roleplaySession.create({
    data: {
      sessionId,
      personaId,
      meetingType,
      difficulty,
      focusTechnique: focusTechniqueId || null,
      transcript: JSON.stringify([]),
      duration: 0,
    },
  });

  // Generate initial buyer greeting based on meeting type
  const personaCtx: PersonaContext = {
    name: persona.name,
    title: persona.title,
    company: persona.company,
    industry: persona.industry,
    companySize: persona.companySize,
    personality: persona.personality,
    currentSolution: persona.currentSolution || undefined,
    painPoints: persona.painPoints || undefined,
    objections: persona.objections || undefined,
  };

  const session = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
  });

  const userId = session?.userId;
  const knowledgeBase = userId ? await buildKnowledgeBase(userId) : "";

  let openingMessage: string;

  if (meetingType === "cold_call") {
    openingMessage = `*Telefonen ringer* Ja, det ar ${persona.name}.`;
  } else {
    openingMessage = `Hej! Tack for att du tar dig tid. Jag ar ${persona.name}, ${persona.title} pa ${persona.company}. Vad hade du tankt att vi skulle prata om idag?`;
  }

  const transcript: ConversationMessage[] = [
    { role: "buyer", content: openingMessage, timestamp: 0 },
  ];

  await prisma.roleplaySession.update({
    where: { id: roleplay.id },
    data: { transcript: JSON.stringify(transcript) },
  });

  return {
    id: roleplay.id,
    roleplayId: roleplay.id,
    persona: {
      name: persona.name,
      title: persona.title,
      company: persona.company,
      industry: persona.industry,
      companySize: persona.companySize,
      avatarUrl: persona.avatarUrl,
    },
    openingMessage,
    transcript,
  };
}

// ============================================================
// SEND MESSAGE IN ROLEPLAY
// ============================================================
export async function sendRoleplayMessage(
  roleplayId: string,
  userMessage: string,
  elapsedSeconds: number
) {
  const roleplay = await prisma.roleplaySession.findUnique({
    where: { id: roleplayId },
    include: {
      persona: true,
      session: true,
    },
  });

  if (!roleplay) throw new Error("Roleplay not found");

  const transcript: ConversationMessage[] = JSON.parse(roleplay.transcript);

  // Add user message
  transcript.push({
    role: "seller",
    content: userMessage,
    timestamp: elapsedSeconds,
  });

  const personaCtx: PersonaContext = {
    name: roleplay.persona.name,
    title: roleplay.persona.title,
    company: roleplay.persona.company,
    industry: roleplay.persona.industry,
    companySize: roleplay.persona.companySize,
    personality: roleplay.persona.personality,
    currentSolution: roleplay.persona.currentSolution || undefined,
    painPoints: roleplay.persona.painPoints || undefined,
    objections: roleplay.persona.objections || undefined,
  };

  const knowledgeBase = await buildKnowledgeBase(roleplay.session.userId);

  // Get AI buyer response
  const buyerResponse = await roleplayResponse(
    personaCtx,
    transcript,
    roleplay.difficulty,
    roleplay.focusTechnique,
    knowledgeBase
  );

  // Add buyer response
  transcript.push({
    role: "buyer",
    content: buyerResponse,
    timestamp: elapsedSeconds + 2, // Approximate
  });

  // Save updated transcript
  await prisma.roleplaySession.update({
    where: { id: roleplayId },
    data: {
      transcript: JSON.stringify(transcript),
      duration: elapsedSeconds,
    },
  });

  return { buyerResponse, transcript };
}

// ============================================================
// END ROLEPLAY + GENERATE SCORECARD
// ============================================================
export async function endRoleplay(roleplayId: string) {
  const roleplay = await prisma.roleplaySession.findUnique({
    where: { id: roleplayId },
    include: {
      persona: true,
      session: true,
    },
  });

  if (!roleplay) throw new Error("Roleplay not found");

  const transcript: ConversationMessage[] = JSON.parse(roleplay.transcript);
  const knowledgeBase = await buildKnowledgeBase(roleplay.session.userId);

  let focusTechContext: TechniqueContext | null = null;
  if (roleplay.focusTechnique) {
    const tech = await prisma.technique.findUnique({
      where: { id: roleplay.focusTechnique },
    });
    if (tech) {
      focusTechContext = {
        name: tech.name,
        description: tech.description,
        whenToUse: tech.whenToUse,
        howToUse: tech.howToUse,
      };
    }
  }

  const personaCtx: PersonaContext = {
    name: roleplay.persona.name,
    title: roleplay.persona.title,
    company: roleplay.persona.company,
    industry: roleplay.persona.industry,
    companySize: roleplay.persona.companySize,
    personality: roleplay.persona.personality,
    currentSolution: roleplay.persona.currentSolution || undefined,
    painPoints: roleplay.persona.painPoints || undefined,
    objections: roleplay.persona.objections || undefined,
  };

  const evaluation = await evaluateRoleplayFull(
    transcript,
    personaCtx,
    roleplay.meetingType,
    roleplay.difficulty,
    focusTechContext,
    knowledgeBase
  );

  await prisma.scorecard.create({
    data: {
      roleplayId,
      rightTechniqueScore: evaluation.breakdown.rightTechnique.score,
      frameworkCoverage: evaluation.breakdown.frameworkCoverage.score,
      objectionHandling: evaluation.breakdown.objectionHandling.score,
      meetingStructure: evaluation.breakdown.meetingStructure.score,
      naturalFormulation: evaluation.breakdown.naturalFormulation.score,
      totalScore: evaluation.score,
      detailedFeedback: JSON.stringify({
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        feedForward: evaluation.feedForward,
        breakdownComments: {
          rightTechnique: evaluation.breakdown.rightTechnique.comment,
          frameworkCoverage: evaluation.breakdown.frameworkCoverage.comment,
          objectionHandling: evaluation.breakdown.objectionHandling.comment,
          meetingStructure: evaluation.breakdown.meetingStructure.comment,
          naturalFormulation: evaluation.breakdown.naturalFormulation.comment,
        },
      }),
    },
  });

  if (evaluation.timestampedFeedback?.length) {
    await prisma.timestampedFeedback.createMany({
      data: evaluation.timestampedFeedback.map((item) => ({
        roleplayId,
        timestamp: Math.max(0, Math.round(item.timestamp || 0)),
        type: item.type,
        buyerSaid: item.buyerSaid || "",
        userSaid: item.userSaid || "",
        techniqueName: item.techniqueName || "",
        idealResponse: item.idealResponse || "",
        explanation: item.explanation || "",
      })),
    });
  }

  const xp = getXpReward("roleplay", evaluation.score);

  await prisma.practiceSession.update({
    where: { id: roleplay.sessionId },
    data: { totalXp: { increment: xp } },
  });

  const userId = roleplay.session.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyStreak.upsert({
    where: { userId_date: { userId, date: today } },
    update: { xpEarned: { increment: xp } },
    create: { userId, date: today, xpEarned: xp },
  });

  const newAchievements = await checkAchievements(userId);

  return {
    evaluation,
    xpEarned: xp,
    transcript,
    newAchievements,
    timestampedFeedback: evaluation.timestampedFeedback || [],
  };
}
