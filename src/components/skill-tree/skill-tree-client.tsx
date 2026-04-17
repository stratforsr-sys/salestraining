"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LevelBadge } from "@/components/gamification/level-badge";

type Level = "beginner" | "advanced" | "competent" | "skilled" | "expert";

interface Technique {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  howToUse: string;
  difficulty: string;
  level: string;
  totalReps: number;
  avgScore: number;
  bestScore: number;
  totalXp: number;
  consecutiveHighScores: number;
  lastPracticedAt: string | null;
  nextReviewAt: string | null;
  patternCount: number;
}

interface Module {
  id: string;
  name: string;
  description: string | null;
  techniques: Technique[];
}

const LEVEL_ORDER: Level[] = ["beginner", "advanced", "competent", "skilled", "expert"];

const LEVEL_CONFIG: Record<Level, { label: string; color: string; bg: string; ring: string }> = {
  beginner: {
    label: "Nybörjare",
    color: "var(--level-beginner)",
    bg: "rgba(107, 114, 128, 0.14)",
    ring: "rgba(107, 114, 128, 0.45)",
  },
  advanced: {
    label: "Avancerad",
    color: "var(--level-advanced)",
    bg: "rgba(59, 130, 246, 0.16)",
    ring: "rgba(59, 130, 246, 0.55)",
  },
  competent: {
    label: "Kompetent",
    color: "var(--level-competent)",
    bg: "rgba(139, 92, 246, 0.16)",
    ring: "rgba(139, 92, 246, 0.55)",
  },
  skilled: {
    label: "Skicklig",
    color: "var(--level-skilled)",
    bg: "rgba(245, 158, 11, 0.16)",
    ring: "rgba(245, 158, 11, 0.6)",
  },
  expert: {
    label: "REFLEX",
    color: "var(--level-expert)",
    bg: "rgba(239, 68, 68, 0.16)",
    ring: "rgba(239, 68, 68, 0.6)",
  },
};

function toLevel(raw: string): Level {
  if (LEVEL_ORDER.includes(raw as Level)) return raw as Level;
  return "beginner";
}

