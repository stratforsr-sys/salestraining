"use client";

import { useState, useRef, useEffect } from "react";
import { testPersonaResponse, type PersonaDraft } from "@/actions/personas";
import { DIFFICULTY_LABELS } from "@/lib/difficulty-baseline";

interface Msg {
  role: "buyer" | "seller";
  content: string;
}

interface Props {
  draft: PersonaDraft;
}

export function TestChat({ draft }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const canTest =
    draft.name.trim().length > 0 &&
    draft.title.trim().length > 0 &&
    draft.industry.trim().length > 0 &&
    draft.personality.trim().length > 0;

  async function send() {
    if (!canTest || !input.trim() || loading) return;
    const sellerMsg = input.trim();
    setInput("");
    setError(null);
    const history = [...messages];
    setMessages([...history, { role: "seller", content: sellerMsg }]);
    setLoading(true);
    try {
      const { buyerResponse } = await testPersonaResponse(draft, sellerMsg, difficulty, history);
      setMessages([
        ...history,
        { role: "seller", content: sellerMsg },
        { role: "buyer", content: buyerResponse },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMessages([]);
    setError(null);
  }

  const initial = draft.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="space-y-[var(--space-3)]">
      {!canTest ? (
        <div
          className="text-sm text-center py-[var(--space-6)]"
          style={{
            background: "var(--bg-elevated)",
            border: "1px dashed var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-tertiary)",
          }}
        >
          Fyll i namn, titel, bransch och personlighet for att testa.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Testar mot <strong style={{ color: "var(--text-secondary)" }}>nuvarande utkast</strong>
              {" "}— sparas inte.
            </div>
            <div className="flex items-center gap-[var(--space-2)]">
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
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  className="text-xs px-[var(--space-2)] py-[4px]"
                  style={{
                    color: "var(--text-tertiary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  Borja om
                </button>
              )}
            </div>
          </div>

          <div
            ref={scrollRef}
            className="space-y-[var(--space-3)] overflow-y-auto px-[var(--space-3)] py-[var(--space-3)]"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              minHeight: 160,
              maxHeight: 320,
            }}
          >
            {messages.length === 0 && !loading && (
              <div
                className="text-sm text-center py-[var(--space-4)]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Skriv ett saljar-meddelande nedan for att borja.
              </div>
            )}
            {messages.map((m, i) => (
              <ChatBubble key={i} msg={m} initial={initial} />
            ))}
            {loading && (
              <div className="flex items-start gap-[var(--space-2)]">
                <div
                  className="w-7 h-7 flex items-center justify-center text-xs shrink-0"
                  style={{
                    background: "var(--bg-card)",
                    borderRadius: "var(--radius-full)",
                    color: "var(--text-tertiary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {initial}
                </div>
                <div
                  className="px-[var(--space-3)] py-[var(--space-2)] text-sm"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  <span className="inline-flex gap-[4px]">
                    <Dot delay={0} />
                    <Dot delay={0.15} />
                    <Dot delay={0.3} />
                  </span>
                </div>
              </div>
            )}
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

          <div className="flex items-center gap-[var(--space-2)]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
              placeholder="Skriv som saljare..."
              disabled={loading}
              className="flex-1 px-[var(--space-3)] py-[var(--space-2)] text-sm outline-none"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-[var(--space-4)] py-[var(--space-2)] text-sm font-medium transition-all disabled:opacity-40"
              style={{
                background: "var(--accent)",
                color: "var(--text-inverse)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              Skicka
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ChatBubble({ msg, initial }: { msg: Msg; initial: string }) {
  const isBuyer = msg.role === "buyer";
  return (
    <div className={`flex items-start gap-[var(--space-2)] ${isBuyer ? "" : "flex-row-reverse"}`}>
      <div
        className="w-7 h-7 flex items-center justify-center text-xs shrink-0"
        style={{
          background: isBuyer ? "var(--bg-card)" : "var(--accent-muted)",
          borderRadius: "var(--radius-full)",
          color: isBuyer ? "var(--text-tertiary)" : "var(--accent)",
          border: `1px solid ${isBuyer ? "var(--border-subtle)" : "var(--border-accent)"}`,
        }}
      >
        {isBuyer ? initial : "Du"}
      </div>
      <div
        className="px-[var(--space-3)] py-[var(--space-2)] text-sm max-w-[80%]"
        style={{
          background: isBuyer ? "var(--bg-card)" : "var(--accent-subtle)",
          border: `1px solid ${isBuyer ? "var(--border-subtle)" : "var(--border-accent)"}`,
          borderRadius: "var(--radius-md)",
          color: isBuyer ? "var(--text-secondary)" : "var(--text-primary)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block w-[6px] h-[6px] rounded-full"
      style={{
        background: "var(--text-tertiary)",
        animation: `pulse-dot 1s ${delay}s infinite ease-in-out`,
      }}
    />
  );
}
