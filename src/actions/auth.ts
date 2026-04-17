"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

// -------------------------------------------------------
// Login
// -------------------------------------------------------

export type LoginState =
  | { error: string }
  | { success: true }
  | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const name = (formData.get("name") as string | null)?.trim();
  const pin = (formData.get("pin") as string | null)?.trim();
  const rawRedirect = (formData.get("redirectTo") as string | null) ?? "";
  const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";

  if (!name || !pin) {
    return { error: "Fyll i namn och PIN." };
  }

  const user = await prisma.user.findFirst({
    where: { name: { equals: name } },
  });

  if (!user || user.pin !== pin) {
    return { error: "Fel namn eller PIN." };
  }

  await createSession(user.id, user.name);
  redirect(redirectTo);
}

// -------------------------------------------------------
// Logout
// -------------------------------------------------------

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