export function SkillTreeClient({ modules }: { modules: Module[] }) {
  const [filter, setFilter] = useState<"all" | Level>("all");
  const [selected, setSelected] = useState<{ tech: Technique; moduleId: string; moduleName: string } | null>(null);

  const stats = useMemo(() => {
    const all = modules.flatMap((m) => m.techniques);
    const byLevel: Record<Level, number> = {
      beginner: 0,
      advanced: 0,
      competent: 0,
      skilled: 0,
      expert: 0,
    };
    for (const t of all) {
      const lvl = toLevel(t.level);
      byLevel[lvl]++;
    }
    const totalXp = all.reduce((s, t) => s + t.totalXp, 0);
    const totalReps = all.reduce((s, t) => s + t.totalReps, 0);
    return {
      total: all.length,
      byLevel,
      totalXp,
      totalReps,
    };
  }, [modules]);

  const filteredModules = useMemo(() => {
    if (filter === "all") return modules;
    return modules
      .map((m) => ({
        ...m,
        techniques: m.techniques.filter((t) => toLevel(t.level) === filter),
      }))
      .filter((m) => m.techniques.length > 0);
  }, [modules, filter]);

  const hasAnyTechnique = stats.total > 0;

  return (
    <div className="max-w-6xl mx-auto px-[var(--space-6)] py-[var(--space-8)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-[var(--space-6)] mb-[var(--space-8)] flex-wrap">
        <div>
          <h1
            className="font-heading text-3xl font-semibold"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
          >
            Skill Tree
          </h1>
          <p className="mt-[var(--space-1)] text-sm" style={{ color: "var(--text-tertiary)" }}>
            Visuell karta över dina tekniker och deras mognad — klicka för detaljer.
          </p>
        </div>
        <Link
          href="/modules"
          className="flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium transition-all"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            color: "var(--text-secondary)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Till moduler
        </Link>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--space-3)] mb-[var(--space-6)]">
        <StatTile label="Tekniker" value={stats.total.toString()} hint={`${modules.length} moduler`} />
        <StatTile label="Total XP" value={stats.totalXp.toLocaleString("sv-SE")} hint="från övningar" />
        <StatTile label="Repetitioner" value={stats.totalReps.toString()} hint="kumulativt" />
        <StatTile
          label="REFLEX"
          value={stats.byLevel.expert.toString()}
          hint="mästrade tekniker"
          accent="expert"
        />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-6)] flex-wrap">
        <FilterChip
          label="Alla"
          count={stats.total}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        {LEVEL_ORDER.map((lvl) => (
          <FilterChip
            key={lvl}
            label={LEVEL_CONFIG[lvl].label}
            count={stats.byLevel[lvl]}
            color={LEVEL_CONFIG[lvl].color}
            active={filter === lvl}
            onClick={() => setFilter(lvl)}
          />
        ))}
      </div>

      {/* Tree */}
      {!hasAnyTechnique ? (
        <EmptyState />
      ) : filteredModules.length === 0 ? (
        <div
          className="flex items-center justify-center py-[var(--space-12)] text-sm"
          style={{
            background: "var(--bg-card)",
            border: "1px dashed var(--border-default)",
            borderRadius: "var(--radius-lg)",
            color: "var(--text-tertiary)",
          }}
        >
          Inga tekniker på den här nivån ännu.
        </div>
      ) : (
        <motion.div
          className="grid gap-[var(--space-4)]"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {filteredModules.map((mod) => (
            <ModuleBranch
              key={mod.id}
              mod={mod}
              onSelect={(tech) =>
                setSelected({ tech, moduleId: mod.id, moduleName: mod.name })
              }
            />
          ))}
        </motion.div>
      )}

      {/* Legend */}
      {hasAnyTechnique && (
        <div
          className="mt-[var(--space-8)] px-[var(--space-5)] py-[var(--space-4)] flex items-center gap-[var(--space-5)] flex-wrap"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
            Nivåer:
          </span>
          {LEVEL_ORDER.map((lvl) => (
            <div key={lvl} className="flex items-center gap-[var(--space-2)]">
              <TechniqueDot level={lvl} size={14} static />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {LEVEL_CONFIG[lvl].label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <TechniqueDrawer
            tech={selected.tech}
            moduleId={selected.moduleId}
            moduleName={selected.moduleName}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   MODULE BRANCH — trunk + technique nodes
   ============================================================ */

function ModuleBranch({
  mod,
  onSelect,
}: {
  mod: Module;
  onSelect: (tech: Technique) => void;
}) {
  const levelCounts = useMemo(() => {
    const counts: Record<Level, number> = {
      beginner: 0,
      advanced: 0,
      competent: 0,
      skilled: 0,
      expert: 0,
    };
    for (const t of mod.techniques) {
      counts[toLevel(t.level)]++;
    }
    return counts;
  }, [mod]);

  const topLevel: Level = useMemo(() => {
    for (let i = LEVEL_ORDER.length - 1; i >= 0; i--) {
      if (levelCounts[LEVEL_ORDER[i]] > 0) return LEVEL_ORDER[i];
    }
    return "beginner";
  }, [levelCounts]);

  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      className="px-[var(--space-5)] py-[var(--space-5)]"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      {/* Module header */}
      <div className="flex items-center justify-between gap-[var(--space-3)] mb-[var(--space-4)] flex-wrap">
        <div className="flex items-center gap-[var(--space-3)]">
          <div
            className="w-10 h-10 flex items-center justify-center flex-shrink-0"
            style={{
              background: "var(--accent-subtle)",
              border: "1px solid var(--border-accent)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5">
              <path d="M2.5 3C2.5 2.5 3 2 4 2h3.5v12H4c-1 0-1.5-.5-1.5-1V3z" />
              <path d="M7.5 2H12c1 0 1.5.5 1.5 1v10c0 .5-.5 1-1.5 1H7.5V2z" />
            </svg>
          </div>
          <div>
            <Link
              href={`/modules/${mod.id}`}
              className="text-base font-medium hover:underline"
              style={{ color: "var(--text-primary)" }}
            >
              {mod.name}
            </Link>
            <div
              className="text-xs mt-[2px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {mod.techniques.length} tekniker
            </div>
          </div>
        </div>
        <LevelBadge level={topLevel} size="sm" />
      </div>

      {/* Nodes grid */}
      <div
        className="grid gap-[var(--space-3)]"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
      >
        {mod.techniques.map((t) => (
          <TechniqueNode key={t.id} tech={t} onClick={() => onSelect(t)} />
        ))}
      </div>
    </motion.section>
  );
}

/* ============================================================
   TECHNIQUE NODE — a single card
   ============================================================ */

function TechniqueNode({
  tech,
  onClick,
}: {
  tech: Technique;
  onClick: () => void;
}) {
  const lvl = toLevel(tech.level);
  const cfg = LEVEL_CONFIG[lvl];
  const progressPct = Math.min(100, Math.round(tech.avgScore));

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start text-left px-[var(--space-3)] py-[var(--space-3)] transition-all hover:-translate-y-[1px]"
      style={{
        background: "var(--bg-elevated)",
        border: `1px solid ${cfg.ring}`,
        borderRadius: "var(--radius-md)",
        boxShadow: lvl === "expert" ? `0 0 18px ${cfg.bg}` : "none",
      }}
    >
      <div className="flex items-center justify-between w-full mb-[var(--space-2)]">
        <TechniqueDot level={lvl} />
        {tech.totalReps > 0 && (
          <span
            className="text-[10px] font-mono"
            style={{ color: "var(--text-tertiary)" }}
          >
            {tech.totalReps}x
          </span>
        )}
      </div>
      <div
        className="text-xs font-medium leading-snug line-clamp-2"
        style={{ color: "var(--text-primary)" }}
      >
        {tech.name}
      </div>
      <div className="w-full mt-[var(--space-2)]">
        <div
          className="w-full h-[3px] overflow-hidden"
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-full)",
          }}
        >
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              background: cfg.color,
              transition: "width 300ms ease",
            }}
          />
        </div>
      </div>
    </button>
  );
}

function TechniqueDot({
  level,
  size = 18,
  static: isStatic = false,
}: {
  level: Level;
  size?: number;
  static?: boolean;
}) {
  const cfg = LEVEL_CONFIG[level];
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: cfg.bg,
        border: `1.5px solid ${cfg.color}`,
        borderRadius: "var(--radius-full)",
        boxShadow: !isStatic && level === "expert" ? `0 0 12px ${cfg.color}66` : "none",
      }}
    >
      {level === "expert" && (
        <svg width={Math.max(8, size - 8)} height={Math.max(8, size - 8)} viewBox="0 0 10 10" fill={cfg.color}>
          <path d="M5 0l1.5 3.5L10 5 6.5 6.5 5 10 3.5 6.5 0 5l3.5-1.5z" />
        </svg>
      )}
    </span>
  );
}

