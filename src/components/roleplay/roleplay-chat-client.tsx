"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sendRoleplayMessage, endRoleplay } from "@/actions/roleplay";
import { useTextToSpeech, useSpeechRecognition } from "@/lib/hooks/use-speech";

interface Message {
  role: "seller" | "buyer";
  content: string;
  timestamp?: number;
}

interface Persona {
  name: string;
  title: string;
  company: string;
}

interface Scorecard {
  rightTechniqueScore: number;
  frameworkCoverage: number;
  objectionHandling: number;
  meetingStructure: number;
  naturalFormulation: number;
  totalScore: number;
  detailedFeedback: string;
}

interface FeedbackItem {
  id?: string;
  timestamp: number;
  type: string;
  buyerSaid: string;
  userSaid: string;
  techniqueName: string;
  idealResponse: string;
  explanation: string;
}

interface RoleplayData {
  id: string;
  meetingType: string;
  difficulty: string;
  transcript: string;
  persona: Persona;
  scorecard: Scorecard | null;
  feedbackItems: FeedbackItem[];
}

export function RoleplayChatClient({ roleplay }: { roleplay: RoleplayData }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      return JSON.parse(roleplay.transcript);
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(!!roleplay.scorecard);
  const [scorecard, setScorecard] = useState<Scorecard | null>(roleplay.scorecard);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>(roleplay.feedbackItems || []);
  const [detailedParsed, setDetailedParsed] = useState<ParsedFeedback | null>(() =>
    roleplay.scorecard ? parseDetailedFeedback(roleplay.scorecard.detailedFeedback) : null
  );
  const [elapsed, setElapsed] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Voice — Swedish TTS for buyer + STT for seller
  const tts = useTextToSpeech({ lang: "sv-SE", rate: 1, pitch: 1 });
  const stt = useSpeechRecognition({ lang: "sv-SE", continuous: true, interimResults: true });
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const lastSpokenIndex = useRef<number>(-1);

  // Load voice preference
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("roleplay:voice") : null;
    if (stored !== null) setVoiceEnabled(stored === "1");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("roleplay:voice", voiceEnabled ? "1" : "0");
    }
  }, [voiceEnabled]);

  // Stop any speech on unmount
  useEffect(() => {
    return () => {
      tts.cancel();
      stt.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-speak newest buyer message
  useEffect(() => {
    if (!voiceEnabled || !tts.supported || ended) return;
    const last = messages.length - 1;
    if (last < 0) return;
    const msg = messages[last];
    if (msg.role !== "buyer") return;
    if (lastSpokenIndex.current >= last) return;
    lastSpokenIndex.current = last;
    // Voices list may need to be ready; speak will noop if cancelled
    tts.speak(msg.content);
  }, [messages, voiceEnabled, tts, ended]);

  // When STT final transcript updates, merge into input
  useEffect(() => {
    if (!stt.finalTranscript) return;
    setInput((prev) => {
      const trimmed = stt.finalTranscript.trim();
      if (!trimmed) return prev;
      return prev ? `${prev} ${trimmed}`.trim() : trimmed;
    });
    stt.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stt.finalTranscript]);

  useEffect(() => {
    if (ended) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [ended]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loading && !ended) inputRef.current?.focus();
  }, [loading, ended]);

  const toggleMic = useCallback(() => {
    if (!stt.supported) return;
    if (stt.listening) {
      stt.stop();
    } else {
      // Stop TTS so buyer voice doesn't feed into mic
      tts.cancel();
      stt.start();
    }
  }, [stt, tts]);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((v) => {
      if (v) tts.cancel();
      return !v;
    });
  }, [tts]);

  const displayInput = stt.listening && stt.interim ? `${input ? input + " " : ""}${stt.interim}` : input;

  async function handleSend() {
    if (!input.trim() || loading || ended) return;
    // If mic is on, stop it so we don't lose trailing speech after sending
    if (stt.listening) stt.stop();
    stt.reset();
    const text = input.trim();
    setInput("");

    const newMessages: Message[] = [...messages, { role: "seller", content: text, timestamp: elapsed }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const result = await sendRoleplayMessage(roleplay.id, text, elapsed);
      setMessages([...newMessages, { role: "buyer", content: result.buyerResponse, timestamp: elapsed }]);
    } catch {
      // Message send failed
    }
    setLoading(false);
  }

  async function handleEnd() {
    tts.cancel();
    if (stt.listening) stt.stop();
    setLoading(true);
    try {
      const result = await endRoleplay(roleplay.id);
      const eval_ = result.evaluation;
      setScorecard({
        rightTechniqueScore: eval_.breakdown.rightTechnique.score,
        frameworkCoverage: eval_.breakdown.frameworkCoverage.score,
        objectionHandling: eval_.breakdown.objectionHandling.score,
        meetingStructure: eval_.breakdown.meetingStructure.score,
        naturalFormulation: eval_.breakdown.naturalFormulation.score,
        totalScore: eval_.score,
        detailedFeedback: "",
      });
      setDetailedParsed({
        strengths: eval_.strengths,
        improvements: eval_.improvements,
        feedForward: eval_.feedForward,
        breakdownComments: {
          rightTechnique: eval_.breakdown.rightTechnique.comment,
          frameworkCoverage: eval_.breakdown.frameworkCoverage.comment,
          objectionHandling: eval_.breakdown.objectionHandling.comment,
          meetingStructure: eval_.breakdown.meetingStructure.comment,
          naturalFormulation: eval_.breakdown.naturalFormulation.comment,
        },
      });
      setFeedbackItems(result.timestampedFeedback || []);
      setEnded(true);
    } catch {
      // End roleplay failed
    }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]" style={{ background: "var(--bg-root)" }}>
      <div
        className="flex items-center justify-between px-[var(--space-6)] h-14 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-panel)" }}
      >
        <div className="flex items-center gap-[var(--space-3)]">
          <div
            className="w-8 h-8 flex items-center justify-center text-sm font-medium"
            style={{
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius-full)",
              color: "var(--text-secondary)",
            }}
          >
            {roleplay.persona.name.charAt(0)}
          </div>
          <div>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {roleplay.persona.name}
            </span>
            <span className="text-xs ml-[var(--space-2)]" style={{ color: "var(--text-tertiary)" }}>
              {roleplay.persona.title}, {roleplay.persona.company}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-[var(--space-3)]">
          <span className="font-mono text-sm" style={{ color: "var(--text-tertiary)" }}>
            {formatTime(elapsed)}
          </span>
          {!ended && tts.supported && (
            <button
              onClick={toggleVoice}
              aria-pressed={voiceEnabled}
              aria-label={voiceEnabled ? "Stäng av köparens röst" : "Slå på köparens röst"}
              title={
                voiceEnabled
                  ? `Köparröst: på${tts.preferredVoice ? ` (${tts.preferredVoice.name})` : ""}`
                  : "Köparröst: av"
              }
              className="flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-2)] text-xs font-medium transition-all"
              style={{
                background: voiceEnabled ? "var(--accent-muted)" : "var(--bg-card)",
                color: voiceEnabled ? "var(--accent)" : "var(--text-tertiary)",
                border: `1px solid ${voiceEnabled ? "var(--border-accent)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-md)",
              }}
            >
              {voiceEnabled ? <SpeakerIcon speaking={tts.speaking} /> : <SpeakerMutedIcon />}
              <span className="hidden sm:inline">{voiceEnabled ? "Röst på" : "Röst av"}</span>
            </button>
          )}
          {!ended && (
            <button
              onClick={handleEnd}
              disabled={loading || messages.length < 2}
              className="px-[var(--space-4)] py-[var(--space-2)] text-xs font-medium transition-all disabled:opacity-40"
              style={{
                background: "var(--error-muted)",
                color: "var(--error)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              Avsluta samtal
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[var(--space-6)] py-[var(--space-6)]">
        <div className="max-w-2xl mx-auto flex flex-col gap-[var(--space-5)]">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === "seller" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[80%] px-[var(--space-5)] py-[var(--space-4)]"
                  style={{
                    background: msg.role === "seller" ? "var(--accent)" : "var(--bg-card)",
                    color: msg.role === "seller" ? "white" : "var(--text-primary)",
                    borderRadius:
                      msg.role === "seller"
                        ? "var(--radius-xl) var(--radius-xl) var(--radius-sm) var(--radius-xl)"
                        : "var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-sm)",
                    border: msg.role === "buyer" ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  {msg.role === "buyer" && (
                    <div className="text-[10px] font-medium mb-[var(--space-1)]" style={{ color: "var(--text-tertiary)" }}>
                      {roleplay.persona.name}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && !ended && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div
                className="px-[var(--space-5)] py-[var(--space-4)] flex gap-1"
                style={{
                  background: "var(--bg-card)",
                  borderRadius: "var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full"
                    style={{ background: "var(--text-tertiary)" }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {ended && scorecard && (
        <div
          className="overflow-y-auto px-[var(--space-6)] py-[var(--space-6)]"
          style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--bg-panel)" }}
        >
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-[var(--space-4)] mb-[var(--space-6)]"
            >
              <div
                className="w-16 h-16 flex items-center justify-center flex-shrink-0"
                style={{
                  background: scorecard.totalScore >= 70 ? "var(--success-muted)" : "var(--warning-muted)",
                  borderRadius: "var(--radius-xl)",
                  border: `2px solid ${scorecard.totalScore >= 70 ? "var(--success)" : "var(--warning)"}`,
                }}
              >
                <span
                  className="font-mono text-2xl font-bold"
                  style={{ color: scorecard.totalScore >= 70 ? "var(--success)" : "var(--warning)" }}
                >
                  {scorecard.totalScore}
                </span>
              </div>
              <div>
                <h3 className="font-heading text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                  Samtal avslutat
                </h3>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {formatTime(elapsed)} · {messages.length} meddelanden
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-[var(--space-3)] mb-[var(--space-6)]">
              {[
                { label: "Teknik", score: scorecard.rightTechniqueScore, max: 25, comment: detailedParsed?.breakdownComments?.rightTechnique },
                { label: "Ramverk", score: scorecard.frameworkCoverage, max: 25, comment: detailedParsed?.breakdownComments?.frameworkCoverage },
                { label: "Invändning", score: scorecard.objectionHandling, max: 20, comment: detailedParsed?.breakdownComments?.objectionHandling },
                { label: "Struktur", score: scorecard.meetingStructure, max: 15, comment: detailedParsed?.breakdownComments?.meetingStructure },
                { label: "Naturligt", score: scorecard.naturalFormulation, max: 15, comment: detailedParsed?.breakdownComments?.naturalFormulation },
              ].map((item) => (
                <ScoreCell key={item.label} {...item} />
              ))}
            </div>

            {feedbackItems.length > 0 && (
              <div className="mb-[var(--space-6)]">
                <SectionHeading>Tidsstämplade ögonblick</SectionHeading>
                <div className="flex flex-col gap-[var(--space-3)]">
                  {feedbackItems.map((item, i) => (
                    <FeedbackMoment key={item.id || i} item={item} formatTime={formatTime} />
                  ))}
                </div>
              </div>
            )}

            {detailedParsed && (
              <div className="grid gap-[var(--space-4)] mb-[var(--space-6)]">
                {detailedParsed.strengths.length > 0 && (
                  <ListBlock title="Styrkor" items={detailedParsed.strengths} color="var(--success)" />
                )}
                {detailedParsed.improvements.length > 0 && (
                  <ListBlock title="Förbättringar" items={detailedParsed.improvements} color="var(--warning)" />
                )}
                {detailedParsed.feedForward && (
                  <div
                    className="px-[var(--space-5)] py-[var(--space-4)]"
                    style={{
                      background: "var(--accent-muted)",
                      border: "1px solid var(--border-accent)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-wider mb-[var(--space-2)]" style={{ color: "var(--accent)" }}>
                      Till nästa gång
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                      {detailedParsed.feedForward}
                    </p>
                  </div>
                )}
              </div>
            )}

            <a
              href="/"
              className="inline-flex items-center gap-[var(--space-2)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium transition-all"
              style={{
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
              }}
            >
              Tillbaka till Dashboard
            </a>
          </div>
        </div>
      )}

      {!ended && (
        <div
          className="px-[var(--space-6)] py-[var(--space-4)] flex-shrink-0"
          style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--bg-panel)" }}
        >
          <div className="max-w-2xl mx-auto">
            {stt.error && !stt.listening && (
              <div
                className="mb-[var(--space-2)] text-xs px-[var(--space-3)] py-[var(--space-2)]"
                style={{
                  background: "var(--error-muted)",
                  color: "var(--error)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
              >
                {stt.error === "not-allowed"
                  ? "Tillgång till mikrofon nekad — tillåt i webbläsarens inställningar."
                  : stt.error === "no-speech"
                  ? "Ingen röst uppfattad — tryck mic och prova igen."
                  : `Röstfel: ${stt.error}`}
              </div>
            )}
            <div className="flex gap-[var(--space-3)] items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={displayInput}
                  onChange={(e) => {
                    // If user types while listening, take control of the text
                    if (stt.listening) stt.stop();
                    setInput(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={stt.listening ? "Lyssnar..." : "Skriv ditt svar (eller tryck mic)..."}
                  rows={1}
                  disabled={loading}
                  className="w-full px-[var(--space-4)] py-[var(--space-3)] text-sm outline-none resize-none"
                  style={{
                    background: "var(--bg-input)",
                    color: "var(--text-primary)",
                    border: `1px solid ${stt.listening ? "var(--accent)" : "var(--border-default)"}`,
                    borderRadius: "var(--radius-md)",
                    boxShadow: stt.listening ? "0 0 0 3px var(--accent-muted)" : "none",
                    transition: "box-shadow 150ms ease, border-color 150ms ease",
                  }}
                />
                {stt.listening && (
                  <div
                    className="absolute left-[var(--space-3)] top-[var(--space-3)] flex items-center gap-[6px] pointer-events-none"
                    style={{ color: "var(--accent)" }}
                  >
                    <motion.span
                      animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="inline-block"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "var(--radius-full)",
                        background: "var(--accent)",
                      }}
                    />
                  </div>
                )}
              </div>

              {stt.supported && (
                <button
                  onClick={toggleMic}
                  disabled={loading}
                  aria-pressed={stt.listening}
                  aria-label={stt.listening ? "Stoppa inspelning" : "Spela in röst"}
                  title={stt.listening ? "Stoppa (sv-SE)" : "Tala svenska — tryck för att starta"}
                  className="flex items-center justify-center w-10 h-10 flex-shrink-0 transition-all disabled:opacity-30 relative"
                  style={{
                    background: stt.listening ? "var(--error-muted)" : "var(--bg-elevated)",
                    color: stt.listening ? "var(--error)" : "var(--text-secondary)",
                    border: `1px solid ${stt.listening ? "rgba(239, 68, 68, 0.3)" : "var(--border-default)"}`,
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  {stt.listening && (
                    <motion.span
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="absolute inset-0"
                      style={{
                        borderRadius: "var(--radius-md)",
                        background: "rgba(239, 68, 68, 0.25)",
                      }}
                    />
                  )}
                  <MicButtonIcon listening={stt.listening} />
                </button>
              )}

              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex items-center justify-center w-10 h-10 flex-shrink-0 transition-all disabled:opacity-30"
                style={{
                  background: "var(--accent)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                  <path d="M2 8l5-5v3h5v4H7v3L2 8z" transform="rotate(-90 8 8)" />
                </svg>
              </button>
            </div>
            {stt.supported && (
              <div
                className="mt-[var(--space-2)] text-[11px] flex items-center gap-[var(--space-2)]"
                style={{ color: "var(--text-tertiary)" }}
              >
                <span>sv-SE</span>
                <span>·</span>
                <span>
                  {stt.listening
                    ? "Diktering aktiv — tala normalt, tryck mic igen för att stoppa"
                    : "Du kan skriva eller tala på svenska"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SpeakerIcon({ speaking }: { speaking: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 6h2l3-2.5v9L5 10H3V6z" fill="currentColor" />
      <path d="M10 5.5c1 .7 1.5 1.5 1.5 2.5s-.5 1.8-1.5 2.5" opacity={speaking ? 1 : 0.5} />
      <path d="M12 3.5c2 1.3 3 2.7 3 4.5s-1 3.2-3 4.5" opacity={speaking ? 1 : 0.35} />
    </svg>
  );
}

function SpeakerMutedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 6h2l3-2.5v9L5 10H3V6z" fill="currentColor" />
      <path d="M11 6l4 4M15 6l-4 4" />
    </svg>
  );
}

function MicButtonIcon({ listening }: { listening: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="relative z-10">
      <rect
        x="5.5"
        y="2"
        width="5"
        height="8"
        rx="2.5"
        fill={listening ? "currentColor" : "none"}
      />
      <path d="M3 8.5c0 2.5 2 4.5 5 4.5s5-2 5-4.5" />
      <path d="M8 13v2" />
    </svg>
  );
}

function ScoreCell({ label, score, max, comment }: { label: string; score: number; max: number; comment?: string }) {
  const [open, setOpen] = useState(false);
  const ratio = score / max;
  const color = ratio >= 0.7 ? "var(--success)" : ratio >= 0.5 ? "var(--warning)" : "var(--error)";

  return (
    <div>
      <button
        onClick={() => comment && setOpen(!open)}
        className="w-full text-center px-[var(--space-3)] py-[var(--space-3)] transition-all"
        style={{
          background: "var(--bg-card)",
          border: `1px solid ${open ? color : "var(--border-subtle)"}`,
          borderRadius: "var(--radius-md)",
          cursor: comment ? "pointer" : "default",
        }}
      >
        <div className="font-mono text-lg font-bold" style={{ color }}>
          {score}
          <span className="text-xs ml-[2px]" style={{ color: "var(--text-tertiary)" }}>
            /{max}
          </span>
        </div>
        <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          {label}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && comment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p
              className="text-xs leading-relaxed mt-[var(--space-2)] px-[var(--space-3)] py-[var(--space-2)]"
              style={{ color: "var(--text-secondary)", background: "var(--bg-panel)", borderRadius: "var(--radius-sm)" }}
            >
              {comment}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeedbackMoment({
  item,
  formatTime,
}: {
  item: FeedbackItem;
  formatTime: (s: number) => string;
}) {
  const isPositive = item.type === "positive";
  const isMissed = item.type === "missed_opportunity";
  const color = isPositive ? "var(--success)" : isMissed ? "var(--error)" : "var(--warning)";
  const colorMuted = isPositive ? "var(--success-muted)" : isMissed ? "var(--error-muted)" : "var(--warning-muted)";
  const label = isPositive ? "Bra moment" : isMissed ? "Missad möjlighet" : "Korrigering";

  return (
    <div
      className="flex gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-4)]"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderLeft: `3px solid ${color}`,
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="flex-shrink-0 w-14 text-center">
        <span
          className="inline-block font-mono text-xs px-[var(--space-2)] py-[2px]"
          style={{ background: colorMuted, color, borderRadius: "var(--radius-sm)" }}
        >
          {formatTime(item.timestamp)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-2)] flex-wrap">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {item.techniqueName}
          </span>
          <span
            className="text-[10px] uppercase tracking-wider px-[var(--space-2)] py-[1px]"
            style={{ background: "var(--bg-elevated)", color, borderRadius: "var(--radius-sm)" }}
          >
            {label}
          </span>
        </div>

        {item.buyerSaid && (
          <div className="text-xs mb-[var(--space-1)]">
            <span style={{ color: "var(--text-tertiary)" }}>Köpare: </span>
            <span style={{ color: "var(--text-secondary)" }}>{item.buyerSaid}</span>
          </div>
        )}
        {item.userSaid && (
          <div className="text-xs mb-[var(--space-2)]">
            <span style={{ color: "var(--text-tertiary)" }}>Du: </span>
            <span style={{ color: "var(--text-secondary)" }}>{item.userSaid}</span>
          </div>
        )}

        {!isPositive && item.idealResponse && (
          <div
            className="text-xs px-[var(--space-3)] py-[var(--space-2)] mb-[var(--space-2)]"
            style={{ background: "var(--accent-muted)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
          >
            <span className="font-medium" style={{ color: "var(--accent)" }}>Ideal respons: </span>
            {item.idealResponse}
          </div>
        )}

        {item.explanation && (
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            {item.explanation}
          </p>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4
      className="text-xs uppercase tracking-wider mb-[var(--space-3)]"
      style={{ color: "var(--text-tertiary)" }}
    >
      {children}
    </h4>
  );
}

function ListBlock({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div
      className="px-[var(--space-5)] py-[var(--space-4)]"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="text-[10px] uppercase tracking-wider mb-[var(--space-2)]" style={{ color }}>
        {title}
      </div>
      <ul className="flex flex-col gap-[var(--space-2)]">
        {items.map((it, i) => (
          <li key={i} className="text-sm flex gap-[var(--space-2)]" style={{ color: "var(--text-secondary)" }}>
            <span style={{ color }}>•</span>
            <span className="flex-1">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ParsedFeedback {
  strengths: string[];
  improvements: string[];
  feedForward: string;
  breakdownComments: {
    rightTechnique?: string;
    frameworkCoverage?: string;
    objectionHandling?: string;
    meetingStructure?: string;
    naturalFormulation?: string;
  };
}

function parseDetailedFeedback(raw: string): ParsedFeedback | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return {
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      improvements: Array.isArray(data.improvements) ? data.improvements : [],
      feedForward: typeof data.feedForward === "string" ? data.feedForward : "",
      breakdownComments: data.breakdownComments || {},
    };
  } catch {
    return {
      strengths: [],
      improvements: [],
      feedForward: raw,
      breakdownComments: {},
    };
  }
}
