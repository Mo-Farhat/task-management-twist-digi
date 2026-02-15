import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-utils";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Not authenticated", 401);
    }

    return apiSuccess({ user });
  } catch (error) {
    console.error("Auth check error:", error);
    return apiError("An unexpected error occurred", 500);
  }
}
