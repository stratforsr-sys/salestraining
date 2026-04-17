export const dynamic = "force-dynamic";

import { getUserReflections } from "@/actions/reflections";
import { getSession } from "@/lib/session";
import { ReflectionsClient } from "@/components/reflection/reflections-client";

type ReflectionRow = {
  id: string;
  question1: string;
  question2: string;
  question3: string;
  question4: string;
  question5: string;
  createdAt: Date;
  sessionId: string | null;
  meetingId: string | null;
  session: { sessionType: string; date: Date } | null;
  meeting: { meetingType: string; date: Date } | null;
};

export default async function ReflectionsPage() {
  const { userId } = await getSession();
  const rows = (await getUserReflections(userId, 100)) as unknown as ReflectionRow[];

  const reflections = rows.map((r) => ({
    id: r.id,
    question1: r.question1,
    question2: r.question2,
    question3: r.question3,
    question4: r.question4,
    question5: r.question5,
    createdAt: r.createdAt.toISOString(),
    source: r.meeting
      ? { kind: "meeting" as const, id: r.meetingId!, label: r.meeting.meetingType, date: r.meeting.date.toISOString() }
      : r.session
      ? { kind: "session" as const, id: r.sessionId!, label: r.session.sessionType, date: r.session.date.toISOString() }
      : { kind: "standalone" as const, id: null, label: "Fristående", date: r.createdAt.toISOString() },
  }));

  return <ReflectionsClient reflections={reflections} />;
}
