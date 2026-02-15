import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { extractTranscriptSchema } from "@/lib/validations";
import { extractActionItems } from "@/lib/llm";
import { apiError, apiSuccess, getClientIp } from "@/lib/api-utils";
import { rateLimit, AI_RATE_LIMIT } from "@/lib/rate-limit";

// POST /api/meetings/extract — Extract action items from a transcript
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("Not authenticated", 401);

    // Rate limit (stricter for AI calls)
    const ip = getClientIp(request);
    const limit = rateLimit(`ai:${ip}`, AI_RATE_LIMIT);
    if (!limit.success) {
      return apiError("Too many AI requests. Please try again later.", 429);
    }

    // Parse and validate input
    const body = await request.json();
    const parsed = extractTranscriptSchema.safeParse(body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!errors[key]) errors[key] = [];
        errors[key].push(issue.message);
      }
      return apiError("Validation failed", 400, errors);
    }

    // Call Groq API
    const analysis = await extractActionItems(parsed.data.transcript, user.name);

    // Save transcript
    const transcript = await prisma.meetingTranscript.create({
      data: {
        rawText: parsed.data.transcript,
        summary: analysis.summary,
        userId: user.id,
      },
    });

    return apiSuccess({
      transcriptId: transcript.id,
      summary: analysis.summary,
      actionItems: analysis.actionItems,
    });
  } catch (error) {
    console.error("Extract action items error:", error);
    return apiError("Failed to analyze transcript. Please try again.", 500);
  }
}
