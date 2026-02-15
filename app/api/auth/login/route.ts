import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { apiError, apiSuccess, getClientIp } from "@/lib/api-utils";
import { rateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(request);
    const limit = rateLimit(`login:${ip}`, AUTH_RATE_LIMIT);
    if (!limit.success) {
      return apiError("Too many login attempts. Please try again later.", 429);
    }

    // Parse and validate input
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!errors[key]) errors[key] = [];
        errors[key].push(issue.message);
      }
      return apiError("Validation failed", 400, errors);
    }

    const { email, password } = parsed.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return apiError("Invalid email or password", 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return apiError("Invalid email or password", 401);
    }

    // Invalidate old refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate tokens
    const accessToken = await signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = await signRefreshToken({ userId: user.id, email: user.email });

    // Store refresh token hash
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set cookies
    await setAuthCookies(accessToken, refreshToken);

    return apiSuccess({
      user: { id: user.id, email: user.email, name: user.name },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    return apiError("An unexpected error occurred", 500);
  }
}
