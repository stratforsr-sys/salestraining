"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { startPracticeSession } from "@/actions/practice";
import { startRoleplay } from "@/actions/roleplay";

interface Persona {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  personality: string;
}

export function RoleplaySetupClient({ personas }: { personas: Persona[] }) {
  const router = useRouter();
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState("meeting_1");
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleStart() {
    if (!selectedPersona) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const session = await startPracticeSession("roleplay");
      const roleplay = await startRoleplay(session.id, selectedPersona, meetingType, difficulty);
      router.push(`/roleplay/${roleplay.id}`);
    } catch (err) {
      console.error("startRoleplay failed:", err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  const selected = personas.find((p) => p.id === selectedPersona);

  return (
    <div className="max-w-3xl mx-auto px-[var(--space-6)] py-[var(--space-8)]">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-[var(--space-4)] mb-[var(--space-2)]">
          <div>
            <h1
              className="font-heading text-3xl font-semibold"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
            >
              Nytt rollspel
            </h1>
            <p className="mt-[var(--space-1)] text-sm" style={{ color: "var(--text-tertiary)" }}>
              Välj persona, mötestyp och svårighetsgrad. AI:n spelar köparen.
            </p>
          </div>
          <Link
            href="/personas"
            className="shrink-0 flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-2)] text-xs font-medium transition-all"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
            }}
          >
            Hantera personas
          </Link>
        </div>

        {personas.length === 0 && (
          <div
            className="my-[var(--space-8)] flex flex-col items-center justify-center py-[var(--space-12)] text-center"
            style={{
              background: "var(--bg-card)",
              border: "1px dashed var(--border-default)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <div
              className="w-14 h-14 flex items-center justify-center mb-[var(--space-4)]"
              style={{
                background: "var(--accent-subtle)",
                borderRadius: "var(--radius-xl)",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                <circle cx="6" cy="5" r="2.5" />
                <path d="M1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
                <circle cx="11" cy="5.5" r="1.8" />
                <path d="M14.5 14c0-2 -1.5-3.2-3.5-3.5" />
              </svg>
            </div>
            <h3
              className="font-heading text-lg font-semibold mb-[var(--space-2)]"
              style={{ color: "var(--text-primary)" }}
            >
              Inga personas än
            </h3>
            <p className="text-sm max-w-sm mb-[var(--space-5)]" style={{ color: "var(--text-tertiary)" }}>
              Skapa din första persona för att börja rollspela. Du kan utgå från en default eller bygga från scratch.
            </p>
            <Link
              href="/personas"
              className="flex items-center gap-[var(--space-2)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium transition-all"
              style={{
                background: "var(--accent)",
                color: "var(--text-inverse)",
                borderRadius: "var(--radius-md)",
              }}
            >
              Skapa en persona
            </Link>
          </div>
        )}

        {/* Personas */}
        <div className="mb-[var(--space-8)]" style={{ display: personas.length === 0 ? "none" : undefined }}>
          <label className="block text-xs font-medium uppercase tracking-wider mb-[var(--space-3)] mt-[var(--space-8)]" style={{ color: "var(--text-tertiary)" }}>
            Välj köpare
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-3)]">
            {personas.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPersona(p.id)}
                className="text-left card px-[var(--space-5)] py-[var(--space-4)] transition-all"
                style={{
                  borderColor: selectedPersona === p.id ? "var(--accent)" : undefined,
                  boxShadow: selectedPersona === p.id ? "var(--shadow-glow)" : undefined,
                }}
              >
                <div className="flex items-center gap-[var(--space-3)] mb-[var(--space-2)]">
                  <div
                    className="w-9 h-9 flex items-center justify-center text-sm font-medium"
                    style={{
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--radius-full)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {p.name}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {p.title}, {p.company}
                    </div>
                  </div>
                </div>
                <div className="text-xs line-clamp-2" style={{ color: "var(--text-tertiary)" }}>
                  {p.personality}
                </div>
              </button>
            ))}
          </div>
        </div>

        {personas.length > 0 && <>
        {/* Meeting Type */}
        <div className="mb-[var(--space-8)]">
          <label className="block text-xs font-medium uppercase tracking-wider mb-[var(--space-3)]" style={{ color: "var(--text-tertiary)" }}>
            Mötestyp
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--space-2)]">
            {[
              { value: "cold_call", label: "Coldcall" },
              { value: "meeting_1", label: "Möte 1" },
              { value: "meeting_2", label: "Möte 2" },
              { value: "meeting_3", label: "Möte 3" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setMeetingType(t.value)}
                className="px-[var(--space-3)] py-[var(--space-3)] text-sm text-center transition-all"
                style={{
                  background: meetingType === t.value ? "var(--accent-muted)" : "var(--bg-card)",
                  border: `1px solid ${meetingType === t.value ? "var(--border-accent)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-md)",
                  color: meetingType === t.value ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-[var(--space-8)]">
          <label className="block text-xs font-medium uppercase tracking-wider mb-[var(--space-3)]" style={{ color: "var(--text-tertiary)" }}>
            Svårighetsgrad
          </label>
          <div className="grid grid-cols-4 gap-[var(--space-2)]">
            {[
              { value: "easy", label: "Enkel" },
              { value: "medium", label: "Medel" },
              { value: "hard", label: "Svår" },
              { value: "expert", label: "Expert" },
            ].map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className="px-[var(--space-3)] py-[var(--space-3)] text-sm text-center transition-all"
                style={{
                  background: difficulty === d.value ? "var(--accent-muted)" : "var(--bg-card)",
                  border: `1px solid ${difficulty === d.value ? "var(--border-accent)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-md)",
                  color: difficulty === d.value ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div
            className="mb-[var(--space-4)] px-[var(--space-4)] py-[var(--space-3)] text-sm"
            style={{
              background: "var(--error-muted)",
              color: "var(--error)",
              border: "1px solid var(--error)",
              borderRadius: "var(--radius-md)",
            }}
          >
            Fel: {errorMsg}
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!selectedPersona || loading}
          className="w-full flex items-center justify-center gap-[var(--space-2)] px-[var(--space-6)] py-[var(--space-4)] text-sm font-medium transition-all disabled:opacity-40"
          style={{
            background: "var(--accent)",
            color: "var(--text-inverse)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {loading ? (
            "Startar rollspel..."
          ) : selected ? (
            `Starta samtal med ${selected.name}`
          ) : (
            "Välj en köpare för att starta"
          )}
        </button>
        </>}
      </motion.div>
    </div>
  );
}
