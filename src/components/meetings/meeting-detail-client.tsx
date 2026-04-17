"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ReflectionModal } from "@/components/reflection/reflection-modal";

interface FeedbackItem {
  id: string;
  timestamp: string;
  type: "technique_used" | "missed_opportunity" | "good_moment" | string;
  techniqueName: string;
  whatHappened: string;
  suggestion: string | null;
  quote: string | null;
}

interface Exercise {
  id: string;
  exerciseType: string;
  prompt: string;
  techniqueName: string;
  completed: boolean;
}

interface Reflection {
  id: string;
  question1: string;
  question2: string;
  question3: string;
  question4: string;
  question5: string;
  createdAt: string;
}

interface Meeting {
  id: string;
  meetingType: string;
  date: string;
  summary: string | null;
  talkRatio: number | null;
  questionsAsked: number | null;
  longestMonologue: number | null;
  bbbtuuiccCoverage: Record<string, boolean> | null;
  feedbackItems: FeedbackItem[];
  generatedExercises: Exercise[];
  reflection: Reflection | null;
}

const TYPE_LABELS: Record<string, string> = {
  meeting_1: "Möte 1 — Behovsanalys + demo",
  meeting_2: "Möte 2 — Offert + invändningar",
  meeting_3: "Möte 3 — Beslut",
};

const BBBTUUICC = [
  { key: "behov", label: "Behov" },
  { key: "budget", label: "Budget" },
  { key: "beslutsfattare", label: "Beslutsfattare" },
  { key: "tidsplan", label: "Tidsplan" },
  { key: "usp", label: "USP" },
  { key: "utbildaIProdukt", label: "Utbilda" },
  { key: "invandningar", label: "Invändningar" },
  { key: "compellingEvents", label: "Compelling" },
  { key: "commitments", label: "Commitments" },
];

