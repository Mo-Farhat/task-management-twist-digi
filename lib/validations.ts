import { z } from "zod";

// ─── Auth Schemas ──────────────────────────────────────

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be at most 255 characters")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one digit",
    ),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

// ─── Task Schemas ──────────────────────────────────────

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters")
    .trim(),
  description: z
    .string()
    .max(2000, "Description must be at most 2000 characters")
    .trim()
    .optional()
    .nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional().default("TODO"),
  priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
    .optional()
    .default("MEDIUM"),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be at most 2000 characters")
    .trim()
    .optional()
    .nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : val)),
});

// ─── Meeting Transcript Schemas ────────────────────────

export const extractTranscriptSchema = z.object({
  transcript: z
    .string()
    .min(10, "Transcript must be at least 10 characters")
    .max(50000, "Transcript must be at most 50,000 characters")
    .trim(),
});

export const confirmActionItemsSchema = z.object({
  transcriptId: z.string().uuid("Invalid transcript ID"),
  actionItems: z
    .array(
      z.object({
        title: z.string().min(1).max(255).trim(),
        description: z.string().max(2000).trim().optional().nullable(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
        dueDate: z
          .string()
          .datetime({ offset: true })
          .optional()
          .nullable()
          .transform((val) => (val ? new Date(val) : null)),
      }),
    )
    .min(1, "At least one action item is required")
    .max(50, "Maximum 50 action items allowed"),
});

// ─── Type Exports ──────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ExtractTranscriptInput = z.infer<typeof extractTranscriptSchema>;
export type ConfirmActionItemsInput = z.infer<typeof confirmActionItemsSchema>;
