export const dynamic = "force-dynamic";

import { listPersonas } from "@/actions/personas";
import { PersonasListClient } from "@/components/personas/personas-list-client";

export default async function PersonaDeepLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const personas = await listPersonas();
  return <PersonasListClient initialPersonas={personas} initialPanelId={id} />;
}
