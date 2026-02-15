import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updateTaskSchema } from "@/lib/validations";
import { apiError, apiSuccess, getClientIp } from "@/lib/api-utils";
import { rateLimit, API_RATE_LIMIT } from "@/lib/rate-limit";

// Helper to extract task ID from URL
function getTaskId(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split("/");
  return segments[segments.length - 1];
}

// PUT /api/tasks/:id — Update a task
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("Not authenticated", 401);

    const ip = getClientIp(request);
    const limit = rateLimit(`tasks:${ip}`, API_RATE_LIMIT);
    if (!limit.success) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    const taskId = getTaskId(request);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(taskId)) {
      return apiError("Invalid task ID", 400);
    }

    // Find task and verify ownership
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      return apiError("Task not found", 404);
    }

    if (existingTask.userId !== user.id) {
      return apiError("Not authorized to update this task", 403);
    }

    // Parse and validate input
    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!errors[key]) errors[key] = [];
        errors[key].push(issue.message);
      }
      return apiError("Validation failed", 400, errors);
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: parsed.data,
    });

    return apiSuccess({ task });
  } catch (error) {
    console.error("Update task error:", error);
    return apiError("An unexpected error occurred", 500);
  }
}

// DELETE /api/tasks/:id — Delete a task
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("Not authenticated", 401);

    const taskId = getTaskId(request);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(taskId)) {
      return apiError("Invalid task ID", 400);
    }

    // Find task and verify ownership
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      return apiError("Task not found", 404);
    }

    if (existingTask.userId !== user.id) {
      return apiError("Not authorized to delete this task", 403);
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return apiSuccess({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    return apiError("An unexpected error occurred", 500);
  }
}
