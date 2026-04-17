export const dynamic = "force-dynamic";

import { getUserSettings } from "@/actions/settings";
import { getSession } from "@/lib/session";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const { userId, userName } = await getSession();
  const settings = await getUserSettings(userId);
  return <SettingsClient initial={settings} userName={userName} />;
}
