"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Source =
  | { kind: "meeting"; id: string; label: string; date: string }
  | { kind: "session"; id: string; label: string; date: string }
  | { kind: "standalone"; id: null; label: string; date: string };

interface Reflection {
  id: string;
  question1: string;
  question2: string;
  question3: string;
  question4: string;
  question5: string;
  createdAt: string;
  source: Source;
}

const MEETING_LABELS: Record<string, string> = {
  meeting_1: "Möte 1 — Behovsanalys",
  meeting_2: "Möte 2 — Offert",
  meeting_3: "Möte 3 — Beslut",
};

const SESSION_LABELS: Record<string, string> = {
  mixed: "Blandad övning",
  scenario: "Scenariokort",
  roleplay: "Rollspel",
  recall: "Recall-test",
  simulation: "Mötessimulering",
};

type Filter = "all" | "meeting" | "session" | "standalone";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Alla" },
  { key: "meeting", label: "Från möten" },
  { key: "session", label: "Från övningar" },
  { key: "standalone", label: "Fristående" },
];

export function ReflectionsClient({ reflections }: { reflections: Reflection[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Reflection | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return reflections;
    return reflections.filter((r) => r.source.kind === filter);
  }, [reflections, filter]);

  const counts = useMemo(() => {
    const c = { all: reflections.length, meeting: 0, session: 0, standalone: 0 };
    for (const r of reflections) {
      if (r.source.kind === "meeting") c.meeting++;
      else if (r.source.kind === "session") c.session++;
      else c.standalone++;
    }
    return c;
  }, [reflections]);

  return (
    <div className="max-w-4xl mx-auto px-[var(--space-6)] py-[var(--space-8)]">
      <div className="mb-[var(--space-8)]">
        <h1
          className="font-heading text-3xl font-semibold"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
        >
          Reflektioner
        </h1>
        <p className="mt-[var(--space-1)] text-sm" style={{ color: "var(--text-tertiary)" }}>
          Dina sparade reflektioner — ditt verktyg för att bygga medveten kompetens.
        </p>
      </div>

      <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-6)] flex-wrap">
        {FILTERS.map((f) => {
          const count = counts[f.key];
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[6px] text-xs transition-all"
              style={{
                background: active ? "var(--accent-muted)" : "var(--bg-card)",
                color: active ? "var(--accent)" : "var(--text-tertiary)",
                border: `1px solid ${active ? "var(--border-accent)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-full)",
              }}
            >
              {f.label}
              <span
                className="font-mono text-[10px] px-[6px] py-[1px]"
                style={{
                  background: active ? "var(--accent)" : "var(--bg-elevated)",
                  color: active ? "var(--text-inverse)" : "var(--text-tertiary)",
                  borderRadius: "var(--radius-full)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
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
            style={{ background: "var(--accent-muted)", borderRadius: "var(--radius-xl)" }}
          >
            <svg width="28" height="28" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5">
              <path d="M3 3h10v8H6l-3 3V3z" />
            </svg>
          </div>
          <h3 className="font-heading text-xl font-semibold mb-[var(--space-2)]" style={{ color: "var(--text-primary)" }}>
            {filter === "all" ? "Inga reflektioner än" : "Inga reflektioner i denna kategori"}
          </h3>
          <p className="text-sm max-w-sm" style={{ color: "var(--text-tertiary)" }}>
            Avsluta ett övningspass eller analysera ett möte och reflektera — du bygger medvetenhet genom att skriva.
          </p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="flex flex-col gap-[var(--space-3)]"
        >
          {filtered.map((r) => (
            <motion.button
              key={r.id}
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
              }}
              onClick={() => setOpen(r)}
              className="card text-left px-[var(--space-6)] py-[var(--space-5)]"
            >
              <div className="flex items-start justify-between gap-[var(--space-4)] mb-[var(--space-3)]">
                <div className="flex items-center gap-[var(--space-2)]">
                  <SourceChip source={r.source} />
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {new Date(r.createdAt).toLocaleDateString("sv-SE", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </div>
              <div className="text-sm line-clamp-2" style={{ color: "var(--text-primary)" }}>
                <span style={{ color: "var(--text-tertiary)" }}>Medveten teknik: </span>
                {r.question1 || "—"}
              </div>
              {r.question5 && (
                <div className="text-xs line-clamp-1 mt-[var(--space-2)]" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--accent)" }}>OM-DÅ: </span>
                  {r.question5}
                </div>
              )}
            </motion.button>
          ))}
        </motion.div>
      )}

      <ReflectionViewer reflection={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function SourceChip({ source }: { source: Source }) {
  const label =
    source.kind === "meeting"
      ? MEETING_LABELS[source.label] || source.label
      : source.kind === "session"
      ? SESSION_LABELS[source.label] || source.label
      : "Fristående";

  const color =
    source.kind === "meeting" ? "var(--warning)" : source.kind === "session" ? "var(--accent)" : "var(--text-tertiary)";

  return (
    <span
      className="text-[10px] uppercase tracking-wider px-[var(--space-2)] py-[2px]"
      style={{
        background: "var(--bg-elevated)",
        color,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-full)",
      }}
    >
      {label}
    </span>
  );
}

function ReflectionViewer({ reflection, onClose }: { reflection: Reflection | null; onClose: () => void }) {
  const items =
    reflection === null
      ? []
      : ([
          { label: "Medveten teknik", value: reflection.question1 },
          { label: "Svåraste ögonblicket", value: reflection.question2 },
          { label: "Teknik du borde använt", value: reflection.question3 },
          { label: "3 delar att förbättra", value: reflection.question4 },
          { label: "OM-DÅ till nästa gång", value: reflection.question5 },
        ] as const);

  return (
    <AnimatePresence>
      {reflection && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center px-[var(--space-4)]"
          style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="w-full max-w-xl max-h-[85vh] overflow-y-auto"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <div
              className="flex items-center justify-between px-[var(--space-6)] py-[var(--space-4)]"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div>
                <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-1)]">
                  <SourceChip source={reflection.source} />
                </div>
                <div className="font-heading text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  {new Date(reflection.createdAt).toLocaleDateString("sv-SE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center"
                style={{ color: "var(--text-tertiary)", borderRadius: "var(--radius-sm)" }}
                aria-label="Stäng"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-[var(--space-5)] px-[var(--space-6)] py-[var(--space-5)]">
              {items.map((it) => (
                <div key={it.label}>
                  <div
                    className="text-[10px] uppercase tracking-wider mb-[var(--space-2)]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {it.label}
                  </div>
                  <div className="text-sm whitespace-pre-line" style={{ color: "var(--text-primary)" }}>
                    {it.value || "—"}
                  </div>
                </div>
              ))}
            </div>

            {reflection.source.kind !== "standalone" && reflection.source.id && (
              <div
                className="px-[var(--space-6)] py-[var(--space-4)]"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <Link
                  href={reflection.source.kind === "meeting" ? `/meetings/${reflection.source.id}` : "/practice"}
                  className="text-sm font-medium transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  Öppna {reflection.source.kind === "meeting" ? "mötet" : "övningen"} →
                </Link>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
