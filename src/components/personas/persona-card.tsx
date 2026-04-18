"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { PersonaListItem } from "@/actions/personas";

interface PersonaCardProps {
  persona: PersonaListItem;
  onEdit: (id: string) => void;
  onStart: (id: string) => void;
  onClone: (id: string) => void;
  onArchive: (id: string) => void;
}

export function PersonaCard({
  persona,
  onEdit,
  onStart,
  onClone,
  onArchive,
}: PersonaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const initial = persona.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onEdit(persona.id)}
      className="card text-left cursor-pointer flex flex-col h-full px-[var(--space-5)] py-[var(--space-5)] transition-all"
      style={{
        borderRadius: "var(--radius-lg)",
      }}
    >
      {/* Top row: avatar + name/title + menu */}
      <div className="flex items-start gap-[var(--space-3)] mb-[var(--space-3)]">
        <div
          className="w-11 h-11 flex items-center justify-center text-base font-medium shrink-0"
          style={{
            background: "var(--bg-elevated)",
            borderRadius: "var(--radius-full)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-base font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {persona.name}
          </div>
          <div className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
            {persona.title}, {persona.company}
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label="Persona-atgarder"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="w-8 h-8 flex items-center justify-center transition-colors"
            style={{
              color: "var(--text-tertiary)",
              borderRadius: "var(--radius-sm)",
              background: menuOpen ? "var(--bg-card-hover)" : "transparent",
            }}
          >
            <DotsIcon />
          </button>
          {menuOpen && (
            <div
              role="menu"
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-[var(--space-1)] w-44 py-[var(--space-1)] z-40"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(persona.id);
                }}
              >
                Redigera
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  onClone(persona.id);
                }}
              >
                Klona
              </MenuItem>
              <MenuItem
                danger
                onClick={() => {
                  setMenuOpen(false);
                  onArchive(persona.id);
                }}
              >
                Arkivera
              </MenuItem>
            </div>
          )}
        </div>
      </div>

      {/* Personality snippet */}
      <div
        className="text-sm line-clamp-2 flex-1 mb-[var(--space-4)]"
        style={{ color: "var(--text-secondary)" }}
      >
        {persona.personality || "Ingen personlighet angiven"}
      </div>

      {/* Footer row: tags + start button */}
      <div className="flex items-center justify-between gap-[var(--space-3)]">
        <div className="flex items-center gap-[var(--space-1)] flex-wrap min-w-0">
          {persona.isDefault && <Pill label="Default" />}
          {persona.isMine && !persona.isDefault && <Pill label="Mina" variant="accent" />}
          {persona.sharedWithTeam && !persona.isMine && !persona.isDefault && (
            <Pill label="Team" />
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStart(persona.id);
          }}
          className="flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-2)] text-xs font-medium shrink-0 transition-all"
          style={{
            background: "var(--accent-muted)",
            color: "var(--accent)",
            border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <SparkleIcon />
          Starta
        </button>
      </div>
    </motion.div>
  );
}

function MenuItem({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-[var(--space-3)] py-[var(--space-2)] text-sm transition-colors"
      style={{
        color: danger ? "var(--error)" : "var(--text-secondary)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

function Pill({ label, variant }: { label: string; variant?: "accent" }) {
  const isAccent = variant === "accent";
  return (
    <span
      className="inline-flex items-center px-[var(--space-2)] py-[2px] text-[10px] font-medium uppercase tracking-wider"
      style={{
        background: isAccent ? "var(--accent-subtle)" : "var(--bg-elevated)",
        color: isAccent ? "var(--accent)" : "var(--text-tertiary)",
        border: `1px solid ${isAccent ? "var(--border-accent)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-sm)",
      }}
    >
      {label}
    </span>
  );
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="3" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="13" cy="8" r="1.5" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5L8 2z" strokeLinejoin="round" />
    </svg>
  );
}
