"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  buildPersonaSystemPrompt,
  expandPersonaFromInstructions as expandWithGemini,
  roleplayResponse,
  type BehaviorStructured,
  type HiddenMotive,
  type PersonaContext,
  type PersonaExpansionInput,
  type PersonaExpansionResult,
} from "@/lib/gemini";

// ============================================================
// TYPES
// ============================================================

export interface PersonaDraft {
  name: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  personality: string;
  mood?: string | null;
  communicationStyle?: string | null;
  behaviorInstructions?: string | null;
  behaviorStructured?: BehaviorStructured | null;
  currentSolution?: string | null;
  painPoints?: string[] | null;
  objections?: string[] | null;
  hiddenMotives?: HiddenMotive[] | null;
  difficultyOverrides?: Record<string, string> | null;
  sharedWithTeam?: boolean;
  avatarUrl?: string | null;
}

export interface PersonaListItem {
  id: string;
  userId: string | null;
  name: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  personality: string;
  avatarUrl: string | null;
  isDefault: boolean;
  sharedWithTeam: boolean;
  isMine: boolean;
  mood: string | null;
  communicationStyle: string | null;
  updatedAt: string;
}

// ============================================================
// VALIDATION
// ============================================================

const LIMITS = {
  name: 100,
  title: 100,
  company: 100,
  industry: 100,
  companySize: 100,
  personality: 500,
  behaviorInstructions: 2000,
  behaviorStructuredField: 2000,
  mood: 200,
  communicationStyle: 200,
  currentSolution: 500,
  painPointItem: 300,
  objectionItem: 300,
  painPointsMax: 10,
  objectionsMax: 10,
  hiddenMotiveSecret: 500,
  hiddenMotiveTrigger: 300,
  hiddenMotiveLeak: 500,
  hiddenMotivesMax: 5,
  difficultyOverride: 2000,
};

const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;

function assertLength(label: string, value: string, max: number) {
  if (value.length > max) {
    throw new Error(`${label} overstiger max ${max} tecken`);
  }
}

function validateDraft(draft: PersonaDraft) {
  const required: (keyof PersonaDraft)[] = [
    "name",
    "title",
    "company",
    "industry",
    "companySize",
    "personality",
  ];
  for (const key of required) {
    const v = draft[key];
    if (typeof v !== "string" || v.trim().length === 0) {
      throw new Error(`Faltet "${String(key)}" ar obligatoriskt`);
    }
  }

  assertLength("Namn", draft.name, LIMITS.name);
  assertLength("Titel", draft.title, LIMITS.title);
  assertLength("Foretag", draft.company, LIMITS.company);
  assertLength("Bransch", draft.industry, LIMITS.industry);
  assertLength("Foretagsstorlek", draft.companySize, LIMITS.companySize);
  assertLength("Personlighet", draft.personality, LIMITS.personality);

  if (draft.mood) assertLength("Humor", draft.mood, LIMITS.mood);
  if (draft.communicationStyle)
    assertLength("Kommunikationsstil", draft.communicationStyle, LIMITS.communicationStyle);
  if (draft.behaviorInstructions)
    assertLength(
      "Beteende-instruktioner (fritext)",
      draft.behaviorInstructions,
      LIMITS.behaviorInstructions
    );
  if (draft.currentSolution)
    assertLength("Nuvarande losning", draft.currentSolution, LIMITS.currentSolution);

  if (draft.behaviorStructured) {
    const b = draft.behaviorStructured;
    if (b.howYouReply)
      assertLength("Hur du svarar", b.howYouReply, LIMITS.behaviorStructuredField);
    if (b.whatYouWantToKnow)
      assertLength("Vad du vill veta", b.whatYouWantToKnow, LIMITS.behaviorStructuredField);
    if (b.whatTriggersYouNegatively)
      assertLength(
        "Vad som triggar negativt",
        b.whatTriggersYouNegatively,
        LIMITS.behaviorStructuredField
      );
    if (b.hiddenMotivesHint)
      assertLength("Dolda motiv-hint", b.hiddenMotivesHint, LIMITS.behaviorStructuredField);
  }

  if (draft.painPoints) {
    if (draft.painPoints.length > LIMITS.painPointsMax) {
      throw new Error(`Max ${LIMITS.painPointsMax} pain points`);
    }
    for (const p of draft.painPoints) assertLength("Pain point", p, LIMITS.painPointItem);
  }

  if (draft.objections) {
    if (draft.objections.length > LIMITS.objectionsMax) {
      throw new Error(`Max ${LIMITS.objectionsMax} invandningar`);
    }
    for (const o of draft.objections) assertLength("Invandning", o, LIMITS.objectionItem);
  }

  if (draft.hiddenMotives) {
    if (draft.hiddenMotives.length > LIMITS.hiddenMotivesMax) {
      throw new Error(`Max ${LIMITS.hiddenMotivesMax} dolda motiv`);
    }
    for (const m of draft.hiddenMotives) {
      if (!m.secret || !m.trigger) {
        throw new Error("Varje dolt motiv kraver 'secret' och 'trigger'");
      }
      assertLength("Hemligt faktum", m.secret, LIMITS.hiddenMotiveSecret);
      assertLength("Trigger", m.trigger, LIMITS.hiddenMotiveTrigger);
      if (m.howItLeaks) assertLength("Hur det lacker", m.howItLeaks, LIMITS.hiddenMotiveLeak);
    }
  }

  if (draft.difficultyOverrides) {
    for (const [k, v] of Object.entries(draft.difficultyOverrides)) {
      if (!DIFFICULTIES.includes(k as (typeof DIFFICULTIES)[number])) {
        throw new Error(`Ogiltig svarighetsgrad: ${k}`);
      }
      if (typeof v !== "string") continue;
      assertLength(`Svarighetsgrad-text (${k})`, v, LIMITS.difficultyOverride);
    }
  }
}

