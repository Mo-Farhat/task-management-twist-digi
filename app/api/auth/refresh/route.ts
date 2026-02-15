import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  getTokensFromCookies,
} from "@/lib/auth";
import { apiError, apiSuccess, getClientIp } from "@/lib/api-utils";
import { rateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(request);
    const limit = rateLimit(`refresh:${ip}`, AUTH_RATE_LIMIT);
    if (!limit.success) {
      return apiError("Too many refresh attempts. Please try again later.", 429);
    }

    // Get refresh token from cookies
    const { refreshToken } = await getTokensFromCookies();
    if (!refreshToken) {
      return apiError("No refresh token provided", 401);
    }

    // Verify refresh token JWT
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return apiError("Invalid or expired refresh token", 401);
    }

    // Find stored refresh tokens for this user
    const storedTokens = await prisma.refreshToken.findMany({
      where: {
        userId: payload.userId,
        expiresAt: { gt: new Date() },
      },
    });

    // Verify against stored hash
    let validToken = false;
    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, stored.tokenHash);
      if (isMatch) {
        validToken = true;
        break;
      }
    }

    if (!validToken) {
      return apiError("Invalid refresh token", 401);
    }

    // Invalidate all old refresh tokens (rotation)
    await prisma.refreshToken.deleteMany({
      where: { userId: payload.userId },
    });

    // Issue new tokens
    const newAccessToken = await signAccessToken({
      userId: payload.userId,
      email: payload.email,
    });
    const newRefreshToken = await signRefreshToken({
      userId: payload.userId,
      email: payload.email,
    });

    // Store new refresh token hash
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    await prisma.refreshToken.create({
      data: {
        userId: payload.userId,
        tokenHash: newRefreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set new cookies
    await setAuthCookies(newAccessToken, newRefreshToken);

    return apiSuccess({ message: "Tokens refreshed successfully" });
  } catch (error) {
    console.error("Refresh error:", error);
    return apiError("An unexpected error occurred", 500);
  }
}
