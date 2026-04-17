export const dynamic = "force-dynamic";

import { getUserMeetings } from "@/actions/meetings";
import { MeetingsClient } from "@/components/meetings/meetings-client";
import { getSession } from "@/lib/session";

export default async function MeetingsPage() {
  const { userId } = await getSession();
  const meetings = await getUserMeetings(userId);
  return <MeetingsClient meetings={meetings} />;
}
