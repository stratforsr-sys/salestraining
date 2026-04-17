"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitReflection } from "@/actions/reflections";

const QUESTIONS = [
  {
    key: "question1" as const,
    label: "Vilken teknik använde du medvetet?",
    placeholder: "t.ex. SPKVP-sekvensen — jag ställde situations- och konsekvensfrågor innan jag pratade pris.",
  },
  {
    key: "question2" as const,
    label: "Beskriv det svåraste ögonblicket.",
    placeholder: "Vad sa kunden, vad gjorde du?",
  },
  {
    key: "question3" as const,
    label: "Vilken teknik borde du ha använt där?",
    placeholder: "t.ex. proaktiv invändningshantering.",
  },
  {
    key: "question4" as const,
    label: "Vilka 3 specifika delar kan du förbättra?",
    placeholder: "1. …\n2. …\n3. …",
  },
  {
    key: "question5" as const,
    label: "OM [situation] händer igen, DÅ gör jag [handling].",
    placeholder: "OM kunden säger 'vi har redan en lösning', DÅ …",
  },
];

type Answers = Record<(typeof QUESTIONS)[number]["key"], string>;

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  sessionId?: string;
  meetingId?: string;
}

export function ReflectionModal({ open, onClose, onComplete, sessionId, meetingId }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    question1: "",
    question2: "",
    question3: "",
    question4: "",
    question5: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const current = QUESTIONS[step];
  const value = answers[current.key];
  const canAdvance = value.trim().length > 0;
  const isLast = step === QUESTIONS.length - 1;

  function reset() {
    setStep(0);
    setAnswers({ question1: "", question2: "", question3: "", question4: "", question5: "" });
    setSubmitting(false);
    setDone(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitReflection({ sessionId, meetingId, ...answers });
      setDone(true);
      onComplete?.();
    } catch {
      setSubmitting(false);
    }
  }

  function handleClose() {
    onClose();
    setTimeout(reset, 300);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center px-[var(--space-4)]"
          style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="w-full max-w-xl overflow-hidden"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            {done ? (
              <div className="px-[var(--space-8)] py-[var(--space-10)] text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="text-5xl mb-[var(--space-4)]"
                >
                  &#x2728;
                </motion.div>
                <h3
                  className="font-heading text-xl font-semibold mb-[var(--space-2)]"
                  style={{ color: "var(--text-primary)" }}
                >
                  Reflektion sparad
                </h3>
                <p className="text-sm mb-[var(--space-6)]" style={{ color: "var(--text-tertiary)" }}>
                  +20 XP
                </p>
                <button
                  onClick={handleClose}
                  className="px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium"
                  style={{
                    background: "var(--accent)",
                    color: "var(--text-inverse)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  Stäng
                </button>
              </div>
            ) : (
              <>
                <div
                  className="flex items-center justify-between px-[var(--space-6)] py-[var(--space-4)]"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <div>
                    <div className="text-xs uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                      Reflektion
                    </div>
                    <div className="font-heading text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                      Fråga {step + 1} av {QUESTIONS.length}
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 flex items-center justify-center transition-colors"
                    style={{ color: "var(--text-tertiary)", borderRadius: "var(--radius-sm)" }}
                    aria-label="Stäng"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 3l10 10M13 3L3 13" />
                    </svg>
                  </button>
                </div>

                <div className="px-[var(--space-6)] pt-[var(--space-4)]">
                  <div className="flex gap-[2px] mb-[var(--space-6)]">
                    {QUESTIONS.map((_, i) => (
                      <div
                        key={i}
                        className="h-[3px] flex-1 transition-colors"
                        style={{
                          background: i <= step ? "var(--accent)" : "var(--border-subtle)",
                          borderRadius: "var(--radius-full)",
                        }}
                      />
                    ))}
                  </div>

                  <motion.div
                    key={current.key}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label
                      className="block text-sm font-medium mb-[var(--space-3)]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {current.label}
                    </label>
                    <textarea
                      value={value}
                      onChange={(e) => setAnswers((a) => ({ ...a, [current.key]: e.target.value }))}
                      placeholder={current.placeholder}
                      rows={6}
                      autoFocus
                      disabled={submitting}
                      className="w-full px-[var(--space-4)] py-[var(--space-3)] text-sm outline-none resize-y"
                      style={{
                        background: "var(--bg-input)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        minHeight: "140px",
                      }}
                    />
                  </motion.div>
                </div>

                <div
                  className="flex items-center justify-between px-[var(--space-6)] py-[var(--space-4)] mt-[var(--space-4)]"
                  style={{ borderTop: "1px solid var(--border-subtle)" }}
                >
                  <button
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0 || submitting}
                    className="text-sm transition-colors disabled:opacity-30"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Tillbaka
                  </button>

                  <button
                    onClick={() => (isLast ? handleSubmit() : setStep((s) => s + 1))}
                    disabled={!canAdvance || submitting}
                    className="flex items-center gap-[var(--space-2)] px-[var(--space-5)] py-[var(--space-2)] text-sm font-medium transition-all disabled:opacity-40"
                    style={{
                      background: "var(--accent)",
                      color: "var(--text-inverse)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    {submitting ? "Sparar..." : isLast ? "Spara reflektion" : "Nästa"}
                    {!submitting && (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 4l4 4-4 4" />
                      </svg>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
