export const dynamic = "force-dynamic";

import { listPersonas } from "@/actions/personas";
import { PersonasListClient } from "@/components/personas/personas-list-client";

export default async function PersonasPage() {
  const personas = await listPersonas();
  return <PersonasListClient initialPersonas={personas} />;
}
