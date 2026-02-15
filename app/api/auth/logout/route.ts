import { prisma } from "@/lib/prisma";
import { clearAuthCookies, getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-utils";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (user) {
      // Invalidate all refresh tokens for this user
      await prisma.refreshToken.deleteMany({
        where: { userId: user.id },
      });
    }

    // Clear cookies regardless
    await clearAuthCookies();

    return apiSuccess({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear cookies even on error
    await clearAuthCookies();
    return apiError("An unexpected error occurred", 500);
  }
}
