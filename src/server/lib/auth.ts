import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SESSION_COOKIE = "ig-scheduler-session";
const SESSION_EXPIRY_DAYS = 7;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return secret;
}

function getAppPasswordHash(): string {
  const password = process.env.APP_PASSWORD;
  if (!password) throw new Error("APP_PASSWORD environment variable is required");
  return password;
}

export async function verifyPassword(input: string): Promise<boolean> {
  const stored = getAppPasswordHash();
  // For simplicity: direct compare. In production, store a bcrypt hash in env.
  // If the stored value looks like a bcrypt hash, use bcrypt.compare
  if (stored.startsWith("$2")) {
    return bcrypt.compare(input, stored);
  }
  return input === stored;
}

export function createSessionToken(): string {
  return jwt.sign(
    { authenticated: true },
    getJwtSecret(),
    { expiresIn: `${SESSION_EXPIRY_DAYS}d` }
  );
}

export function verifySessionToken(token: string): boolean {
  try {
    jwt.verify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export { SESSION_COOKIE, SESSION_EXPIRY_DAYS };
