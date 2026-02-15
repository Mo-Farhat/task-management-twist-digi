import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

// ─── Constants ─────────────────────────────────────────

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const ACCESS_COOKIE_NAME = "access_token";
const REFRESH_COOKIE_NAME = "refresh_token";

// ─── Types ─────────────────────────────────────────────

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

// ─── Password Hashing ──────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT Token Management ──────────────────────────────

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return new TextEncoder().encode(secret);
}

function getRefreshSecret(): Uint8Array {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not defined");
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: {
  userId: string;
  email: string;
}): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getJwtSecret());
}

export async function signRefreshToken(payload: {
  userId: string;
  email: string;
}): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(
  token: string,
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string,
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecret());
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

// ─── Cookie Management ─────────────────────────────────

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE_NAME);
  cookieStore.delete(REFRESH_COOKIE_NAME);
}

export async function getTokensFromCookies(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get(ACCESS_COOKIE_NAME)?.value ?? null,
    refreshToken: cookieStore.get(REFRESH_COOKIE_NAME)?.value ?? null,
  };
}

// ─── User Retrieval ────────────────────────────────────

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { accessToken } = await getTokensFromCookies();
  if (!accessToken) return null;

  const payload = await verifyAccessToken(accessToken);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true },
  });

  return user;
}
