import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
} from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { apiError, apiSuccess, getClientIp } from "@/lib/api-utils";
import { rateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(request);
    const limit = rateLimit(`register:${ip}`, AUTH_RATE_LIMIT);
    if (!limit.success) {
      return apiError("Too many registration attempts. Please try again later.", 429);
    }

    // Parse and validate input
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!errors[key]) errors[key] = [];
        errors[key].push(issue.message);
      }
      return apiError("Validation failed", 400, errors);
    }

    const { name, email, password } = parsed.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return apiError("An account with this email already exists", 409);
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, email: true, name: true },
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
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Set cookies
    await setAuthCookies(accessToken, refreshToken);

    return apiSuccess(
      {
        user: { id: user.id, email: user.email, name: user.name },
        message: "Registration successful",
      },
      201,
    );
  } catch (error) {
    console.error("Registration error:", error);
    return apiError("An unexpected error occurred", 500);
  }
}
