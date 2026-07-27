import crypto from "node:crypto";
import { cookies } from "next/headers";

/// Single-operator admin auth: one shared password from the environment, and a
/// signed cookie carrying only an expiry. There is no user table because there
/// is exactly one instructor; add one before handing out a second login.

const COOKIE_NAME = "gal_admin";
const SESSION_HOURS = 12;

function secret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || null;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()!).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Hash both sides first so the compare is length-independent as well as
  // timing-safe — otherwise the length of the real password leaks.
  const h = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
  return safeEqual(h(expected), h(candidate));
}

export function makeSessionValue(now = Date.now()): string {
  const expiresAt = now + SESSION_HOURS * 3600_000;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionValue(value: string | undefined): boolean {
  if (!value || !secret()) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(sign(payload), signature)) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export const adminCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  },
} as const;

/// Server-component/route-handler guard.
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionValue(store.get(COOKIE_NAME)?.value);
}