function draftToPrismaData(draft: PersonaDraft) {
  return {
    name: draft.name.trim(),
    title: draft.title.trim(),
    company: draft.company.trim(),
    industry: draft.industry.trim(),
    companySize: draft.companySize.trim(),
    personality: draft.personality.trim(),
    mood: draft.mood?.trim() || null,
    communicationStyle: draft.communicationStyle?.trim() || null,
    behaviorInstructions: draft.behaviorInstructions?.trim() || null,
    behaviorStructured: draft.behaviorStructured
      ? JSON.stringify(draft.behaviorStructured)
      : null,
    currentSolution: draft.currentSolution?.trim() || null,
    painPoints: draft.painPoints ? JSON.stringify(draft.painPoints) : null,
    objections: draft.objections ? JSON.stringify(draft.objections) : null,
    hiddenMotives: draft.hiddenMotives ? JSON.stringify(draft.hiddenMotives) : null,
    difficultyOverrides: draft.difficultyOverrides
      ? JSON.stringify(draft.difficultyOverrides)
      : null,
    sharedWithTeam: draft.sharedWithTeam ?? false,
    avatarUrl: draft.avatarUrl?.trim() || null,
  };
}

function toListItem(
  p: {
    id: string;
    userId: string | null;
    name: string;
    title: string;
    company: string;
    industry: string;
    companySize: string;
    personality: string;
    avatarUrl: string | null;
    isDefault: boolean;
    sharedWithTeam: boolean;
    mood: string | null;
    communicationStyle: string | null;
    updatedAt: Date;
  },
  currentUserId: string
): PersonaListItem {
  return {
    id: p.id,
    userId: p.userId,
    name: p.name,
    title: p.title,
    company: p.company,
    industry: p.industry,
    companySize: p.companySize,
    personality: p.personality,
    avatarUrl: p.avatarUrl,
    isDefault: p.isDefault,
    sharedWithTeam: p.sharedWithTeam,
    isMine: p.userId === currentUserId,
    mood: p.mood,
    communicationStyle: p.communicationStyle,
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ============================================================
// READ
// ============================================================

export async function listPersonas(): Promise<PersonaListItem[]> {
  const { userId } = await getSession();
  const rows = await prisma.persona.findMany({
    where: {
      isArchived: false,
      OR: [{ userId }, { isDefault: true }, { sharedWithTeam: true }],
    },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  return (rows as Parameters<typeof toListItem>[0][]).map((r) => toListItem(r, userId));
}

export async function getPersona(id: string) {
  const { userId } = await getSession();
  const persona = await prisma.persona.findUnique({ where: { id } });
  if (!persona || persona.isArchived) throw new Error("Persona hittades inte");
  const accessible =
    persona.isDefault || persona.userId === userId || persona.sharedWithTeam;
  if (!accessible) throw new Error("Ingen atkomst till denna persona");
  return {
    ...persona,
    isMine: persona.userId === userId,
  };
}

// ============================================================
// CREATE / UPDATE
// ============================================================

export async function createPersona(draft: PersonaDraft) {
  const { userId } = await getSession();
  validateDraft(draft);
  const data = draftToPrismaData(draft);
  const created = await prisma.persona.create({
    data: {
      ...data,
      userId,
      isDefault: false,
    },
  });
  return created;
}

export async function updatePersona(id: string, draft: PersonaDraft) {
  const { userId } = await getSession();
  validateDraft(draft);
  const existing = await prisma.persona.findUnique({ where: { id } });
  if (!existing || existing.isArchived) throw new Error("Persona hittades inte");

  // Per PRD: defaults are editable by everyone until roles are added.
  const canEdit = existing.isDefault || existing.userId === userId;
  if (!canEdit) throw new Error("Ingen behorighet att redigera");

  const data = draftToPrismaData(draft);
  const updated = await prisma.persona.update({
    where: { id },
    data,
  });
  return updated;
}

export async function archivePersona(id: string) {
  const { userId } = await getSession();
  const existing = await prisma.persona.findUnique({ where: { id } });
  if (!existing) throw new Error("Persona hittades inte");
  const canArchive = existing.isDefault || existing.userId === userId;
  if (!canArchive) throw new Error("Ingen behorighet att arkivera");
  await prisma.persona.update({
    where: { id },
    data: { isArchived: true, archivedAt: new Date() },
  });
  return { ok: true as const };
}

export async function restorePersona(id: string) {
  const { userId } = await getSession();
  const existing = await prisma.persona.findUnique({ where: { id } });
  if (!existing) throw new Error("Persona hittades inte");
  const canRestore = existing.isDefault || existing.userId === userId;
  if (!canRestore) throw new Error("Ingen behorighet att aterstalla");
  await prisma.persona.update({
    where: { id },
    data: { isArchived: false, archivedAt: null },
  });
  return { ok: true as const };
}

export async function clonePersona(id: string) {
  const { userId } = await getSession();
  const source = await prisma.persona.findUnique({ where: { id } });
  if (!source || source.isArchived) throw new Error("Persona hittades inte");

  const accessible =
    source.isDefault || source.userId === userId || source.sharedWithTeam;
  if (!accessible) throw new Error("Ingen atkomst");

  const cloned = await prisma.persona.create({
    data: {
      userId,
      name: `${source.name} (kopia)`,
      title: source.title,
      company: source.company,
      industry: source.industry,
      companySize: source.companySize,
      personality: source.personality,
      currentSolution: source.currentSolution,
      painPoints: source.painPoints,
      objections: source.objections,
      mood: source.mood,
      communicationStyle: source.communicationStyle,
      behaviorInstructions: source.behaviorInstructions,
      behaviorStructured: source.behaviorStructured,
      hiddenMotives: source.hiddenMotives,
      difficultyOverrides: source.difficultyOverrides,
      avatarUrl: source.avatarUrl,
      isDefault: false,
      sharedWithTeam: false,
    },
  });
  return cloned;
}

// ============================================================
// AI — Expansion, test, preview
// ============================================================

export async function expandPersonaDraft(
  input: PersonaExpansionInput
): Promise<PersonaExpansionResult> {
  await getSession();
  if (!input.name || !input.title || !input.industry || !input.personality) {
    throw new Error("Fyll i namn, titel, bransch och personlighet innan AI-expansion");
  }
  return expandWithGemini(input);
}

function draftToPersonaContext(draft: PersonaDraft): PersonaContext {
  return {
    name: draft.name,
    title: draft.title,
    company: draft.company,
    industry: draft.industry,
    companySize: draft.companySize,
    personality: draft.personality,
    currentSolution: draft.currentSolution ?? undefined,
    painPoints: draft.painPoints ? JSON.stringify(draft.painPoints) : undefined,
    objections: draft.objections ? JSON.stringify(draft.objections) : undefined,
    mood: draft.mood ?? undefined,
    communicationStyle: draft.communicationStyle ?? undefined,
    behaviorInstructions: draft.behaviorInstructions ?? undefined,
    behaviorStructured: draft.behaviorStructured
      ? JSON.stringify(draft.behaviorStructured)
      : undefined,
    hiddenMotives: draft.hiddenMotives ? JSON.stringify(draft.hiddenMotives) : undefined,
    difficultyOverrides: draft.difficultyOverrides
      ? JSON.stringify(draft.difficultyOverrides)
      : undefined,
  };
}

export async function testPersonaResponse(
  draft: PersonaDraft,
  sellerMessage: string,
  difficulty: string,
  history: { role: "buyer" | "seller"; content: string }[] = []
) {
  await getSession();
  if (!sellerMessage || sellerMessage.trim().length === 0) {
    throw new Error("Meddelande saknas");
  }
  const ctx = draftToPersonaContext(draft);
  const conversation = [
    ...history.map((m) => ({ role: m.role, content: m.content, timestamp: 0 })),
    { role: "seller" as const, content: sellerMessage, timestamp: 0 },
  ];
  const buyerResponse = await roleplayResponse(
    ctx,
    conversation,
    difficulty || "medium",
    null,
    ""
  );
  return { buyerResponse };
}

export async function previewPersonaPrompt(draft: PersonaDraft, difficulty: string) {
  await getSession();
  const ctx = draftToPersonaContext(draft);
  const systemPrompt = buildPersonaSystemPrompt(ctx, difficulty || "medium");
  return { systemPrompt };
}
