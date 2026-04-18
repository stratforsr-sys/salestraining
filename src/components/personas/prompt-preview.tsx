"use client";

import { useState, useEffect } from "react";
import { previewPersonaPrompt, type PersonaDraft } from "@/actions/personas";
import { DIFFICULTY_LABELS } from "@/lib/difficulty-baseline";

interface Props {
  draft: PersonaDraft;
}

export function PromptPreview({ draft }: Props) {
  const [difficulty, setDifficulty] = useState("medium");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Debounced preview refresh on draft/difficulty changes.
  useEffect(() => {
    const id = setTimeout(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      previewPersonaPrompt(draft, difficulty)
        .then((r) => {
          if (!cancelled) setPrompt(r.systemPrompt);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, 300);
    return () => clearTimeout(id);
  }, [draft, difficulty]);

  function copy() {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-[var(--space-2)]">
      <div className="flex items-center justify-between gap-[var(--space-2)]">
        <div className="flex items-center gap-[var(--space-2)]">
          <label className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Svarighet:
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-[var(--space-2)] py-[4px] text-xs outline-none"
            style={{
              background: "var(--bg-input)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {Object.entries(DIFFICULTY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          {loading && (
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              uppdaterar...
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={copy}
          className="text-xs px-[var(--space-3)] py-[4px] transition-colors"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {copied ? "Kopierat" : "Kopiera prompt"}
        </button>
      </div>

      {error && (
        <div
          className="text-xs px-[var(--space-3)] py-[var(--space-2)]"
          style={{
            background: "var(--error-muted)",
            color: "var(--error)",
            border: "1px solid var(--error)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {error}
        </div>
      )}

      <pre
        className="text-xs leading-relaxed overflow-auto px-[var(--space-3)] py-[var(--space-3)]"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
          maxHeight: 360,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {prompt || "Laddar prompt..."}
      </pre>
    </div>
  );
}
