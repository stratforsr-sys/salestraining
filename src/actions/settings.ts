"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type RepetitionFrequency = "daily" | "everyOtherDay" | "custom";

export interface SettingsInput {
  repetitionFrequency: RepetitionFrequency;
  customSchedule: string[];
  dailyGoalMinutes: number;
  preferredTime: string;
}

export async function getUserSettings(userId: string) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) {
    return {
      repetitionFrequency: "daily" as RepetitionFrequency,
      customSchedule: [] as string[],
      dailyGoalMinutes: 60,
      preferredTime: "18:00",
    };
  }
  let customSchedule: string[] = [];
  if (settings.customSchedule) {
    try {
      const parsed = JSON.parse(settings.customSchedule);
      if (Array.isArray(parsed)) customSchedule = parsed.filter((x) => typeof x === "string");
    } catch {}
  }
  return {
    repetitionFrequency: settings.repetitionFrequency as RepetitionFrequency,
    customSchedule,
    dailyGoalMinutes: settings.dailyGoalMinutes,
    preferredTime: settings.preferredTime,
  };
}

function validate(input: SettingsInput): string | null {
  if (!["daily", "everyOtherDay", "custom"].includes(input.repetitionFrequency)) {
    return "Ogiltig repetitionsfrekvens";
  }
  if (!Number.isFinite(input.dailyGoalMinutes) || input.dailyGoalMinutes < 5 || input.dailyGoalMinutes > 600) {
    return "Dagligt mål måste vara mellan 5 och 600 minuter";
  }
  if (!/^\d{1,2}:\d{2}$/.test(input.preferredTime)) {
    return "Ogiltig tid (format HH:MM)";
  }
  const [h, m] = input.preferredTime.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return "Ogiltig tid";
  const allowed = new Set(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  if (input.repetitionFrequency === "custom") {
    if (!input.customSchedule.every((d) => allowed.has(d))) return "Ogiltiga dagar i schema";
    if (input.customSchedule.length === 0) return "Välj minst en dag för anpassat schema";
  }
  return null;
}

export async function updateUserSettings(input: SettingsInput): Promise<{ ok: true } | { error: string }> {
  const { userId } = await getSession();
  const error = validate(input);
  if (error) return { error };

  const normalizedTime = input.preferredTime
    .split(":")
    .map((p, i) => (i === 0 ? p.padStart(2, "0") : p.padStart(2, "0")))
    .join(":");

  const data = {
    repetitionFrequency: input.repetitionFrequency,
    customSchedule: input.repetitionFrequency === "custom" ? JSON.stringify(input.customSchedule) : null,
    dailyGoalMinutes: Math.round(input.dailyGoalMinutes),
    preferredTime: normalizedTime,
  };

  await prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}
