"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { StreakStatus } from "@/actions/gamification";

const DISMISS_KEY = "streak:dismissed";

type NotifPermission = "default" | "granted" | "denied" | "unsupported";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function parseHHMM(s: string): { h: number; m: number } | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

export function StreakReminder({ status }: { status: StreakStatus }) {
  const [dismissed, setDismissed] = useState(false);
  const [permission, setPermission] = useState<NotifPermission>("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission as NotifPermission);
    }

    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw === todayKey()) setDismissed(true);
    } catch {}
  }, []);

  const visible = useMemo(() => {
    if (status.practicedToday) return false;
    if (dismissed) return false;
    // Show banner if the user has an active streak in danger, or has skipped 2+ days
    if (status.currentStreak > 0) return true;
    if (status.daysSinceLastPractice !== null && status.daysSinceLastPractice >= 2) return true;
    // Or if we're past preferred time and they haven't trained yet today
    const t = parseHHMM(status.preferredTime);
    if (t) {
      const now = new Date();
      if (now.getHours() > t.h || (now.getHours() === t.h && now.getMinutes() >= t.m)) {
        return status.currentStreak > 0 || status.daysSinceLastPractice !== null;
      }
    }
    return false;
  }, [status, dismissed]);

  // Schedule a browser notification at preferredTime
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (permission !== "granted") return;
    if (status.practicedToday) return;
    const t = parseHHMM(status.preferredTime);
    if (!t) return;

    const now = new Date();
    const target = new Date();
    target.setHours(t.h, t.m, 0, 0);

    const fireKey = `streak:notified:${todayKey()}`;
    const alreadyFired = (() => {
      try {
        return localStorage.getItem(fireKey) === "1";
      } catch {
        return false;
      }
    })();

    const fireNotification = () => {
      try {
        localStorage.setItem(fireKey, "1");
      } catch {}
      const title =
        status.currentStreak > 0
          ? `🔥 Håll din ${status.currentStreak}-dagars streak`
          : "Dags att träna säljteknik";
      const body =
        status.currentStreak > 0
          ? `Träna ${status.dailyGoalMinutes} min idag så behåller du streaken.`
          : `Ta ${status.dailyGoalMinutes} min för att återstarta din streak.`;
      try {
        const n = new Notification(title, {
          body,
          tag: "streak-reminder",
          icon: "/icon.png",
        });
        n.onclick = () => {
          window.focus();
          n.close();
          window.location.href = "/practice";
        };
      } catch {
        // Notification construction may fail on some mobile browsers
      }
    };

    // If we're past target and haven't fired yet today, fire immediately
    if (now >= target && !alreadyFired) {
      fireNotification();
      return;
    }

    // Otherwise, schedule
    if (now < target) {
      const msUntil = target.getTime() - now.getTime();
      const timer = window.setTimeout(fireNotification, msUntil);
      return () => window.clearTimeout(timer);
    }
  }, [permission, status]);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    const res = await Notification.requestPermission();
    setPermission(res as NotifPermission);
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, todayKey());
    } catch {}
  }

  if (!visible) return null;

  const headline =
    status.currentStreak > 0
      ? `🔥 ${status.currentStreak}-dagars streak — håll den`
      : status.daysSinceLastPractice !== null && status.daysSinceLastPractice >= 2
      ? `Du har inte tränat på ${status.daysSinceLastPractice} dagar`
      : "Dags för dagens träning";

  const sub = `Mål: ${status.dailyGoalMinutes} min · Påminnelse kl ${status.preferredTime}${
    status.minutesToday > 0 ? ` · ${status.minutesToday}/${status.dailyGoalMinutes} min idag` : ""
  }`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="px-[var(--space-5)] py-[var(--space-4)] mb-[var(--space-6)]"
        style={{
          background: "linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(239, 68, 68, 0.08))",
          border: "1px solid rgba(251, 191, 36, 0.25)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div className="flex items-start gap-[var(--space-4)] flex-wrap">
          <div
            className="w-10 h-10 flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(251, 191, 36, 0.18)",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(251, 191, 36, 0.35)",
            }}
          >
            <FlameIcon />
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {headline}
            </div>
            <div
              className="text-xs mt-[2px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {sub}
            </div>
          </div>

          <div className="flex items-center gap-[var(--space-2)] flex-wrap">
            {permission === "default" && (
              <button
                onClick={enableNotifications}
                className="px-[var(--space-3)] py-[var(--space-2)] text-xs font-medium transition-all"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                Slå på notiser
              </button>
            )}
            <Link
              href="/practice"
              className="px-[var(--space-4)] py-[var(--space-2)] text-xs font-medium transition-all"
              style={{
                background: "var(--accent)",
                color: "var(--text-inverse)",
                borderRadius: "var(--radius-md)",
              }}
            >
              Öva nu
            </Link>
            <button
              onClick={dismiss}
              aria-label="Dölj påminnelse"
              className="w-8 h-8 flex items-center justify-center transition-colors"
              style={{
                background: "transparent",
                color: "var(--text-tertiary)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>
        </div>

        {permission === "denied" && (
          <div
            className="mt-[var(--space-3)] text-[11px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Notiser blockerade — slå på i webbläsarens inställningar för att få påminnelser kl {status.preferredTime}.
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function FlameIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="var(--xp-gold)">
      <path d="M8 1c0 2.5-3 4-3 7a4 4 0 008 0c0-2-1-3.5-2-4.5-.5 1.5-1.5 2-2 1.5C9 4 9 2.5 8 1z" />
    </svg>
  );
}
