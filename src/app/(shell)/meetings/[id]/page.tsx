export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getMeetingAnalysis } from "@/actions/meetings";
import { getSession } from "@/lib/session";
import { MeetingDetailClient } from "@/components/meetings/meeting-detail-client";

type FeedbackItemRow = {
  id: string;
  timestamp: string;
  type: string;
  techniqueName: string;
  whatHappened: string;
  suggestion: string | null;
  quote: string | null;
};

type GeneratedExerciseRow = {
  id: string;
  exerciseType: string;
  prompt: string;
  techniqueName: string;
  completed: boolean;
};

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await getSession();
  const meeting = await getMeetingAnalysis(id);

  if (!meeting || meeting.userId !== userId) notFound();

  let bbbtuuiccCoverage: Record<string, boolean> | null = null;
  if (meeting.bbbtuuiccCoverage) {
    try {
      bbbtuuiccCoverage = JSON.parse(meeting.bbbtuuiccCoverage);
    } catch {
      bbbtuuiccCoverage = null;
    }
  }

  const payload = {
    id: meeting.id,
    meetingType: meeting.meetingType,
    date: meeting.date.toISOString(),
    summary: meeting.summary,
    talkRatio: meeting.talkRatio,
    questionsAsked: meeting.questionsAsked,
    longestMonologue: meeting.longestMonologue,
    bbbtuuiccCoverage,
    feedbackItems: meeting.feedbackItems.map((f: FeedbackItemRow) => ({
      id: f.id,
      timestamp: f.timestamp,
      type: f.type,
      techniqueName: f.techniqueName,
      whatHappened: f.whatHappened,
      suggestion: f.suggestion,
      quote: f.quote,
    })),
    generatedExercises: meeting.generatedExercises.map((ex: GeneratedExerciseRow) => ({
      id: ex.id,
      exerciseType: ex.exerciseType,
      prompt: ex.prompt,
      techniqueName: ex.techniqueName,
      completed: ex.completed,
    })),
    reflection: meeting.reflection
      ? {
          id: meeting.reflection.id,
          question1: meeting.reflection.question1,
          question2: meeting.reflection.question2,
          question3: meeting.reflection.question3,
          question4: meeting.reflection.question4,
          question5: meeting.reflection.question5,
          createdAt: meeting.reflection.createdAt.toISOString(),
        }
      : null,
  };

  return <MeetingDetailClient meeting={payload} />;
}
