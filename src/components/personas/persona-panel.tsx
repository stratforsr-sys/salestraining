"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PanelShell } from "./panel-shell";
import { AccordionSection } from "./accordion-section";
import { InlineField, TextareaField, PillList } from "./form-fields";
import { HiddenMotivesEditor } from "./hidden-motives-editor";
import { DifficultyOverridesEditor } from "./difficulty-overrides-editor";
import { TestChat } from "./test-chat";
import { PromptPreview } from "./prompt-preview";
import {
  getPersona,
  createPersona,
  updatePersona,
  expandPersonaDraft,
  type PersonaDraft,
} from "@/actions/personas";
import { startPracticeSession } from "@/actions/practice";
import { startRoleplay } from "@/actions/roleplay";
import type { BehaviorStructured, HiddenMotive } from "@/lib/gemini";

type PanelMode = { kind: "create" } | { kind: "edit"; id: string };

interface PersonaPanelProps {
  mode: PanelMode | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_DRAFT: PersonaDraft = {
  name: "",
  title: "",
  company: "",
  industry: "",
  companySize: "",
  personality: "",
  mood: null,
  communicationStyle: null,
  behaviorInstructions: null,
  behaviorStructured: null,
  currentSolution: null,
  painPoints: null,
  objections: null,
  hiddenMotives: null,
  difficultyOverrides: null,
  sharedWithTeam: false,
  avatarUrl: null,
};

function parseJsonOrNull<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function PersonaPanel({ mode, onClose, onSaved }: PersonaPanelProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<PersonaDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState("meeting_1");
  const [difficulty, setDifficulty] = useState("medium");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [aiSectionHighlight, setAiSectionHighlight] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState<number | null>(null);

  // Load persona when entering mode
  useEffect(() => {
    if (!mode) return;
    setError(null);
    setDirty(false);
    if (mode.kind === "create") {
      setDraft(EMPTY_DRAFT);
      setSavedId(null);
      return;
    }
    setLoading(true);
    getPersona(mode.id)
      .then((p) => {
        setDraft({
          name: p.name,
          title: p.title,
          company: p.company,
          industry: p.industry,
          companySize: p.companySize,
          personality: p.personality,
          mood: p.mood,
          communicationStyle: p.communicationStyle,
          behaviorInstructions: p.behaviorInstructions,
          behaviorStructured: parseJsonOrNull<BehaviorStructured>(p.behaviorStructured),
          currentSolution: p.currentSolution,
          painPoints: parseJsonOrNull<string[]>(p.painPoints),
          objections: parseJsonOrNull<string[]>(p.objections),
          hiddenMotives: parseJsonOrNull<HiddenMotive[]>(p.hiddenMotives),
          difficultyOverrides: parseJsonOrNull<Record<string, string>>(p.difficultyOverrides),
          sharedWithTeam: p.sharedWithTeam,
          avatarUrl: p.avatarUrl,
        });
        setSavedId(p.id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [mode]);

  const patch = useCallback((p: Partial<PersonaDraft>) => {
    setDraft((prev) => ({ ...prev, ...p }));
    setDirty(true);
  }, []);

  const patchBehaviorStructured = useCallback(
    (key: keyof BehaviorStructured, value: string) => {
      setDraft((prev) => ({
        ...prev,
        behaviorStructured: {
          ...(prev.behaviorStructured || {}),
          [key]: value,
        },
      }));
      setDirty(true);
    },
    []
  );

  const canSave = useMemo(
    () =>
      draft.name.trim().length > 0 &&
      draft.title.trim().length > 0 &&
      draft.industry.trim().length > 0 &&
      draft.personality.trim().length > 0,
    [draft]
  );

  const canExpand = canSave;

  const handleSave = useCallback(async () => {
    if (!mode || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (mode.kind === "create") {
        const created = await createPersona(draft);
        setSavedId(created.id);
      } else {
        await updatePersona(mode.id, draft);
      }
      setDirty(false);
      setSavedFlash(Date.now());
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [mode, canSave, draft, onSaved]);

  const handleExpand = useCallback(async () => {
    if (!canExpand) return;
    setExpanding(true);
    setError(null);
    try {
      const result = await expandPersonaDraft({
        name: draft.name,
        title: draft.title,
        company: draft.company,
        industry: draft.industry,
        companySize: draft.companySize,
        personality: draft.personality,
        behaviorInstructions: draft.behaviorInstructions || undefined,
        behaviorStructured: draft.behaviorStructured || undefined,
        mood: draft.mood || undefined,
        communicationStyle: draft.communicationStyle || undefined,
      });
      setDraft((prev) => ({
        ...prev,
        currentSolution: result.currentSolution ?? prev.currentSolution,
        painPoints: result.painPoints ?? prev.painPoints,
        objections: result.objections ?? prev.objections,
        behaviorStructured:
          result.behaviorStructured || prev.behaviorStructured || null,
      }));
      setDirty(true);
      setAiSectionHighlight(true);
      setTimeout(() => setAiSectionHighlight(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExpanding(false);
    }
  }, [draft, canExpand]);

  const handleStartRoleplay = useCallback(async () => {
    if (!savedId) return;
    setSaving(true);
    try {
      const session = await startPracticeSession("roleplay");
      const rp = await startRoleplay(session.id, savedId, meetingType, difficulty);
      router.push(`/roleplay/${rp.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }, [savedId, meetingType, difficulty, router]);

  const requestClose = useCallback(() => {
    if (dirty) {
      const ok = confirm("Du har osparade andringar. Slanga utkast?");
      if (!ok) return;
    }
    onClose();
  }, [dirty, onClose]);

  const open = mode !== null;
  const isCreate = mode?.kind === "create";
  const isEdit = mode?.kind === "edit";

  const saveStatus = useMemo(() => {
    if (saving) return "Sparar...";
    if (savedFlash && Date.now() - savedFlash < 5000) return "Sparat nyss";
    if (dirty) return "Osparade andringar";
    return null;
  }, [saving, savedFlash, dirty]);

  return (
    <PanelShell
      open={open}
      onRequestClose={requestClose}
      headerLeft={
        <div className="flex items-center gap-[var(--space-2)] min-w-0">
          <span
            className="text-sm font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {isCreate ? "Ny persona" : draft.name || "Persona"}
          </span>
          {saveStatus && (
            <span
              className="text-xs"
              style={{
                color:
                  saveStatus === "Osparade andringar"
                    ? "var(--accent)"
                    : "var(--text-tertiary)",
              }}
            >
              · {saveStatus}
            </span>
          )}
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-[var(--space-3)]">
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {!canSave && "Fyll i obligatoriska falt for att spara"}
          </div>
          <div className="flex items-center gap-[var(--space-2)]">
            <button
              onClick={requestClose}
              className="px-[var(--space-4)] py-[var(--space-2)] text-sm transition-colors"
              style={{
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
              }}
            >
              {isEdit && !dirty ? "Stang" : "Avbryt"}
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || saving || (isEdit && !dirty)}
              className="px-[var(--space-5)] py-[var(--space-2)] text-sm font-medium transition-all disabled:opacity-40"
              style={{
                background: "var(--accent)",
                color: "var(--text-inverse)",
                borderRadius: "var(--radius-md)",
              }}
            >
              {saving ? "Sparar..." : isCreate ? "Spara persona" : "Spara andringar"}
            </button>
          </div>
        </div>
      }
    >
      <div className="px-[var(--space-5)] py-[var(--space-4)] space-y-[var(--space-3)]">
        {loading ? (
          <div
            className="text-sm py-[var(--space-16)] text-center"
            style={{ color: "var(--text-tertiary)" }}
          >
            Laddar persona...
          </div>
        ) : (
          <>
            {/* Start-rollspel action-rad (bara om sparad) */}
            {savedId && (
              <div
                className="flex flex-wrap items-center justify-between gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)]"
                style={{
                  background: "var(--accent-subtle)",
                  border: "1px solid var(--border-accent)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div className="flex items-center gap-[var(--space-3)]">
                  <LabeledSelect
                    label="Motestyp"
                    value={meetingType}
                    onChange={setMeetingType}
                    options={[
                      { value: "cold_call", label: "Coldcall" },
                      { value: "meeting_1", label: "Mote 1" },
                      { value: "meeting_2", label: "Mote 2" },
                      { value: "meeting_3", label: "Mote 3" },
                    ]}
                  />
                  <LabeledSelect
                    label="Svarighet"
                    value={difficulty}
                    onChange={setDifficulty}
                    options={[
                      { value: "easy", label: "Enkel" },
                      { value: "medium", label: "Medel" },
                      { value: "hard", label: "Svar" },
                      { value: "expert", label: "Expert" },
                    ]}
                  />
                </div>
                <button
                  onClick={handleStartRoleplay}
                  disabled={saving || dirty}
                  className="flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium transition-all disabled:opacity-40"
                  style={{
                    background: "var(--accent)",
                    color: "var(--text-inverse)",
                    borderRadius: "var(--radius-sm)",
                  }}
                  title={dirty ? "Spara andringar forst" : "Starta rollspel med denna persona"}
                >
                  <SparkleIcon />
                  Starta rollspel
                </button>
              </div>
            )}

            {/* Section 1: Grundinfo */}
            <AccordionSection
              title="Grundinfo"
              subtitle="Namn, titel, foretag, bransch, storlek, humor, stil"
              defaultOpen
              icon={<IconInfo />}
            >
              <InlineField
                label="Namn"
                value={draft.name}
                onChange={(v) => patch({ name: v })}
                placeholder="Anna Lindstrom"
                required
                max={100}
              />
              <InlineField
                label="Titel"
                value={draft.title}
                onChange={(v) => patch({ title: v })}
                placeholder="IT-chef"
                required
                max={100}
              />
              <InlineField
                label="Foretag"
                value={draft.company}
                onChange={(v) => patch({ company: v })}
                placeholder="TechNord AB"
                max={100}
              />
              <InlineField
                label="Bransch"
                value={draft.industry}
                onChange={(v) => patch({ industry: v })}
                placeholder="IT / SaaS"
                required
                max={100}
              />
              <InlineField
                label="Foretagsstorlek"
                value={draft.companySize}
                onChange={(v) => patch({ companySize: v })}
                placeholder="50-200 anstallda"
                max={100}
              />
              <InlineField
                label="Humor idag"
                value={draft.mood || ""}
                onChange={(v) => patch({ mood: v || null })}
                placeholder="Ex: Tidspressad och lite irriterad"
                max={200}
              />
              <InlineField
                label="Stil"
                value={draft.communicationStyle || ""}
                onChange={(v) => patch({ communicationStyle: v || null })}
                placeholder="Ex: Kort och saklig, inga smaprat"
                max={200}
              />
            </AccordionSection>

            {/* Section 2: Personlighet & beteende */}
            <AccordionSection
              title="Personlighet & beteende"
              subtitle="Hur personan svarar, vad som triggar, fritext-instruktioner"
              defaultOpen={isCreate}
              icon={<IconBrain />}
            >
              <TextareaField
                label="Personlighet"
                value={draft.personality}
                onChange={(v) => patch({ personality: v })}
                placeholder="Teknisk, detaljorienterad, ifragasatter pastaenden..."
                rows={3}
                max={500}
                required
              />

              <div className="mt-[var(--space-4)] space-y-[var(--space-1)]">
                <div
                  className="text-xs font-medium uppercase tracking-wider mb-[var(--space-1)]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Beteende — strukturerat
                </div>
                <TextareaField
                  label="Hur du svarar"
                  value={draft.behaviorStructured?.howYouReply || ""}
                  onChange={(v) => patchBehaviorStructured("howYouReply", v)}
                  placeholder="Ex: En mening i taget. Inga langa monologer."
                  rows={2}
                  max={2000}
                />
                <TextareaField
                  label="Vad du vill veta"
                  value={draft.behaviorStructured?.whatYouWantToKnow || ""}
                  onChange={(v) => patchBehaviorStructured("whatYouWantToKnow", v)}
                  placeholder="Ex: ROI, integrationer, var data lagras"
                  rows={2}
                  max={2000}
                />
                <TextareaField
                  label="Vad som triggar negativt"
                  value={draft.behaviorStructured?.whatTriggersYouNegatively || ""}
                  onChange={(v) =>
                    patchBehaviorStructured("whatTriggersYouNegatively", v)
                  }
                  placeholder="Ex: Jargong, falska pastaenden, for snabba avslut"
                  rows={2}
                  max={2000}
                />
                <TextareaField
                  label="Dolda motiv / mandat (hint)"
                  value={draft.behaviorStructured?.hiddenMotivesHint || ""}
                  onChange={(v) => patchBehaviorStructured("hiddenMotivesHint", v)}
                  placeholder="Ex: Har inte mandat att signera men vill inte erkanna det"
                  rows={2}
                  max={2000}
                  help="Detta ar bara en ledtrad. Lagg konkreta dolda motiv i sektion 'Dolda motiv' nedan."
                />
              </div>

              <div className="mt-[var(--space-4)]">
                <TextareaField
                  label="Avancerat — fri instruktionstext"
                  value={draft.behaviorInstructions || ""}
                  onChange={(v) => patch({ behaviorInstructions: v || null })}
                  placeholder="Fri text som skickas direkt till AI:n. Anvand sparsamt."
                  rows={4}
                  max={2000}
                />
              </div>

              <div className="mt-[var(--space-4)] flex items-center justify-between gap-[var(--space-3)]">
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Generera nuvarande losning, pain points och invandningar automatiskt.
                </div>
                <button
                  type="button"
                  onClick={handleExpand}
                  disabled={!canExpand || expanding}
                  className="flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium transition-all disabled:opacity-40 shrink-0"
                  style={{
                    background: "var(--accent)",
                    color: "var(--text-inverse)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <SparkleIcon />
                  {expanding ? "Genererar..." : "Generera med AI"}
                </button>
              </div>
            </AccordionSection>

            {/* Section 3: AI-genererat innehall */}
            <AccordionSection
              title="AI-genererat innehall"
              subtitle="Nuvarande losning, pain points, invandningar"
              icon={<IconSparkle />}
              highlight={aiSectionHighlight}
            >
              <TextareaField
                label="Nuvarande losning"
                value={draft.currentSolution || ""}
                onChange={(v) => patch({ currentSolution: v || null })}
                placeholder="Vad anvander personan idag?"
                rows={2}
                max={500}
              />
              <PillList
                label="Pain points"
                items={draft.painPoints || []}
                onChange={(items) => patch({ painPoints: items.length > 0 ? items : null })}
                placeholder="Ex: Manuell rapportering tar 4h/vecka"
                max={10}
                maxLength={300}
              />
              <PillList
                label="Typiska invandningar"
                items={draft.objections || []}
                onChange={(items) => patch({ objections: items.length > 0 ? items : null })}
                placeholder="Ex: Vi har for lite data for att motivera det"
                max={10}
                maxLength={300}
              />
            </AccordionSection>

            {/* Section 4: Dolda motiv */}
            <AccordionSection
              title="Dolda motiv"
              subtitle="Hemliga fakta som bara avslojas vid ratt trigger"
              status={`${draft.hiddenMotives?.length || 0} / 5`}
              icon={<IconLock />}
            >
              <HiddenMotivesEditor
                motives={draft.hiddenMotives || []}
                onChange={(m) => patch({ hiddenMotives: m.length > 0 ? m : null })}
              />
            </AccordionSection>

            {/* Section 5: Svarighetsgrader */}
            <AccordionSection
              title="Svarighetsgrader"
              subtitle="Extra beteende per svarighet utover den globala baselinen"
              status={`${Object.keys(draft.difficultyOverrides || {}).length} overrides`}
              icon={<IconGauge />}
            >
              <DifficultyOverridesEditor
                overrides={draft.difficultyOverrides || {}}
                onChange={(d) =>
                  patch({ difficultyOverrides: Object.keys(d).length > 0 ? d : null })
                }
              />
            </AccordionSection>

            {/* Section 6: Testa personan */}
            <AccordionSection
              title="Testa personan"
              subtitle="Prata med personan innan du sparar"
              icon={<IconChat />}
            >
              <TestChat draft={draft} />
            </AccordionSection>

            {/* Section 7: Prompt-preview */}
            <AccordionSection
              title="Prompt-preview"
              subtitle="Exakta system-prompten som skickas till AI:n"
              icon={<IconCode />}
            >
              <PromptPreview draft={draft} />
            </AccordionSection>

            {error && (
              <div
                className="px-[var(--space-3)] py-[var(--space-2)] text-sm"
                style={{
                  background: "var(--error-muted)",
                  color: "var(--error)",
                  border: "1px solid var(--error)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </PanelShell>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label
      className="flex items-center gap-[var(--space-2)] text-xs"
      style={{ color: "var(--text-tertiary)" }}
    >
      <span>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-[var(--space-2)] py-[4px] text-xs outline-none"
        style={{
          background: "var(--bg-input)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SparkleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5L8 2z" strokeLinejoin="round" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7v4M8 5v.01" strokeLinecap="round" />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 4a2 2 0 014 0v8a2 2 0 01-4 0" />
      <path d="M7 4a2 2 0 114 0v8a2 2 0 11-4 0" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5L8 2z" strokeLinejoin="round" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3.5" y="7" width="9" height="6" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
    </svg>
  );
}

function IconGauge() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 11a5 5 0 0110 0" />
      <path d="M8 11l3-3" strokeLinecap="round" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 4a2 2 0 012-2h6a2 2 0 012 2v5a2 2 0 01-2 2H7l-3 3v-3a2 2 0 01-1-2V4z" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 5L3 8l3 3M10 5l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
