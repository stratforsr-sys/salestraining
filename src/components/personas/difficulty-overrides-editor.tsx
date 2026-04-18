"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DIFFICULTY_BASELINE, DIFFICULTY_LABELS } from "@/lib/difficulty-baseline";

const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;
const MAX = 2000;

interface Props {
  overrides: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

export function DifficultyOverridesEditor({ overrides, onChange }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function update(key: string, value: string) {
    const next = { ...overrides };
    if (value.trim().length === 0) {
      delete next[key];
    } else {
      next[key] = value;
    }
    onChange(next);
  }

  return (
    <div className="space-y-[var(--space-2)]">
      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        Extra-text som laggs PA den globala baseline-beteendet for varje svarighetsgrad. Den
        globala baselinen gar inte att redigera har; den galler alla personas.
      </div>

      {DIFFICULTIES.map((key) => {
        const isOpen = expanded === key;
        const value = overrides[key] || "";
        const over = value.length > MAX;
        return (
          <div
            key={key}
            className="overflow-hidden"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : key)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between px-[var(--space-4)] py-[var(--space-2)] text-left transition-colors"
            >
              <div className="flex items-center gap-[var(--space-3)]">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {DIFFICULTY_LABELS[key]}
                </span>
                {value.length > 0 && (
                  <span
                    className="text-xs px-[var(--space-2)] py-[1px]"
                    style={{
                      background: "var(--accent-subtle)",
                      color: "var(--accent)",
                      border: "1px solid var(--border-accent)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    Override
                  </span>
                )}
              </div>
              <motion.svg
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                <path d="M4 2l4 4-4 4" strokeLinecap="round" />
              </motion.svg>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className="px-[var(--space-4)] pb-[var(--space-3)] pt-[var(--space-2)]"
                    style={{ borderTop: "1px solid var(--border-subtle)" }}
                  >
                    <div className="mb-[var(--space-2)]">
                      <div
                        className="text-xs font-medium uppercase tracking-wider mb-[var(--space-1)]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Global baseline (las-bara)
                      </div>
                      <div
                        className="text-xs px-[var(--space-3)] py-[var(--space-2)] whitespace-pre-wrap"
                        style={{
                          background: "var(--bg-input)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--text-tertiary)",
                          fontFamily: "inherit",
                        }}
                      >
                        {DIFFICULTY_BASELINE[key]}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-[var(--space-1)]">
                      <label
                        className="text-xs font-medium uppercase tracking-wider"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Extra for denna persona
                      </label>
                      <span
                        className="text-xs"
                        style={{ color: over ? "var(--error)" : "var(--text-tertiary)" }}
                      >
                        {value.length} / {MAX}
                      </span>
                    </div>
                    <textarea
                      value={value}
                      onChange={(e) => update(key, e.target.value)}
                      placeholder="Ex: Namn dropp en specifik konkurrent som just signerat ett 3-arigt avtal"
                      rows={4}
                      className="w-full px-[var(--space-3)] py-[var(--space-2)] text-sm outline-none resize-y"
                      style={{
                        background: "var(--bg-input)",
                        color: "var(--text-primary)",
                        border: `1px solid ${over ? "var(--error)" : "var(--border-subtle)"}`,
                        borderRadius: "var(--radius-sm)",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
