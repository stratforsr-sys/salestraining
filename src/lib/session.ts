import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

const SECRET = process.env.SESSION_SECRET!;
const COOKIE = "sr_session";

function getKey() {
  if (!SECRET) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(SECRET);
}

interface SessionPayload {
  userId: string;
  userName: string;
  expiresAt: string;
}

// -------------------------------------------------------
// Encrypt / Decrypt
// -------------------------------------------------------

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getKey());
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// -------------------------------------------------------
// Session lifecycle
// -------------------------------------------------------

export async function createSession(userId: string, userName: string) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const token = await encrypt({ userId, userName, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

// -------------------------------------------------------
// Read session (cached per-request)
// -------------------------------------------------------

export const getSession = cache(async (): Promise<{ userId: string; userName: string }> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  const payload = await decrypt(token);
  if (!payload?.userId) redirect("/login");
  return { userId: payload.userId, userName: payload.userName };
});

/** Returns null instead of redirecting — use in nav/optional contexts */
export const getOptionalSession = cache(async (): Promise<{ userId: string; userName: string } | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  const payload = await decrypt(token);
  if (!payload?.userId) return null;
  return { userId: payload.userId, userName: payload.userName };
});
