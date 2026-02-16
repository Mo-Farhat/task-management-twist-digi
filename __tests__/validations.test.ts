import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  createTaskSchema,
  updateTaskSchema,
  extractTranscriptSchema,
  confirmActionItemsSchema,
} from "@/lib/validations";

// ─── Register Schema ───────────────────────────────────

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "Password1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = registerSchema.safeParse({
      name: "J",
      email: "john@example.com",
      password: "Password1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = registerSchema.safeParse({
      name: "A".repeat(101),
      email: "john@example.com",
      password: "Password1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = registerSchema.safeParse({
      name: "John Doe",
      email: "not-an-email",
      password: "Password1",
    });
    expect(result.success).toBe(false);
  });

  it("normalizes email to lowercase", () => {
    const result = registerSchema.safeParse({
      name: "John Doe",
      email: "JOHN@EXAMPLE.COM",
      password: "Password1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("john@example.com");
    }
  });

  it("rejects password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "Pass1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase letter", () => {
    const result = registerSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "password1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without lowercase letter", () => {
    const result = registerSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "PASSWORD1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without digit", () => {
    const result = registerSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "Passwordd",
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from name", () => {
    const result = registerSchema.safeParse({
      name: "  John Doe  ",
      email: "john@example.com",
      password: "Password1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John Doe");
    }
  });
});

// ─── Login Schema ──────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      email: "john@example.com",
      password: "anypassword",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "bad-email",
      password: "password",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "john@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Create Task Schema ────────────────────────────────

describe("createTaskSchema", () => {
  it("accepts minimal task (title only)", () => {
    const result = createTaskSchema.safeParse({
      title: "Fix bug",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("TODO");
      expect(result.data.priority).toBe("MEDIUM");
    }
  });

  it("accepts full task data", () => {
    const result = createTaskSchema.safeParse({
      title: "Deploy app",
      description: "Deploy to production on Vercel",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: "2026-03-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createTaskSchema.safeParse({
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 255 characters", () => {
    const result = createTaskSchema.safeParse({
      title: "A".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 2000 characters", () => {
    const result = createTaskSchema.safeParse({
      title: "Valid title",
      description: "A".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status enum", () => {
    const result = createTaskSchema.safeParse({
      title: "Task",
      status: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid priority enum", () => {
    const result = createTaskSchema.safeParse({
      title: "Task",
      priority: "CRITICAL",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = createTaskSchema.safeParse({
      title: "Task",
      dueDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null dueDate", () => {
    const result = createTaskSchema.safeParse({
      title: "Task",
      dueDate: null,
    });
    expect(result.success).toBe(true);
  });
});

// ─── Update Task Schema ────────────────────────────────

describe("updateTaskSchema", () => {
  it("accepts partial update (status only)", () => {
    const result = updateTaskSchema.safeParse({
      status: "DONE",
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial update (priority only)", () => {
    const result = updateTaskSchema.safeParse({
      priority: "URGENT",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no changes)", () => {
    const result = updateTaskSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = updateTaskSchema.safeParse({
      status: "ARCHIVED",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Extract Transcript Schema ─────────────────────────

describe("extractTranscriptSchema", () => {
  it("accepts valid transcript", () => {
    const result = extractTranscriptSchema.safeParse({
      transcript: "John said he will handle the deployment by Friday.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts transcript with optional name", () => {
    const result = extractTranscriptSchema.safeParse({
      transcript: "Meeting notes from sprint planning session today.",
      name: "Sarah",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Sarah");
    }
  });

  it("accepts transcript without name (defaults to undefined)", () => {
    const result = extractTranscriptSchema.safeParse({
      transcript: "Meeting notes from sprint planning session today.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBeUndefined();
    }
  });

  it("rejects transcript shorter than 10 characters", () => {
    const result = extractTranscriptSchema.safeParse({
      transcript: "Short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects transcript longer than 50,000 characters", () => {
    const result = extractTranscriptSchema.safeParse({
      transcript: "A".repeat(50001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = extractTranscriptSchema.safeParse({
      transcript: "Valid transcript content here.",
      name: "J",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Confirm Action Items Schema ───────────────────────

describe("confirmActionItemsSchema", () => {
  it("accepts valid confirmation data", () => {
    const result = confirmActionItemsSchema.safeParse({
      transcriptId: "550e8400-e29b-41d4-a716-446655440000",
      actionItems: [
        {
          title: "Deploy to production",
          description: "Deploy the app before Friday",
          priority: "HIGH",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid transcript UUID", () => {
    const result = confirmActionItemsSchema.safeParse({
      transcriptId: "not-a-uuid",
      actionItems: [{ title: "Task" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty action items array", () => {
    const result = confirmActionItemsSchema.safeParse({
      transcriptId: "550e8400-e29b-41d4-a716-446655440000",
      actionItems: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 50 action items", () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      title: `Task ${i + 1}`,
    }));
    const result = confirmActionItemsSchema.safeParse({
      transcriptId: "550e8400-e29b-41d4-a716-446655440000",
      actionItems: items,
    });
    expect(result.success).toBe(false);
  });

  it("defaults priority to MEDIUM when not specified", () => {
    const result = confirmActionItemsSchema.safeParse({
      transcriptId: "550e8400-e29b-41d4-a716-446655440000",
      actionItems: [{ title: "Simple task" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actionItems[0].priority).toBe("MEDIUM");
    }
  });
});
