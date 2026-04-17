"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateUserSettings, type RepetitionFrequency } from "@/actions/settings";

const DAYS = [
  { key: "mon", label: "Mån" },
  { key: "tue", label: "Tis" },
  { key: "wed", label: "Ons" },
  { key: "thu", label: "Tor" },
  { key: "fri", label: "Fre" },
  { key: "sat", label: "Lör" },
  { key: "sun", label: "Sön" },
] as const;

const FREQUENCIES: { key: RepetitionFrequency; label: string; sub: string }[] = [
  { key: "daily", label: "Varje dag", sub: "Bygg dagliga reflexer" },
  { key: "everyOtherDay", label: "Varannan dag", sub: "Vila mellan passen" },
  { key: "custom", label: "Anpassat schema", sub: "Välj specifika dagar" },
];

interface Props {
  initial: {
    repetitionFrequency: RepetitionFrequency;
    customSchedule: string[];
    dailyGoalMinutes: number;
    preferredTime: string;
  };
  userName: string;
}

export function SettingsClient({ initial, userName }: Props) {
  const [freq, setFreq] = useState<RepetitionFrequency>(initial.repetitionFrequency);
  const [schedule, setSchedule] = useState<string[]>(initial.customSchedule);
  const [goal, setGoal] = useState<number>(initial.dailyGoalMinutes);
  const [time, setTime] = useState<string>(initial.preferredTime);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleDay(day: string) {
    setSchedule((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateUserSettings({
        repetitionFrequency: freq,
        customSchedule: schedule,
        dailyGoalMinutes: goal,
        preferredTime: time,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2400);
      }
    });
  }

  const isDirty =
    freq !== initial.repetitionFrequency ||
    goal !== initial.dailyGoalMinutes ||
    time !== initial.preferredTime ||
    JSON.stringify([...schedule].sort()) !== JSON.stringify([...initial.customSchedule].sort());

  return (
    <div className="max-w-3xl mx-auto px-[var(--space-6)] py-[var(--space-8)]">
      <div className="mb-[var(--space-8)]">
        <h1
          className="font-heading text-3xl font-semibold mb-[var(--space-2)]"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
        >
          Inställningar
        </h1>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Inloggad som <span style={{ color: "var(--text-secondary)" }}>{userName}</span>. Här justerar du ditt träningsschema.
        </p>
      </div>

      <Section title="Träningsfrekvens" subtitle="Hur ofta vill du påminnas att öva?">
        <div className="flex flex-col gap-[var(--space-2)]">
          {FREQUENCIES.map((f) => (
            <button
              key={f.key}
              onClick={() => setFreq(f.key)}
              className="flex items-center gap-[var(--space-4)] text-left px-[var(--space-4)] py-[var(--space-3)] transition-all"
              style={{
                background: freq === f.key ? "var(--accent-muted)" : "var(--bg-card)",
                border: `1px solid ${freq === f.key ? "var(--border-accent)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-md)",
              }}
            >
              <div
                className="w-4 h-4 flex-shrink-0 rounded-full flex items-center justify-center"
                style={{
                  background: freq === f.key ? "var(--accent)" : "transparent",
                  border: `2px solid ${freq === f.key ? "var(--accent)" : "var(--border-default)"}`,
                }}
              >
                {freq === f.key && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--text-inverse)" }} />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {f.label}
                </div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {f.sub}
                </div>
              </div>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {freq === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-[var(--space-4)]">
                <div className="text-xs uppercase tracking-wider mb-[var(--space-2)]" style={{ color: "var(--text-tertiary)" }}>
                  Välj dagar
                </div>
                <div className="flex gap-[var(--space-2)]">
                  {DAYS.map((d) => {
                    const active = schedule.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        onClick={() => toggleDay(d.key)}
                        className="flex-1 py-[var(--space-2)] text-xs font-medium transition-all"
                        style={{
                          background: active ? "var(--accent)" : "var(--bg-card)",
                          color: active ? "var(--text-inverse)" : "var(--text-tertiary)",
                          border: `1px solid ${active ? "var(--accent)" : "var(--border-subtle)"}`,
                          borderRadius: "var(--radius-md)",
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      <Section title="Dagligt mål" subtitle="Hur många minuter vill du öva per dag?">
        <div className="flex items-center gap-[var(--space-5)]">
          <input
            type="range"
            min={5}
            max={120}
            step={5}
            value={goal}
            onChange={(e) => setGoal(parseInt(e.target.value))}
            className="flex-1"
            style={{ accentColor: "var(--accent)" }}
          />
          <div
            className="font-mono text-lg w-20 text-center px-[var(--space-3)] py-[var(--space-2)]"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {goal} min
          </div>
        </div>
      </Section>

      <Section title="Föredragen tid" subtitle="När på dagen vill du påminnas?">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="px-[var(--space-4)] py-[var(--space-3)] text-sm font-mono"
          style={{
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            colorScheme: "dark",
          }}
        />
      </Section>

      <div
        className="sticky bottom-0 mt-[var(--space-8)] py-[var(--space-4)] flex items-center justify-between gap-[var(--space-4)]"
        style={{ background: "linear-gradient(to top, var(--bg-primary) 60%, transparent)" }}
      >
        <div className="min-h-[20px]">
          {error && <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>}
          {saved && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs"
              style={{ color: "var(--success)" }}
            >
              ✓ Sparat
            </motion.p>
          )}
        </div>
        <button
          onClick={save}
          disabled={!isDirty || pending}
          className="px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "var(--accent)",
            color: "var(--text-inverse)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {pending ? "Sparar..." : "Spara"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mb-[var(--space-8)]">
      <div className="mb-[var(--space-4)]">
        <h2 className="font-heading text-lg font-semibold mb-[2px]" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
