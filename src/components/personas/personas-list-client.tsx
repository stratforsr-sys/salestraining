"use client";

import { useState, useTransition, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PersonaCard } from "./persona-card";
import { PersonaPanel } from "./persona-panel";
import {
  archivePersona,
  clonePersona,
  listPersonas,
  type PersonaListItem,
} from "@/actions/personas";
import { startPracticeSession } from "@/actions/practice";
import { startRoleplay } from "@/actions/roleplay";

type PanelMode = { kind: "create" } | { kind: "edit"; id: string } | null;
type Filter = "mine" | "team" | "defaults" | "all";

interface Props {
  initialPersonas: PersonaListItem[];
  initialPanelId?: string | null;
}

export function PersonasListClient({ initialPersonas, initialPanelId }: Props) {
  const router = useRouter();
  const [personas, setPersonas] = useState<PersonaListItem[]>(initialPersonas);
  const [filter, setFilter] = useState<Filter>(
    initialPersonas.some((p) => p.isMine) ? "mine" : "all"
  );
  const [panelMode, setPanelMode] = useState<PanelMode>(
    initialPanelId ? { kind: "edit", id: initialPanelId } : null
  );
  const [starting, setStarting] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Keyboard: "n" to open new persona panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (panelMode) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setPanelMode({ kind: "create" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelMode]);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const fresh = await listPersonas();
      setPersonas(fresh);
    });
  }, []);

  const filtered = useMemo(() => {
    switch (filter) {
      case "mine":
        return personas.filter((p) => p.isMine);
      case "team":
        return personas.filter((p) => p.sharedWithTeam && !p.isMine);
      case "defaults":
        return personas.filter((p) => p.isDefault);
      case "all":
        return personas;
    }
  }, [personas, filter]);

  const counts = useMemo(
    () => ({
      mine: personas.filter((p) => p.isMine).length,
      team: personas.filter((p) => p.sharedWithTeam && !p.isMine).length,
      defaults: personas.filter((p) => p.isDefault).length,
      all: personas.length,
    }),
    [personas]
  );

  const handleEdit = useCallback((id: string) => {
    setPanelMode({ kind: "edit", id });
  }, []);

  const handleStart = useCallback(
    async (id: string) => {
      setStarting(id);
      setErrorMsg(null);
      try {
        const session = await startPracticeSession("roleplay");
        const rp = await startRoleplay(session.id, id, "meeting_1", "medium");
        router.push(`/roleplay/${rp.id}`);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setStarting(null);
      }
    },
    [router]
  );

  const handleClone = useCallback(
    async (id: string) => {
      try {
        const cloned = await clonePersona(id);
        refresh();
        setPanelMode({ kind: "edit", id: cloned.id });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
    },
    [refresh]
  );

  const handleArchive = useCallback(
    async (id: string) => {
      const p = personas.find((x) => x.id === id);
      const name = p?.name || "personan";
      if (!confirm(`Arkivera ${name}? Befintliga rollspel paverkas inte.`)) return;
      try {
        await archivePersona(id);
        setPersonas((prev) => prev.filter((x) => x.id !== id));
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
    },
    [personas]
  );

  const handlePanelSaved = useCallback(() => {
    refresh();
  }, [refresh]);

  const handlePanelClose = useCallback(() => {
    setPanelMode(null);
    if (initialPanelId) {
      // If we came in via deep-link, keep the URL clean
      router.replace("/personas");
    }
  }, [router, initialPanelId]);

  return (
    <div className="max-w-6xl mx-auto px-[var(--space-6)] py-[var(--space-8)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-[var(--space-4)] mb-[var(--space-6)]">
        <div>
          <h1
            className="font-heading text-3xl font-semibold"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
          >
            Personas
          </h1>
          <p
            className="mt-[var(--space-1)] text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            {personas.length} kopare tillgangliga · skapa egna eller utga fran defaults.
          </p>
        </div>
        <div className="flex items-center gap-[var(--space-2)]">
          <button
            onClick={() => setPanelMode({ kind: "create" })}
            className="flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium transition-all"
            style={{
              background: "var(--accent)",
              color: "var(--text-inverse)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <PlusIcon />
            Ny persona
          </button>
        </div>
      </div>

      {/* Filter segment */}
      <div
        className="inline-flex items-center p-[4px] mb-[var(--space-6)]"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        }}
      >
        {(
          [
            { key: "mine", label: "Mina", count: counts.mine },
            { key: "team", label: "Team", count: counts.team },
            { key: "defaults", label: "Defaults", count: counts.defaults },
            { key: "all", label: "Alla", count: counts.all },
          ] as const
        ).map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-[var(--space-3)] py-[var(--space-1)] text-sm transition-all"
              style={{
                background: active ? "var(--bg-elevated)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                border: `1px solid ${active ? "var(--border-default)" : "transparent"}`,
                borderRadius: "var(--radius-sm)",
              }}
            >
              {f.label}
              <span
                className="ml-[var(--space-2)] text-xs"
                style={{ color: active ? "var(--text-tertiary)" : "var(--text-tertiary)", opacity: 0.7 }}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div
          className="mb-[var(--space-4)] px-[var(--space-4)] py-[var(--space-3)] text-sm"
          style={{
            background: "var(--error-muted)",
            color: "var(--error)",
            border: "1px solid var(--error)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Grid / empty */}
      {filtered.length === 0 ? (
        <EmptyState filter={filter} onCreate={() => setPanelMode({ kind: "create" })} />
      ) : (
        <motion.div
          layout
          className="grid gap-[var(--space-4)] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((p) => (
              <motion.div key={p.id} layout>
                <PersonaCard
                  persona={p}
                  onEdit={handleEdit}
                  onStart={handleStart}
                  onClone={handleClone}
                  onArchive={handleArchive}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {starting && (
        <div
          className="fixed bottom-[var(--space-6)] right-[var(--space-6)] px-[var(--space-4)] py-[var(--space-3)] text-sm z-[90]"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            color: "var(--text-secondary)",
          }}
        >
          Startar rollspel...
        </div>
      )}

      <PersonaPanel mode={panelMode} onClose={handlePanelClose} onSaved={handlePanelSaved} />
    </div>
  );
}

function EmptyState({
  filter,
  onCreate,
}: {
  filter: Filter;
  onCreate: () => void;
}) {
  const mineEmpty = filter === "mine";
  return (
    <div
      className="flex flex-col items-center justify-center py-[var(--space-16)] text-center"
      style={{
        background: "var(--bg-card)",
        borderRadius: "var(--radius-xl)",
        border: "1px dashed var(--border-default)",
      }}
    >
      <div
        className="w-16 h-16 flex items-center justify-center mb-[var(--space-5)]"
        style={{
          background: "var(--accent-subtle)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5">
          <circle cx="6" cy="5" r="2.5" />
          <path d="M1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
          <circle cx="11" cy="5.5" r="1.8" />
          <path d="M14.5 14c0-2 -1.5-3.2-3.5-3.5" />
        </svg>
      </div>
      <h3
        className="font-heading text-xl font-semibold mb-[var(--space-2)]"
        style={{ color: "var(--text-primary)" }}
      >
        {mineEmpty ? "Du har inga egna personas an" : "Inga personas i denna vy"}
      </h3>
      <p
        className="text-sm max-w-xs mb-[var(--space-6)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {mineEmpty
          ? "Skapa fran scratch eller klona en default-persona som utgangspunkt."
          : "Byt filter eller skapa en ny persona."}
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-[var(--space-2)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium transition-all"
        style={{
          background: "var(--accent)",
          color: "var(--text-inverse)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <PlusIcon />
        Ny persona
      </button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2v8M2 6h8" strokeLinecap="round" />
    </svg>
  );
}