/* ============================================================
   STAT TILE
   ============================================================ */

function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: Level;
}) {
  const border = accent ? `1px solid ${LEVEL_CONFIG[accent].ring}` : "1px solid var(--border-subtle)";
  return (
    <div
      className="px-[var(--space-4)] py-[var(--space-3)]"
      style={{
        background: "var(--bg-card)",
        border,
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </div>
      <div
        className="text-xl font-heading font-semibold mt-[2px]"
        style={{ color: accent ? LEVEL_CONFIG[accent].color : "var(--text-primary)" }}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[11px] mt-[2px]" style={{ color: "var(--text-tertiary)" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   FILTER CHIP
   ============================================================ */

function FilterChip({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-1)] text-xs font-medium transition-all"
      style={{
        background: active ? "var(--accent-muted)" : "var(--bg-card)",
        border: `1px solid ${active ? "var(--border-accent)" : "var(--border-subtle)"}`,
        color: active ? "var(--accent)" : "var(--text-secondary)",
        borderRadius: "var(--radius-full)",
      }}
    >
      {color && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "var(--radius-full)",
            background: color,
            boxShadow: `0 0 0 1px ${color}55`,
          }}
        />
      )}
      <span>{label}</span>
      <span
        className="font-mono text-[10px]"
        style={{ color: active ? "var(--accent)" : "var(--text-tertiary)" }}
      >
        {count}
      </span>
    </button>
  );
}

/* ============================================================
   DRAWER — technique detail
   ============================================================ */

