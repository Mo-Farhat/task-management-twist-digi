import Groq from "groq-sdk";

// ─── Client ────────────────────────────────────────────

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not defined");
  return new Groq({ apiKey });
}

// ─── Types ─────────────────────────────────────────────

export interface ExtractedActionItem {
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  suggestedDueDate: string | null;
}

export interface TranscriptAnalysis {
  summary: string;
  actionItems: ExtractedActionItem[];
}

// ─── JSON Schema for Structured Output ─────────────────

const actionItemsSchema = {
  type: "object" as const,
  properties: {
    summary: {
      type: "string" as const,
      description: "A brief 2-3 sentence summary of the meeting",
    },
    actionItems: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          title: {
            type: "string" as const,
            description: "Short, actionable task title",
          },
          description: {
            type: "string" as const,
            description:
              "Detailed description of what needs to be done, including context from the meeting",
          },
          priority: {
            type: "string" as const,
            enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
            description:
              "Priority level based on urgency and importance discussed in the meeting",
          },
          suggestedDueDate: {
            type: ["string", "null"] as const,
            description:
              "ISO 8601 date string if a deadline was mentioned, or null if no deadline was discussed",
          },
        },
        required: ["title", "description", "priority", "suggestedDueDate"],
      },
      description:
        "List of action items extracted from the transcript for the specified user",
    },
  },
  required: ["summary", "actionItems"],
};

// ─── Extraction Function ───────────────────────────────

export async function extractActionItems(
  transcript: string,
  userName: string,
): Promise<TranscriptAnalysis> {
  const groq = getGroqClient();

  const systemPrompt = `You are a meeting notes analyst. Your job is to analyze meeting transcripts and extract action items.

IMPORTANT RULES:
1. Focus on extracting action items that are relevant to the user named "${userName}".
2. Look for the user's name (or variations/nicknames) throughout the transcript.
3. If the user is directly mentioned or assigned a task, always include it.
4. If a task is assigned to "everyone" or "the team", include it as well.
5. If no tasks are found for the user, return an empty actionItems array.
6. For priority: use URGENT for things with tight deadlines or critical blockers, HIGH for important items, MEDIUM for standard tasks, LOW for nice-to-haves.
7. For suggestedDueDate: only include a date if one was explicitly mentioned in the transcript. Use ISO 8601 format (e.g., "2026-02-20T00:00:00.000Z"). If no date was mentioned, set to null.
8. Keep task titles concise and actionable (start with a verb).
9. Include relevant context from the meeting in the description.
10. Generate a brief summary of the overall meeting.

You MUST respond with valid JSON in this exact format:
{
  "summary": "A brief 2-3 sentence summary of the meeting",
  "actionItems": [
    {
      "title": "Short actionable task title starting with a verb",
      "description": "Detailed description with context from the meeting",
      "priority": "LOW | MEDIUM | HIGH | URGENT",
      "suggestedDueDate": "ISO 8601 date string or null"
    }
  ]
}`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Here is the meeting transcript to analyze:\n\n${transcript}`,
      },
    ],
    response_format: {
      type: "json_object",
    },
    temperature: 0.3,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from Groq API");
  }

  const result: TranscriptAnalysis = JSON.parse(content);
  return result;
}
