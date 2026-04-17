"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { LevelBadge } from "@/components/gamification/level-badge";
import {
  updateTechnique,
  deleteTechnique,
  createTechnique,
  updateIfThenPattern,
  deleteIfThenPattern,
  createIfThenPattern,
} from "@/actions/modules";

interface IfThen {
  id: string;
  trigger: string;
  response: string;
  context: string | null;
}

interface Technique {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  howToUse: string;
  difficulty: string;
  ifThenPatterns: IfThen[];
  skillProgress: { level: string; avgScore: number; totalReps: number; lastPracticedAt: string | null } | null;
  repetitionCard: { nextReviewAt: string } | null;
}

interface ModuleData {
  id: string;
  name: string;
  description: string | null;
  techniques: Technique[];
  rawNotes: { id: string; source: string | null; createdAt: string }[];
}

const DIFFICULTY_OPTIONS = [
  { key: "easy", label: "Lätt", color: "var(--success)" },
  { key: "medium", label: "Medel", color: "var(--warning)" },
  { key: "hard", label: "Svår", color: "var(--error)" },
];

export function ModuleDetailClient({ module: mod }: { module: ModuleData }) {
  const [expandedTech, setExpandedTech] = useState<string | null>(null);
  const [addingTech, setAddingTech] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-[var(--space-6)] py-[var(--space-8)]">
      <div className="flex items-center gap-[var(--space-2)] text-xs mb-[var(--space-6)]" style={{ color: "var(--text-tertiary)" }}>
        <Link href="/modules" className="hover:underline">Moduler</Link>
        <span>/</span>
        <span style={{ color: "var(--text-secondary)" }}>{mod.name}</span>
      </div>

      <div className="flex items-start justify-between mb-[var(--space-8)]">
        <div>
          <h1
            className="font-heading text-3xl font-semibold"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
          >
            {mod.name}
          </h1>
          <p className="mt-[var(--space-1)] text-sm" style={{ color: "var(--text-tertiary)" }}>
            {mod.techniques.length} tekniker · {mod.rawNotes.length} anteckningsfiler
          </p>
        </div>
        <Link
          href={`/practice?module=${mod.id}`}
          className="flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium transition-all"
          style={{
            background: "var(--accent)",
            color: "var(--text-inverse)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="3" /><circle cx="8" cy="8" r="0.75" fill="currentColor" />
          </svg>
          Öva modul
        </Link>
      </div>

      <div className="flex flex-col gap-[var(--space-3)]">
        {mod.techniques.map((tech) => (
          <TechniqueCard
            key={tech.id}
            technique={tech}
            expanded={expandedTech === tech.id}
            onToggle={() => setExpandedTech(expandedTech === tech.id ? null : tech.id)}
          />
        ))}

        {addingTech ? (
          <NewTechniqueForm
            moduleId={mod.id}
            onCancel={() => setAddingTech(false)}
            onCreated={() => setAddingTech(false)}
          />
        ) : (
          <button
            onClick={() => setAddingTech(true)}
            className="flex items-center justify-center gap-[var(--space-2)] px-[var(--space-5)] py-[var(--space-4)] text-sm font-medium transition-all"
            style={{
              background: "transparent",
              color: "var(--accent)",
              border: "1px dashed var(--border-accent)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Lägg till teknik manuellt
          </button>
        )}
      </div>
    </div>
  );
}

function TechniqueCard({
  technique: tech,
  expanded,
  onToggle,
}: {
  technique: Technique;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteTechnique(tech.id);
    });
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full text-left card px-[var(--space-5)] py-[var(--space-4)]"
      >
        <div className="flex items-center gap-[var(--space-4)]">
          <div
            className="w-1 h-8 rounded-full flex-shrink-0"
            style={{
              background:
                tech.difficulty === "hard"
                  ? "var(--error)"
                  : tech.difficulty === "medium"
                  ? "var(--warning)"
                  : "var(--success)",
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-[var(--space-3)]">
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {tech.name}
              </span>
              <LevelBadge level={tech.skillProgress?.level || "beginner"} />
            </div>
            <div className="text-xs mt-[2px] line-clamp-1" style={{ color: "var(--text-tertiary)" }}>
              {tech.description}
            </div>
          </div>
          <div className="flex items-center gap-[var(--space-4)] flex-shrink-0">
            {tech.skillProgress && tech.skillProgress.totalReps > 0 && (
              <span className="font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>
                {Math.round(tech.skillProgress.avgScore)}%
              </span>
            )}
            {tech.ifThenPatterns.length > 0 && (
              <span
                className="font-mono text-[10px] px-[6px] py-[2px]"
                style={{
                  background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-tertiary)",
                }}
              >
                {tech.ifThenPatterns.length} OM-DÅ
              </span>
            )}
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="var(--text-tertiary)"
              strokeWidth="1.5"
              className="transition-transform"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <div
              className="px-[var(--space-6)] py-[var(--space-5)] ml-[var(--space-5)] border-l-2 mt-[-1px]"
              style={{
                borderColor: "var(--border-default)",
                background: "var(--bg-panel)",
              }}
            >
              <div className="flex flex-col gap-[var(--space-5)]">
                <EditableField
                  label="Namn"
                  value={tech.name}
                  multiline={false}
                  onSave={(v) => updateTechnique(tech.id, { name: v })}
                />
                <EditableField
                  label="Beskrivning"
                  value={tech.description}
                  multiline
                  onSave={(v) => updateTechnique(tech.id, { description: v })}
                />
                <EditableField
                  label="När den används"
                  value={tech.whenToUse}
                  multiline
                  onSave={(v) => updateTechnique(tech.id, { whenToUse: v })}
                />
                <EditableField
                  label="Hur den används"
                  value={tech.howToUse}
                  multiline
                  onSave={(v) => updateTechnique(tech.id, { howToUse: v })}
                />

                <DifficultyField
                  value={tech.difficulty}
                  onSave={(v) => updateTechnique(tech.id, { difficulty: v })}
                />

                <IfThenList techniqueId={tech.id} patterns={tech.ifThenPatterns} />

                <div
                  className="flex items-center justify-between pt-[var(--space-4)]"
                  style={{ borderTop: "1px solid var(--border-subtle)" }}
                >
                  <Link
                    href={`/practice?technique=${tech.id}`}
                    className="inline-flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] text-xs font-medium transition-all"
                    style={{
                      background: "var(--accent-muted)",
                      color: "var(--accent)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-accent)",
                    }}
                  >
                    Öva denna teknik
                  </Link>

                  {confirmDelete ? (
                    <div className="flex items-center gap-[var(--space-2)]">
                      <span className="text-xs" style={{ color: "var(--error)" }}>
                        Säker?
                      </span>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={pending}
                        className="px-[var(--space-3)] py-[var(--space-1)] text-xs"
                        style={{
                          color: "var(--text-tertiary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        Avbryt
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={pending}
                        className="px-[var(--space-3)] py-[var(--space-1)] text-xs font-medium"
                        style={{
                          background: "var(--error)",
                          color: "var(--text-inverse)",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        {pending ? "Raderar..." : "Radera"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs transition-colors"
                      style={{ color: "var(--error)" }}
                    >
                      Radera teknik
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditableField({
  label,
  value,
  multiline,
  onSave,
}: {
  label: string;
  value: string;
  multiline: boolean;
  onSave: (val: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [current, setCurrent] = useState(value);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function start() {
    setDraft(current);
    setEditing(true);
    setErr(null);
  }

  function cancel() {
    setDraft(current);
    setEditing(false);
    setErr(null);
  }

  function save() {
    const v = draft.trim();
    if (!v) {
      setErr("Får inte vara tom");
      return;
    }
    startTransition(async () => {
      try {
        await onSave(v);
        setCurrent(v);
        setEditing(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Kunde inte spara");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-[var(--space-2)]">
        <h4
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          {label}
        </h4>
        {!editing && (
          <button
            onClick={start}
            className="text-[10px] uppercase tracking-wider transition-colors"
            style={{ color: "var(--accent)" }}
          >
            Redigera
          </button>
        )}
      </div>

      {editing ? (
        <div>
          {multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              rows={3}
              disabled={pending}
              className="w-full px-[var(--space-3)] py-[var(--space-2)] text-sm outline-none resize-y"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                minHeight: "80px",
              }}
            />
          ) : (
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              disabled={pending}
              className="w-full px-[var(--space-3)] py-[var(--space-2)] text-sm outline-none"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
              }}
            />
          )}
          {err && <p className="text-xs mt-[var(--space-1)]" style={{ color: "var(--error)" }}>{err}</p>}
          <div className="flex items-center gap-[var(--space-2)] mt-[var(--space-2)]">
            <button
              onClick={save}
              disabled={pending}
              className="px-[var(--space-3)] py-[var(--space-1)] text-xs font-medium disabled:opacity-50"
              style={{
                background: "var(--accent)",
                color: "var(--text-inverse)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {pending ? "Sparar..." : "Spara"}
            </button>
            <button
              onClick={cancel}
              disabled={pending}
              className="px-[var(--space-3)] py-[var(--space-1)] text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
          {current}
        </p>
      )}
    </div>
  );
}

function DifficultyField({ value, onSave }: { value: string; onSave: (v: string) => Promise<unknown> }) {
  const [current, setCurrent] = useState(value);
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    if (next === current) return;
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      try {
        await onSave(next);
      } catch {
        setCurrent(prev);
      }
    });
  }

  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider mb-[var(--space-2)]" style={{ color: "var(--text-tertiary)" }}>
        Svårighet
      </h4>
      <div className="flex gap-[var(--space-2)]">
        {DIFFICULTY_OPTIONS.map((opt) => {
          const active = current === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => change(opt.key)}
              disabled={pending}
              className="px-[var(--space-3)] py-[6px] text-xs transition-all disabled:opacity-50"
              style={{
                background: active ? opt.color : "var(--bg-card)",
                color: active ? "var(--text-inverse)" : "var(--text-tertiary)",
                border: `1px solid ${active ? opt.color : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-full)",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IfThenList({ techniqueId, patterns }: { techniqueId: string; patterns: IfThen[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-[var(--space-3)]">
        <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          OM-DÅ-mönster
        </h4>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--accent)" }}
          >
            + Lägg till
          </button>
        )}
      </div>

      <div className="flex flex-col gap-[var(--space-3)]">
        {patterns.map((p) => (
          <IfThenEditor key={p.id} pattern={p} />
        ))}

        {adding && (
          <IfThenNewForm
            techniqueId={techniqueId}
            onCancel={() => setAdding(false)}
            onCreated={() => setAdding(false)}
          />
        )}

        {patterns.length === 0 && !adding && (
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Inga mönster än — lägg till ditt första OM-DÅ-mönster.
          </p>
        )}
      </div>
    </div>
  );
}

function IfThenEditor({ pattern }: { pattern: IfThen }) {
  const [editing, setEditing] = useState(false);
  const [trigger, setTrigger] = useState(pattern.trigger);
  const [response, setResponse] = useState(pattern.response);
  const [context, setContext] = useState(pattern.context ?? "");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  function save() {
    if (!trigger.trim() || !response.trim()) {
      setErr("Trigger och respons krävs");
      return;
    }
    startTransition(async () => {
      try {
        await updateIfThenPattern(pattern.id, {
          trigger,
          response,
          context: context || null,
        });
        setEditing(false);
        setErr(null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Fel");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await deleteIfThenPattern(pattern.id);
        setDeleted(true);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Fel");
      }
    });
  }

  if (deleted) return null;

  return (
    <div
      className="px-[var(--space-4)] py-[var(--space-3)]"
      style={{
        background: "var(--bg-card)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {editing ? (
        <div className="flex flex-col gap-[var(--space-2)]">
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-[2px]" style={{ color: "var(--accent)" }}>
              OM (trigger)
            </div>
            <textarea
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              rows={2}
              className="w-full px-[var(--space-2)] py-[var(--space-1)] text-xs outline-none resize-y"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
              }}
            />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-[2px]" style={{ color: "var(--success)" }}>
              DÅ (respons)
            </div>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={2}
              className="w-full px-[var(--space-2)] py-[var(--space-1)] text-xs outline-none resize-y"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
              }}
            />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-[2px]" style={{ color: "var(--text-tertiary)" }}>
              Kontext (valfri)
            </div>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full px-[var(--space-2)] py-[var(--space-1)] text-xs outline-none"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
              }}
            />
          </div>
          {err && <p className="text-[10px]" style={{ color: "var(--error)" }}>{err}</p>}
          <div className="flex items-center gap-[var(--space-2)]">
            <button
              onClick={save}
              disabled={pending}
              className="px-[var(--space-3)] py-[2px] text-[10px] font-medium disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--text-inverse)", borderRadius: "var(--radius-sm)" }}
            >
              {pending ? "Sparar..." : "Spara"}
            </button>
            <button
              onClick={() => {
                setTrigger(pattern.trigger);
                setResponse(pattern.response);
                setContext(pattern.context ?? "");
                setEditing(false);
                setErr(null);
              }}
              disabled={pending}
              className="px-[var(--space-3)] py-[2px] text-[10px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-[var(--space-3)] mb-[var(--space-1)]">
            <div className="text-xs flex-1 min-w-0">
              <span style={{ color: "var(--accent)" }}>OM:</span>{" "}
              <span style={{ color: "var(--text-secondary)" }}>{pattern.trigger}</span>
            </div>
            <div className="flex items-center gap-[var(--space-2)] flex-shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "var(--accent)" }}
              >
                Redigera
              </button>
              <button
                onClick={remove}
                disabled={pending}
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "var(--error)" }}
              >
                Radera
              </button>
            </div>
          </div>
          <div className="text-xs mb-[var(--space-1)]">
            <span style={{ color: "var(--success)" }}>DÅ:</span>{" "}
            <span style={{ color: "var(--text-secondary)" }}>{pattern.response}</span>
          </div>
          {pattern.context && (
            <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              {pattern.context}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function IfThenNewForm({
  techniqueId,
  onCancel,
  onCreated,
}: {
  techniqueId: string;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [trigger, setTrigger] = useState("");
  const [response, setResponse] = useState("");
  const [context, setContext] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    if (!trigger.trim() || !response.trim()) {
      setErr("Trigger och respons krävs");
      return;
    }
    startTransition(async () => {
      try {
        await createIfThenPattern(techniqueId, {
          trigger,
          response,
          context: context || undefined,
        });
        onCreated();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Kunde inte skapa");
      }
    });
  }

  return (
    <div
      className="px-[var(--space-4)] py-[var(--space-3)] flex flex-col gap-[var(--space-2)]"
      style={{
        background: "var(--accent-muted)",
        borderRadius: "var(--radius-md)",
        border: "1px dashed var(--border-accent)",
      }}
    >
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-[2px]" style={{ color: "var(--accent)" }}>
          OM (trigger)
        </div>
        <textarea
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          rows={2}
          placeholder="OM kunden säger..."
          autoFocus
          className="w-full px-[var(--space-2)] py-[var(--space-1)] text-xs outline-none resize-y"
          style={{
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
          }}
        />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-[2px]" style={{ color: "var(--success)" }}>
          DÅ (respons)
        </div>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={2}
          placeholder="DÅ svarar jag..."
          className="w-full px-[var(--space-2)] py-[var(--space-1)] text-xs outline-none resize-y"
          style={{
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
          }}
        />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-[2px]" style={{ color: "var(--text-tertiary)" }}>
          Kontext (valfri)
        </div>
        <input
          type="text"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="T.ex. Möte 2, förhandlingsfas"
          className="w-full px-[var(--space-2)] py-[var(--space-1)] text-xs outline-none"
          style={{
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
          }}
        />
      </div>
      {err && <p className="text-[10px]" style={{ color: "var(--error)" }}>{err}</p>}
      <div className="flex items-center gap-[var(--space-2)]">
        <button
          onClick={submit}
          disabled={pending}
          className="px-[var(--space-3)] py-[2px] text-[10px] font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--text-inverse)", borderRadius: "var(--radius-sm)" }}
        >
          {pending ? "Skapar..." : "Skapa mönster"}
        </button>
        <button
          onClick={onCancel}
          disabled={pending}
          className="px-[var(--space-3)] py-[2px] text-[10px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}

function NewTechniqueForm({
  moduleId,
  onCancel,
  onCreated,
}: {
  moduleId: string;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [whenToUse, setWhenToUse] = useState("");
  const [howToUse, setHowToUse] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    if (!name.trim()) {
      setErr("Namn krävs");
      return;
    }
    startTransition(async () => {
      try {
        await createTechnique(moduleId, {
          name,
          description,
          whenToUse,
          howToUse,
          difficulty,
        });
        onCreated();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Kunde inte skapa");
      }
    });
  }

  return (
    <div
      className="px-[var(--space-5)] py-[var(--space-5)] flex flex-col gap-[var(--space-4)]"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-accent)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Ny teknik
        </h3>
        <button
          onClick={onCancel}
          disabled={pending}
          className="text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          Avbryt
        </button>
      </div>

      <InlineInput label="Namn" value={name} setValue={setName} placeholder="t.ex. Proaktiv invändningshantering" />
      <InlineTextarea label="Beskrivning" value={description} setValue={setDescription} />
      <InlineTextarea label="När den används" value={whenToUse} setValue={setWhenToUse} />
      <InlineTextarea label="Hur den används" value={howToUse} setValue={setHowToUse} />

      <div>
        <h4 className="text-xs font-medium uppercase tracking-wider mb-[var(--space-2)]" style={{ color: "var(--text-tertiary)" }}>
          Svårighet
        </h4>
        <div className="flex gap-[var(--space-2)]">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const active = difficulty === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setDifficulty(opt.key)}
                className="px-[var(--space-3)] py-[6px] text-xs transition-all"
                style={{
                  background: active ? opt.color : "var(--bg-card)",
                  color: active ? "var(--text-inverse)" : "var(--text-tertiary)",
                  border: `1px solid ${active ? opt.color : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-full)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {err && <p className="text-xs" style={{ color: "var(--error)" }}>{err}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="px-[var(--space-4)] py-[var(--space-3)] text-sm font-medium disabled:opacity-50"
        style={{ background: "var(--accent)", color: "var(--text-inverse)", borderRadius: "var(--radius-md)" }}
      >
        {pending ? "Skapar..." : "Skapa teknik"}
      </button>
    </div>
  );
}

function InlineInput({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider mb-[var(--space-2)]" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </h4>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full px-[var(--space-3)] py-[var(--space-2)] text-sm outline-none"
        style={{
          background: "var(--bg-input)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
        }}
      />
    </div>
  );
}

function InlineTextarea({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider mb-[var(--space-2)]" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </h4>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        className="w-full px-[var(--space-3)] py-[var(--space-2)] text-sm outline-none resize-y"
        style={{
          background: "var(--bg-input)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          minHeight: "80px",
        }}
      />
    </div>
  );
}
