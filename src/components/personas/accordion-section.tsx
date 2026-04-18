"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AccordionSectionProps {
  title: string;
  subtitle?: string;
  status?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  icon?: ReactNode;
  children: ReactNode;
  highlight?: boolean;
}

export function AccordionSection({
  title,
  subtitle,
  status,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  icon,
  children,
  highlight = false,
}: AccordionSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlight && open && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlight, open]);

  function toggle() {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  return (
    <div
      ref={sectionRef}
      className="overflow-hidden transition-all"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${highlight ? "var(--border-accent)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-md)",
        boxShadow: highlight ? "var(--shadow-glow)" : "none",
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)] text-left transition-colors"
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <div className="flex items-center gap-[var(--space-3)] min-w-0">
          {icon && (
            <div
              className="w-7 h-7 flex items-center justify-center shrink-0"
              style={{
                background: "var(--bg-elevated)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-tertiary)",
              }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {title}
            </div>
            {subtitle && (
              <div className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-[var(--space-3)] shrink-0">
          {status && (
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {status}
            </span>
          )}
          <motion.div
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: "var(--text-tertiary)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 2l4 4-4 4" strokeLinecap="round" />
            </svg>
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div
              className="px-[var(--space-4)] pb-[var(--space-4)] pt-[var(--space-2)]"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
