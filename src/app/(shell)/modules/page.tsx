export const dynamic = "force-dynamic";

import { getModulesWithProgress } from "@/actions/modules";
import { ModulesClient } from "@/components/modules/modules-client";
import { getSession } from "@/lib/session";

export default async function ModulesPage() {
  const { userId } = await getSession();
  const modules = await getModulesWithProgress(userId);
  return <ModulesClient modules={modules} />;
}
