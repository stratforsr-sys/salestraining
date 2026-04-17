"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

type Category = "streak" | "skill" | "volume" | "milestone";

interface Item {
  name: string;
  description: string;
  icon: string;
  category: Category;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: { current: number; target: number };
}

const CATEGORY_LABELS: Record<Category, string> = {
  streak: "Streak",
  skill: "Skicklighet",
  volume: "Volym",
  milestone: "Milstolpar",
};

type Filter = "all" | Category;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Alla" },
  { key: "streak", label: "Streak" },
  { key: "skill", label: "Skicklighet" },
  { key: "volume", label: "Volym" },
  { key: "milestone", label: "Milstolpar" },
];

export function AchievementsClient({ items, totalUnlocked }: { items: Item[]; totalUnlocked: number }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  const progressPct = Math.round((totalUnlocked / items.length) * 100);

  return (
    <div className="max-w-4xl mx-auto px-[var(--space-6)] py-[var(--space-8)]">
      <div className="mb-[var(--space-8)]">
        <h1
          className="font-heading text-3xl font-semibold mb-[var(--space-2)]"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
        >
          Prestationer
        </h1>
        <p className="text-sm mb-[var(--space-5)]" style={{ color: "var(--text-tertiary)" }}>
          {totalUnlocked} av {items.length} upplåsta
        </p>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "var(--bg-elevated)" }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full"
            style={{ background: "var(--xp-gold)" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-6)] flex-wrap">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-[var(--space-3)] py-[6px] text-xs transition-all"
              style={{
                background: active ? "var(--accent-muted)" : "var(--bg-card)",
                color: active ? "var(--accent)" : "var(--text-tertiary)",
                border: `1px solid ${active ? "var(--border-accent)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-full)",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[var(--space-4)]"
      >
        {filtered.map((item) => (
          <motion.div
            key={item.name}
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
            }}
          >
            <AchievementTile item={item} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function AchievementTile({ item }: { item: Item }) {
  const pct = Math.min(100, Math.round((item.progress.current / item.progress.target) * 100));

  return (
    <div
      className="flex flex-col h-full px-[var(--space-5)] py-[var(--space-5)]"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${item.unlocked ? "var(--border-accent)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-lg)",
        opacity: item.unlocked ? 1 : 0.7,
      }}
    >
      <div className="flex items-start gap-[var(--space-3)] mb-[var(--space-3)]">
        <div
          className="w-12 h-12 flex-shrink-0 flex items-center justify-center"
          style={{
            background: item.unlocked ? "rgba(251, 191, 36, 0.12)" : "var(--bg-elevated)",
            border: `1px solid ${item.unlocked ? "rgba(251, 191, 36, 0.3)" : "var(--border-subtle)"}`,
            borderRadius: "var(--radius-md)",
            color: item.unlocked ? "var(--xp-gold)" : "var(--text-tertiary)",
          }}
        >
          <AchievementIcon icon={item.icon} size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider mb-[2px]" style={{ color: "var(--text-tertiary)" }}>
            {CATEGORY_LABELS[item.category]}
          </div>
          <div className="font-heading text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {item.name}
          </div>
        </div>
        {item.unlocked && (
          <span
            className="text-[10px] uppercase tracking-wider px-[var(--space-2)] py-[2px]"
            style={{
              background: "var(--success-muted)",
              color: "var(--success)",
              border: "1px solid var(--success)",
              borderRadius: "var(--radius-full)",
            }}
          >
            ✓
          </span>
        )}
      </div>
      <p className="text-xs flex-1 mb-[var(--space-3)]" style={{ color: "var(--text-secondary)" }}>
        {item.description}
      </p>

      <div className="mt-auto">
        <div className="flex items-center justify-between text-[10px] mb-[6px]">
          <span style={{ color: "var(--text-tertiary)" }}>Progress</span>
          <span className="font-mono" style={{ color: item.unlocked ? "var(--xp-gold)" : "var(--text-tertiary)" }}>
            {item.progress.current}/{item.progress.target}
          </span>
        </div>
        <div
          className="h-[3px] rounded-full overflow-hidden"
          style={{ background: "var(--bg-elevated)" }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: item.unlocked ? "var(--xp-gold)" : "var(--accent)",
            }}
          />
        </div>
        {item.unlocked && item.unlockedAt && (
          <div className="text-[10px] mt-[var(--space-2)]" style={{ color: "var(--text-tertiary)" }}>
            Upplåst {new Date(item.unlockedAt).toLocaleDateString("sv-SE")}
          </div>
        )}
      </div>
    </div>
  );
}

function AchievementIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8" };
  switch (icon) {
    case "flame":
    case "fire":
      return (
        <svg {...common}>
          <path d="M12 2c0 4-4 5-4 11a6 6 0 0012 0c0-3-1.5-5.5-3-7-1 2-2 2.5-2.5 2 0-2 0-4-2.5-6z" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M7 3h10v5a5 5 0 01-10 0V3z" />
          <path d="M4 5h3v2a2 2 0 01-2 2c-1 0-1-1-1-2V5zM17 5h3v2c0 1 0 2-1 2a2 2 0 01-2-2V5z" />
          <path d="M9 14h6v2H9zM8 18h8v3H8z" />
        </svg>
      );
    case "lightning":
      return (
        <svg {...common}>
          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
    case "medal":
      return (
        <svg {...common}>
          <circle cx="12" cy="15" r="6" />
          <path d="M8 3l4 6 4-6" />
          <circle cx="12" cy="15" r="2.5" />
        </svg>
      );
    case "gem":
      return (
        <svg {...common}>
          <path d="M6 3h12l3 6-9 12-9-12 3-6z" />
          <path d="M6 9h12M10 3l2 6 2-6" />
        </svg>
      );
    case "magnifier":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="6" />
          <path d="M15 15l5 5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
        </svg>
      );
  }
}
