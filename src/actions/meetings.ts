"use server";

import { prisma } from "@/lib/prisma";
import { analyzeMeetingTranscript } from "@/lib/gemini";
import { buildKnowledgeBase } from "@/lib/knowledge-base";
import { getXpReward } from "@/lib/spaced-repetition";
import { getSession } from "@/lib/session";
import { checkAchievements } from "@/actions/gamification";

function coerceNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function coerceInt(v: unknown): number | null {
  const n = coerceNumber(v);
  return n == null ? null : Math.round(n);
}

// ============================================================
// ANALYZE REAL MEETING TRANSCRIPT
// ============================================================
export async function analyzeRealMeeting(
  meetingType: string,
  transcript: string,
  date?: Date
) {
  try {
    const { userId } = await getSession();
    const knowledgeBase = await buildKnowledgeBase(userId);

    const analysis = await analyzeMeetingTranscript(transcript, meetingType, knowledgeBase);

    const techniqueHits = analysis.techniqueHits ?? [];
    const techniqueMisses = analysis.techniqueMisses ?? [];
    const generatedExercises = analysis.generatedExercises ?? [];
    const bbbtuuiccCoverage = analysis.bbbtuuiccCoverage ?? {};

    const talkRatioNum = coerceNumber(analysis.talkRatio);
    const questionsNum = coerceInt(analysis.questionsAsked);
    const monologueNum = coerceInt(analysis.longestMonologue);

    const meeting = await prisma.realMeetingAnalysis.create({
      data: {
        userId,
        meetingType,
        transcript,
        date: date || new Date(),
        summary: String(analysis.summary ?? ""),
        talkRatio: talkRatioNum,
        questionsAsked: questionsNum,
        longestMonologue: monologueNum,
        techniqueHits: JSON.stringify(techniqueHits),
        techniqueMisses: JSON.stringify(techniqueMisses),
        bbbtuuiccCoverage: JSON.stringify(bbbtuuiccCoverage),
      },
    });

    for (const hit of techniqueHits) {
      await prisma.meetingFeedbackItem.create({
        data: {
          meetingId: meeting.id,
          timestamp: hit.timestamp ?? "",
          type: "technique_used",
          techniqueName: hit.techniqueName ?? "",
          whatHappened: hit.comment ?? "",
          quote: hit.quote ?? null,
        },
      });
    }

    for (const miss of techniqueMisses) {
      await prisma.meetingFeedbackItem.create({
        data: {
          meetingId: meeting.id,
          timestamp: miss.timestamp ?? "",
          type: "missed_opportunity",
          techniqueName: miss.techniqueName ?? "",
          whatHappened: miss.whatHappened ?? "",
          suggestion: miss.suggestion ?? null,
          quote: miss.idealResponse ?? null,
        },
      });
    }

    for (const exercise of generatedExercises) {
      await prisma.generatedExercise.create({
        data: {
          meetingId: meeting.id,
          exerciseType: exercise.type ?? "scenario_card",
          prompt: exercise.prompt ?? "",
          techniqueName: exercise.techniqueName ?? "",
        },
      });
    }

    const xp = getXpReward("meeting_analysis");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyStreak.upsert({
      where: { userId_date: { userId, date: today } },
      update: { xpEarned: { increment: xp } },
      create: { userId, date: today, xpEarned: xp },
    });

    const newAchievements = await checkAchievements(userId);

    return {
      id: meeting.id,
      meetingId: meeting.id,
      summary: analysis.summary,
      talkRatio: analysis.talkRatio,
      questionsAsked: analysis.questionsAsked,
      techniqueHits: techniqueHits.length,
      techniqueMisses: techniqueMisses.length,
      exercisesGenerated: generatedExercises.length,
      bbbtuuiccCoverage,
      xpEarned: xp,
      newAchievements,
    };
  } catch (err) {
    console.error("[analyzeRealMeeting] Failed", {
      meetingType,
      transcriptLength: transcript.length,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    const message = err instanceof Error ? err.message : "Okänt fel vid mötesanalys";
    throw new Error(`Kunde inte analysera möte: ${message}`);
  }
}

// ============================================================
// GET MEETING ANALYSIS WITH ALL DETAILS
// ============================================================
export async function getMeetingAnalysis(meetingId: string) {
  return prisma.realMeetingAnalysis.findUnique({
    where: { id: meetingId },
    include: {
      feedbackItems: { orderBy: { timestamp: "asc" } },
      generatedExercises: true,
      reflection: true,
    },
  });
}

// ============================================================
// GET ALL MEETINGS
// ============================================================
export async function getUserMeetings(userId: string) {
  return prisma.realMeetingAnalysis.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          feedbackItems: true,
          generatedExercises: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });
}
