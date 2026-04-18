"use client";

import type { HiddenMotive } from "@/lib/gemini";
import { TextareaField, InlineField } from "./form-fields";

const MAX_MOTIVES = 5;

interface Props {
  motives: HiddenMotive[];
  onChange: (motives: HiddenMotive[]) => void;
}

export function HiddenMotivesEditor({ motives, onChange }: Props) {
  function update(index: number, patch: Partial<HiddenMotive>) {
    const next = motives.map((m, i) => (i === index ? { ...m, ...patch } : m));
    onChange(next);
  }

  function remove(index: number) {
    onChange(motives.filter((_, i) => i !== index));
  }

  function add() {
    if (motives.length >= MAX_MOTIVES) return;
    onChange([...motives, { secret: "", trigger: "", howItLeaks: "" }]);
  }

  return (
    <div className="space-y-[var(--space-3)]">
      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        Dolda motiv ar fakta eller mandat personan inte spontant beror. De avslojas bara nar
        saljaren traffar ratt trigger. Anvand for att simulera komplexa kopare med mandat-grans,
        budget-lock eller lojalitet till konkurrent.
      </div>

      {motives.length === 0 && (
        <div
          className="text-sm text-center py-[var(--space-6)]"
          style={{
            background: "var(--bg-elevated)",
            border: "1px dashed var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-tertiary)",
          }}
        >
          Inga dolda motiv annu.
        </div>
      )}

      {motives.map((m, i) => (
        <div
          key={i}
          className="px-[var(--space-4)] py-[var(--space-3)]"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div className="flex items-center justify-between mb-[var(--space-2)]">
            <div
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--accent)" }}
            >
              Motiv {i + 1}
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-xs px-[var(--space-2)] py-[2px] transition-colors"
              style={{
                color: "var(--error)",
                border: "1px solid transparent",
                borderRadius: "var(--radius-sm)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--error-muted)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Radera
            </button>
          </div>

          <TextareaField
            label="Hemligt faktum"
            value={m.secret}
            onChange={(v) => update(i, { secret: v })}
            placeholder="Ex: Har redan signerat kontrakt med konkurrent, men det ar inte officiellt an"
            rows={2}
            max={500}
            required
          />
          <InlineField
            label="Trigger"
            value={m.trigger}
            onChange={(v) => update(i, { trigger: v })}
            placeholder="Ex: Om saljaren fragar om befintlig losning"
            max={300}
            required
          />
          <TextareaField
            label="Hur det lacker"
            value={m.howItLeaks || ""}
            onChange={(v) => update(i, { howItLeaks: v })}
            placeholder="Ex: Bli kort i tonen, byt samtalsamne, harkla dig"
            rows={2}
            max={500}
            help="Hur personan beter sig nar triggern aktiveras utan att avsloja fakta direkt."
          />
        </div>
      ))}

      {motives.length < MAX_MOTIVES && (
        <button
          type="button"
          onClick={add}
          className="w-full flex items-center justify-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-3)] text-sm transition-colors"
          style={{
            background: "transparent",
            color: "var(--text-secondary)",
            border: "1px dashed var(--border-default)",
            borderRadius: "var(--radius-md)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2v8M2 6h8" strokeLinecap="round" />
          </svg>
          Lagg till dolt motiv
        </button>
      )}
    </div>
  );
}
