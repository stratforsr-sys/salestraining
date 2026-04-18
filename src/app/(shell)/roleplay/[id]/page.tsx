export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { RoleplayChatClient } from "@/components/roleplay/roleplay-chat-client";

type FeedbackRow = {
  id: string;
  timestamp: number;
  type: string;
  buyerSaid: string;
  userSaid: string;
  techniqueName: string;
  idealResponse: string;
  explanation: string;
};

export default async function RoleplayChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await getSession();

  const roleplay = await prisma.roleplaySession.findUnique({
    where: { id },
    include: {
      persona: true,
      scorecard: true,
      feedbackItems: { orderBy: { timestamp: "asc" } },
      session: { select: { userId: true } },
    },
  });

  if (!roleplay || roleplay.session.userId !== userId) notFound();

  const payload = {
    id: roleplay.id,
    meetingType: roleplay.meetingType,
    difficulty: roleplay.difficulty,
    transcript: roleplay.transcript,
    persona: {
      name: roleplay.persona.name,
      title: roleplay.persona.title,
      company: roleplay.persona.company,
    },
    scorecard: roleplay.scorecard
      ? {
          rightTechniqueScore: roleplay.scorecard.rightTechniqueScore,
          frameworkCoverage: roleplay.scorecard.frameworkCoverage,
          objectionHandling: roleplay.scorecard.objectionHandling,
          meetingStructure: roleplay.scorecard.meetingStructure,
          naturalFormulation: roleplay.scorecard.naturalFormulation,
          totalScore: roleplay.scorecard.totalScore,
          detailedFeedback: roleplay.scorecard.detailedFeedback,
          hiddenMotivesScore: roleplay.scorecard.hiddenMotivesScore ?? null,
          hiddenMotivesDetails: roleplay.scorecard.hiddenMotivesDetails ?? null,
        }
      : null,
    feedbackItems: (roleplay.feedbackItems as FeedbackRow[]).map((f) => ({
      id: f.id,
      timestamp: f.timestamp,
      type: f.type,
      buyerSaid: f.buyerSaid,
      userSaid: f.userSaid,
      techniqueName: f.techniqueName,
      idealResponse: f.idealResponse,
      explanation: f.explanation,
    })),
  };

  return <RoleplayChatClient roleplay={payload} />;
}