export function MeetingDetailClient({ meeting }: { meeting: Meeting }) {
  const [reflectOpen, setReflectOpen] = useState(false);
  const [reflected, setReflected] = useState(!!meeting.reflection);

  const sortedFeedback = useMemo(() => {
    return [...meeting.feedbackItems].sort((a, b) => timestampToSeconds(a.timestamp) - timestampToSeconds(b.timestamp));
  }, [meeting.feedbackItems]);

  const hitCount = sortedFeedback.filter((f) => f.type === "technique_used").length;
  const missCount = sortedFeedback.filter((f) => f.type === "missed_opportunity").length;

  return (
    <>
      <div className="max-w-4xl mx-auto px-[var(--space-6)] py-[var(--space-8)]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Link
            href="/meetings"
            className="inline-flex items-center gap-[var(--space-2)] text-xs mb-[var(--space-4)] transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 4l-4 4 4 4" />
            </svg>
            Alla möten
          </Link>

          <div className="flex items-start justify-between gap-[var(--space-4)] mb-[var(--space-6)]">
            <div>
              <h1
                className="font-heading text-3xl font-semibold mb-[var(--space-2)]"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
              >
                {TYPE_LABELS[meeting.meetingType] || meeting.meetingType}
              </h1>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {new Date(meeting.date).toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <button
              onClick={() => setReflectOpen(true)}
              disabled={reflected}
              className="flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium transition-all disabled:opacity-60"
              style={{
                background: reflected ? "var(--bg-card)" : "var(--accent)",
                color: reflected ? "var(--text-secondary)" : "var(--text-inverse)",
                border: reflected ? "1px solid var(--border-default)" : "none",
                borderRadius: "var(--radius-md)",
              }}
            >
              {reflected ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8l3 3 7-7" />
                  </svg>
                  Reflekterat
                </>
              ) : (
                "Reflektera på mötet"
              )}
            </button>
          </div>

          {meeting.summary && (
            <div
              className="px-[var(--space-5)] py-[var(--space-4)] mb-[var(--space-6)]"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {meeting.summary}
              </p>
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--space-3)] mb-[var(--space-8)]">
            <Metric label="Talk-ratio" value={meeting.talkRatio != null ? `${Math.round(meeting.talkRatio)}%` : "—"} />
            <Metric label="Frågor" value={meeting.questionsAsked?.toString() ?? "—"} />
            <Metric
              label="Längsta monolog"
              value={meeting.longestMonologue != null ? `${meeting.longestMonologue}s` : "—"}
            />
            <Metric label="Träffar / miss" value={`${hitCount} / ${missCount}`} />
          </div>

          {/* BBBTUUICC coverage */}
          <SectionTitle>BBBTUUICC-täckning</SectionTitle>
          <div className="flex flex-wrap gap-[var(--space-2)] mb-[var(--space-8)]">
            {BBBTUUICC.map((c) => {
              const covered = Boolean(meeting.bbbtuuiccCoverage?.[c.key]);
              return (
                <span
                  key={c.key}
                  className="px-[var(--space-3)] py-[6px] text-xs font-mono"
                  style={{
                    background: covered ? "var(--success-muted)" : "var(--bg-card)",
                    color: covered ? "var(--success)" : "var(--text-tertiary)",
                    border: `1px solid ${covered ? "var(--success)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-full)",
                  }}
                >
                  {covered ? "✓" : "○"} {c.label}
                </span>
              );
            })}
          </div>

          {/* Timeline */}
          <SectionTitle>Tidsstämplade ögonblick</SectionTitle>
          {sortedFeedback.length === 0 ? (
            <EmptyBlock text="Inga tidsstämplade ögonblick." />
          ) : (
            <div className="flex flex-col gap-[var(--space-3)] mb-[var(--space-8)]">
              {sortedFeedback.map((f) => (
                <FeedbackCard key={f.id} item={f} />
              ))}
            </div>
          )}

          {/* Exercises */}
          <SectionTitle>Auto-genererade övningar</SectionTitle>
          {meeting.generatedExercises.length === 0 ? (
            <EmptyBlock text="Inga övningar genererade." />
          ) : (
            <div className="flex flex-col gap-[var(--space-3)] mb-[var(--space-8)]">
              {meeting.generatedExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="px-[var(--space-5)] py-[var(--space-4)]"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                  }}
                >
                  <div className="flex items-start justify-between gap-[var(--space-4)] mb-[var(--space-2)]">
                    <div className="text-xs uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                      {ex.techniqueName}
                    </div>
                    <Link
                      href="/practice"
                      className="text-xs font-medium transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Öva nu →
                    </Link>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                    {ex.prompt}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Reflection preview */}
          {meeting.reflection && (
            <>
              <SectionTitle>Din reflektion</SectionTitle>
              <ReflectionPreview reflection={meeting.reflection} />
            </>
          )}
        </motion.div>
      </div>

      <ReflectionModal
        open={reflectOpen}
        onClose={() => setReflectOpen(false)}
        onComplete={() => setReflected(true)}
        meetingId={meeting.id}
      />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="px-[var(--space-4)] py-[var(--space-3)]"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="text-[10px] uppercase tracking-wider mb-[var(--space-1)]" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </div>
      <div className="font-mono text-lg" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs uppercase tracking-wider mb-[var(--space-3)]"
      style={{ color: "var(--text-tertiary)" }}
    >
      {children}
    </h2>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div
      className="px-[var(--space-5)] py-[var(--space-5)] text-center text-sm mb-[var(--space-8)]"
      style={{
        background: "var(--bg-card)",
        border: "1px dashed var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        color: "var(--text-tertiary)",
      }}
    >
      {text}
    </div>
  );
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const isMiss = item.type === "missed_opportunity";
  const accent = isMiss ? "var(--error)" : "var(--success)";
  const accentBg = isMiss ? "var(--error-muted)" : "var(--success-muted)";

  return (
    <div
      className="flex gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-4)]"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div className="flex-shrink-0 w-14">
        <span
          className="inline-block font-mono text-xs px-[var(--space-2)] py-[2px]"
          style={{ background: accentBg, color: accent, borderRadius: "var(--radius-sm)" }}
        >
          {item.timestamp}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-2)]">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {item.techniqueName}
          </span>
          <span
            className="text-[10px] uppercase tracking-wider px-[var(--space-2)] py-[1px]"
            style={{
              background: "var(--bg-elevated)",
              color: accent,
              borderRadius: "var(--radius-sm)",
            }}
          >
            {isMiss ? "Missad möjlighet" : "Rätt teknik"}
          </span>
        </div>

        {item.quote && (
          <blockquote
            className="text-sm italic px-[var(--space-3)] py-[var(--space-2)] mb-[var(--space-2)]"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              borderLeft: "2px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            &ldquo;{item.quote}&rdquo;
          </blockquote>
        )}

        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {item.whatHappened}
        </p>

        {item.suggestion && (
          <div
            className="mt-[var(--space-3)] px-[var(--space-3)] py-[var(--space-2)] text-sm"
            style={{
              background: "var(--accent-subtle)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-accent)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <span className="font-medium" style={{ color: "var(--accent)" }}>Bättre: </span>
            {item.suggestion}
          </div>
        )}
      </div>
    </div>
  );
}

function ReflectionPreview({ reflection }: { reflection: Reflection }) {
  const items: { q: string; a: string }[] = [
    { q: "Vilken teknik använde du medvetet?", a: reflection.question1 },
    { q: "Svåraste ögonblicket", a: reflection.question2 },
    { q: "Vilken teknik borde du ha använt?", a: reflection.question3 },
    { q: "3 delar att förbättra", a: reflection.question4 },
    { q: "OM-DÅ till nästa gång", a: reflection.question5 },
  ];
  return (
    <div
      className="flex flex-col gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-5)] mb-[var(--space-8)]"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      {items.map((it, i) => (
        <div key={i}>
          <div className="text-xs mb-[var(--space-1)]" style={{ color: "var(--text-tertiary)" }}>
            {it.q}
          </div>
          <div className="text-sm whitespace-pre-line" style={{ color: "var(--text-primary)" }}>
            {it.a}
          </div>
        </div>
      ))}
    </div>
  );
}

function timestampToSeconds(t: string): number {
  const parts = t.split(":").map((x) => parseInt(x, 10));
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}
