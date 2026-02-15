// In-memory sliding window rate limiter for serverless API routes
// Note: In a multi-instance deployment, use Redis instead

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  });
}, 60_000); // Every 60 seconds

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000, // 1 minute
};

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    rateLimitMap.set(identifier, { count: 1, resetAt });
    return { success: true, remaining: config.maxRequests - 1, resetAt };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Convenience configs for different endpoints
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60_000, // 5 attempts per minute
};

export const API_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60_000, // 60 requests per minute
};

export const AI_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000, // 10 AI requests per minute
};
