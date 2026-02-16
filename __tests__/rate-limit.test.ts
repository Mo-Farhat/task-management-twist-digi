import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  rateLimit,
  AUTH_RATE_LIMIT,
  API_RATE_LIMIT,
  AI_RATE_LIMIT,
} from "@/lib/rate-limit";

// Reset the rate limit map between tests by importing fresh modules
beforeEach(() => {
  vi.useFakeTimers();
});

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const config = { maxRequests: 3, windowMs: 60_000 };
    const result = rateLimit("test-user-1", config);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("tracks remaining requests correctly", () => {
    const config = { maxRequests: 3, windowMs: 60_000 };

    const r1 = rateLimit("test-user-2", config);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimit("test-user-2", config);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimit("test-user-2", config);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const config = { maxRequests: 2, windowMs: 60_000 };

    rateLimit("test-user-3", config);
    rateLimit("test-user-3", config);
    const result = rateLimit("test-user-3", config);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    const config = { maxRequests: 1, windowMs: 1_000 };

    const r1 = rateLimit("test-user-4", config);
    expect(r1.success).toBe(true);

    const r2 = rateLimit("test-user-4", config);
    expect(r2.success).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(1_100);

    const r3 = rateLimit("test-user-4", config);
    expect(r3.success).toBe(true);
  });

  it("tracks different identifiers independently", () => {
    const config = { maxRequests: 1, windowMs: 60_000 };

    const r1 = rateLimit("user-a", config);
    expect(r1.success).toBe(true);

    const r2 = rateLimit("user-b", config);
    expect(r2.success).toBe(true);

    // user-a is now blocked, user-b still has requests
    const r3 = rateLimit("user-a", config);
    expect(r3.success).toBe(false);
  });

  it("returns a resetAt timestamp in the future", () => {
    const config = { maxRequests: 5, windowMs: 60_000 };
    const result = rateLimit("test-user-5", config);

    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});

// ─── Preset Configurations ────────────────────────────

describe("rate limit presets", () => {
  it("AUTH_RATE_LIMIT allows 5 requests per minute", () => {
    expect(AUTH_RATE_LIMIT.maxRequests).toBe(5);
    expect(AUTH_RATE_LIMIT.windowMs).toBe(60_000);
  });

  it("API_RATE_LIMIT allows 60 requests per minute", () => {
    expect(API_RATE_LIMIT.maxRequests).toBe(60);
    expect(API_RATE_LIMIT.windowMs).toBe(60_000);
  });

  it("AI_RATE_LIMIT allows 10 requests per minute", () => {
    expect(AI_RATE_LIMIT.maxRequests).toBe(10);
    expect(AI_RATE_LIMIT.windowMs).toBe(60_000);
  });
});
