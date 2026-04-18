"use client";

import { useState, type ReactNode } from "react";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  max?: number;
  error?: string;
}

/** Notion-property-style inline row: label left, input right. */
export function InlineField({
  label,
  value,
  onChange,
  placeholder,
  required,
  max,
  error,
}: TextFieldProps) {
  const over = max !== undefined && value.length > max;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-[var(--space-2)] py-[var(--space-2)]">
      <label
        className="text-xs font-medium shrink-0 sm:w-32 sm:pt-[6px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
        {required && <span style={{ color: "var(--accent)" }}> *</span>}
      </label>
      <div className="flex-1 min-w-0">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-[var(--space-3)] py-[6px] text-sm outline-none transition-colors"
          style={{
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            border: `1px solid ${error || over ? "var(--error)" : "var(--border-subtle)"}`,
            borderRadius: "var(--radius-sm)",
          }}
        />
        {(error || over) && (
          <div className="text-xs mt-[4px]" style={{ color: "var(--error)" }}>
            {error || `Max ${max} tecken`}
          </div>
        )}
      </div>
    </div>
  );
}

interface TextareaProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  max?: number;
  required?: boolean;
  help?: string;
}

export function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  max,
  required,
  help,
}: TextareaProps) {
  const over = max !== undefined && value.length > max;
  return (
    <div className="py-[var(--space-2)]">
      <div className="flex items-center justify-between mb-[var(--space-1)]">
        <label
          className="text-xs font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          {label}
          {required && <span style={{ color: "var(--accent)" }}> *</span>}
        </label>
        {max !== undefined && (
          <span
            className="text-xs"
            style={{ color: over ? "var(--error)" : "var(--text-tertiary)" }}
          >
            {value.length} / {max}
          </span>
        )}
      </div>
      {help && (
        <div className="text-xs mb-[var(--space-2)]" style={{ color: "var(--text-tertiary)" }}>
          {help}
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-[var(--space-3)] py-[var(--space-2)] text-sm outline-none resize-y transition-colors"
        style={{
          background: "var(--bg-input)",
          color: "var(--text-primary)",
          border: `1px solid ${over ? "var(--error)" : "var(--border-subtle)"}`,
          borderRadius: "var(--radius-sm)",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

interface PillListProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  max?: number;
  maxLength?: number;
  help?: string;
}

/** Redigerbar pill/chip-lista: klick på pill för att redigera, × för radera, + för att lägga till. */
export function PillList({
  label,
  items,
  onChange,
  placeholder,
  max = 10,
  maxLength = 300,
  help,
}: PillListProps) {
  const [addingValue, setAddingValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  function commitAdd() {
    const v = addingValue.trim();
    if (v.length > 0 && items.length < max) {
      onChange([...items, v]);
    }
    setAddingValue("");
    setAdding(false);
  }

  function commitEdit() {
    if (editingIndex === null) return;
    const v = editValue.trim();
    if (v.length > 0) {
      const next = [...items];
      next[editingIndex] = v;
      onChange(next);
    } else {
      onChange(items.filter((_, i) => i !== editingIndex));
    }
    setEditingIndex(null);
    setEditValue("");
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="py-[var(--space-2)]">
      <div className="flex items-center justify-between mb-[var(--space-2)]">
        <label className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
          {label}
        </label>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {items.length} / {max}
        </span>
      </div>
      {help && (
        <div className="text-xs mb-[var(--space-2)]" style={{ color: "var(--text-tertiary)" }}>
          {help}
        </div>
      )}
      <div className="flex flex-wrap gap-[var(--space-2)]">
        {items.map((item, i) => {
          const isEditing = editingIndex === i;
          if (isEditing) {
            return (
              <input
                key={i}
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") {
                    setEditingIndex(null);
                    setEditValue("");
                  }
                }}
                maxLength={maxLength}
                className="px-[var(--space-3)] py-[4px] text-sm outline-none min-w-[200px]"
                style={{
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-accent)",
                  borderRadius: "var(--radius-full)",
                }}
              />
            );
          }
          return (
            <div
              key={i}
              className="inline-flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[4px] text-sm transition-colors group"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-full)",
                color: "var(--text-secondary)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setEditingIndex(i);
                  setEditValue(item);
                }}
                className="text-left"
              >
                {item}
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Ta bort"
                className="w-4 h-4 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "var(--text-tertiary)" }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
        {adding ? (
          <input
            autoFocus
            value={addingValue}
            onChange={(e) => setAddingValue(e.target.value)}
            onBlur={commitAdd}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitAdd();
              if (e.key === "Escape") {
                setAdding(false);
                setAddingValue("");
              }
            }}
            placeholder={placeholder}
            maxLength={maxLength}
            className="px-[var(--space-3)] py-[4px] text-sm outline-none min-w-[200px]"
            style={{
              background: "var(--bg-input)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-accent)",
              borderRadius: "var(--radius-full)",
            }}
          />
        ) : items.length < max ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-[var(--space-1)] px-[var(--space-3)] py-[4px] text-sm transition-colors"
            style={{
              background: "transparent",
              border: "1px dashed var(--border-default)",
              borderRadius: "var(--radius-full)",
              color: "var(--text-tertiary)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2v8M2 6h8" strokeLinecap="round" />
            </svg>
            Lagg till
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="space-y-[var(--space-1)]">{children}</div>;
}