function TechniqueDrawer({
  tech,
  moduleId,
  moduleName,
  onClose,
}: {
  tech: Technique;
  moduleId: string;
  moduleName: string;
  onClose: () => void;
}) {
  const lvl = toLevel(tech.level);
  const cfg = LEVEL_CONFIG[lvl];
  const lastPracticed = tech.lastPracticedAt
    ? new Date(tech.lastPracticedAt).toLocaleDateString("sv-SE", {
        day: "numeric",
        month: "short",
      })
    : "Aldrig";
  const nextReview = tech.nextReviewAt
    ? new Date(tech.nextReviewAt).toLocaleDateString("sv-SE", {
        day: "numeric",
        month: "short",
      })
    : "—";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="fixed right-0 top-0 z-50 h-full w-full sm:max-w-md overflow-y-auto"
        style={{
          background: "var(--bg-card)",
          borderLeft: "1px solid var(--border-default)",
        }}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-[var(--space-5)] py-[var(--space-4)]"
          style={{
            background: "var(--bg-card)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-[var(--space-3)]">
            <TechniqueDot level={lvl} size={22} />
            <div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Teknik
              </div>
              <LevelBadge level={lvl} size="sm" />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Stäng"
            className="w-8 h-8 flex items-center justify-center transition-colors"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="px-[var(--space-5)] py-[var(--space-5)]">
          <h2
            className="font-heading text-xl font-semibold mb-[var(--space-2)]"
            style={{ color: "var(--text-primary)" }}
          >
            {tech.name}
          </h2>
          <Link
            href={`/modules/${moduleId}`}
            className="text-xs hover:underline"
            style={{ color: cfg.color }}
          >
            {moduleName}
          </Link>

          {tech.description && (
            <p
              className="mt-[var(--space-4)] text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {tech.description}
            </p>
          )}

          {/* Stats grid */}
          <div
            className="mt-[var(--space-5)] grid grid-cols-2 gap-[var(--space-3)] p-[var(--space-4)]"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <DrawerStat label="Repetitioner" value={tech.totalReps.toString()} />
            <DrawerStat label="Medel" value={tech.totalReps > 0 ? `${Math.round(tech.avgScore)}` : "—"} />
            <DrawerStat label="Bästa" value={tech.totalReps > 0 ? `${Math.round(tech.bestScore)}` : "—"} />
            <DrawerStat label="XP" value={tech.totalXp.toLocaleString("sv-SE")} />
            <DrawerStat label="Senast tränad" value={lastPracticed} />
            <DrawerStat label="Nästa repetition" value={nextReview} />
          </div>

          {/* When to use */}
          {tech.whenToUse && (
            <DrawerSection title="När ska den användas">
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {tech.whenToUse}
              </p>
            </DrawerSection>
          )}

          {/* How to use */}
          {tech.howToUse && (
            <DrawerSection title="Så gör du">
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {tech.howToUse}
              </p>
            </DrawerSection>
          )}

          {/* Progress toward next level */}
          <DrawerSection title="Nästa nivå">
            <NextLevelProgress lvl={lvl} consecutive={tech.consecutiveHighScores} />
          </DrawerSection>

          {/* CTA */}
          <Link
            href={`/practice?focus=${tech.id}`}
            className="mt-[var(--space-5)] flex items-center justify-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-3)] text-sm font-medium transition-all w-full"
            style={{
              background: "var(--accent)",
              color: "var(--text-inverse)",
              borderRadius: "var(--radius-md)",
            }}
          >
            Öva denna teknik
          </Link>
          <Link
            href={`/modules/${moduleId}`}
            className="mt-[var(--space-2)] flex items-center justify-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium transition-all w-full"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-md)",
            }}
          >
            Öppna modulen
          </Link>
        </div>
      </motion.aside>
    </>
  );
}

function DrawerStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </div>
      <div className="text-sm font-medium mt-[2px]" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-[var(--space-5)]">
      <div
        className="text-[11px] uppercase tracking-wider mb-[var(--space-2)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function NextLevelProgress({
  lvl,
  consecutive,
}: {
  lvl: Level;
  consecutive: number;
}) {
  if (lvl === "expert") {
    return (
      <div
        className="px-[var(--space-3)] py-[var(--space-2)] text-sm"
        style={{
          background: LEVEL_CONFIG.expert.bg,
          border: `1px solid ${LEVEL_CONFIG.expert.ring}`,
          borderRadius: "var(--radius-md)",
          color: LEVEL_CONFIG.expert.color,
        }}
      >
        REFLEX-nivå — teknik mästrad.
      </div>
    );
  }

  const nextIdx = LEVEL_ORDER.indexOf(lvl) + 1;
  const nextLvl = LEVEL_ORDER[nextIdx];
  const nextCfg = LEVEL_CONFIG[nextLvl];
  const required = 3;
  const pct = Math.min(100, Math.round((consecutive / required) * 100));

  return (
    <div>
      <div className="flex items-center justify-between mb-[var(--space-2)]">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Till <span style={{ color: nextCfg.color, fontWeight: 500 }}>{nextCfg.label}</span>
        </span>
        <span className="font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>
          {consecutive}/{required}
        </span>
      </div>
      <div
        className="w-full h-[6px] overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-full)",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: nextCfg.color,
            transition: "width 300ms ease",
          }}
        />
      </div>
      <p className="mt-[var(--space-2)] text-xs" style={{ color: "var(--text-tertiary)" }}>
        Klara {required} övningar i rad med 80+ poäng för att gå upp.
      </p>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */

function EmptyState() {
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
          <path d="M8 2v12M3 6l5-4 5 4M4.5 10.5l3.5-2.5 3.5 2.5" />
        </svg>
      </div>
      <h3
        className="font-heading text-xl font-semibold mb-[var(--space-2)]"
        style={{ color: "var(--text-primary)" }}
      >
        Inga tekniker ännu
      </h3>
      <p
        className="text-sm max-w-xs mb-[var(--space-6)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        Skapa din första modul så extraherar AI:n tekniker som visas här som en karta.
      </p>
      <Link
        href="/modules/new"
        className="flex items-center gap-[var(--space-2)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium transition-all"
        style={{
          background: "var(--accent)",
          color: "var(--text-inverse)",
          borderRadius: "var(--radius-md)",
        }}
      >
        Skapa modul
      </Link>
    </div>
  );
}
