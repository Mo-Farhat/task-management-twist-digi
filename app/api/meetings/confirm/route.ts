import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { confirmActionItemsSchema } from "@/lib/validations";
import { apiError, apiSuccess, getClientIp } from "@/lib/api-utils";
import { rateLimit, API_RATE_LIMIT } from "@/lib/rate-limit";

// POST /api/meetings/confirm — Bulk-create tasks from confirmed action items
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("Not authenticated", 401);

    const ip = getClientIp(request);
    const limit = rateLimit(`tasks:${ip}`, API_RATE_LIMIT);
    if (!limit.success) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    // Parse and validate input
    const body = await request.json();
    const parsed = confirmActionItemsSchema.safeParse(body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!errors[key]) errors[key] = [];
        errors[key].push(issue.message);
      }
      return apiError("Validation failed", 400, errors);
    }

    // Verify transcript ownership
    const transcript = await prisma.meetingTranscript.findUnique({
      where: { id: parsed.data.transcriptId },
    });

    if (!transcript) {
      return apiError("Transcript not found", 404);
    }

    if (transcript.userId !== user.id) {
      return apiError("Not authorized", 403);
    }

    // Bulk create tasks
    const tasks = await prisma.task.createMany({
      data: parsed.data.actionItems.map((item) => ({
        title: item.title,
        description: item.description,
        priority: item.priority,
        dueDate: item.dueDate,
        status: "TODO" as const,
        userId: user.id,
        sourceTranscriptId: parsed.data.transcriptId,
      })),
    });

    // Fetch created tasks
    const createdTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        sourceTranscriptId: parsed.data.transcriptId,
      },
      orderBy: { createdAt: "desc" },
      take: parsed.data.actionItems.length,
    });

    return apiSuccess(
      {
        message: `${tasks.count} tasks created successfully`,
        tasks: createdTasks,
      },
      201,
    );
  } catch (error) {
    console.error("Confirm action items error:", error);
    return apiError("An unexpected error occurred", 500);
  }
}
