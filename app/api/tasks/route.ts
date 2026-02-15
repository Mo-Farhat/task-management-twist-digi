import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createTaskSchema } from "@/lib/validations";
import { apiError, apiSuccess, getClientIp } from "@/lib/api-utils";
import { rateLimit, API_RATE_LIMIT } from "@/lib/rate-limit";

// GET /api/tasks — List all tasks for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("Not authenticated", 401);

    // Parse query params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    // Build filter
    const where: Record<string, unknown> = { userId: user.id };
    if (status && ["TODO", "IN_PROGRESS", "DONE"].includes(status)) {
      where.status = status;
    }
    if (priority && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) {
      where.priority = priority;
    }

    // Validate sort field
    const validSortFields = ["createdAt", "updatedAt", "dueDate", "priority", "status", "title"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { [sortField]: order },
      include: {
        sourceTranscript: {
          select: { id: true, summary: true },
        },
      },
    });

    return apiSuccess({ tasks });
  } catch (error) {
    console.error("Get tasks error:", error);
    return apiError("An unexpected error occurred", 500);
  }
}

// POST /api/tasks — Create a new task
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("Not authenticated", 401);

    // Rate limit
    const ip = getClientIp(request);
    const limit = rateLimit(`tasks:${ip}`, API_RATE_LIMIT);
    if (!limit.success) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    // Parse and validate input
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!errors[key]) errors[key] = [];
        errors[key].push(issue.message);
      }
      return apiError("Validation failed", 400, errors);
    }

    const task = await prisma.task.create({
      data: {
        ...parsed.data,
        userId: user.id,
      },
    });

    return apiSuccess({ task }, 201);
  } catch (error) {
    console.error("Create task error:", error);
    return apiError("An unexpected error occurred", 500);
  }
}
