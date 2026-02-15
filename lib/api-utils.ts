import { NextResponse } from "next/server";

// Sanitized API error response — never leaks stack traces
export function apiError(
  message: string,
  status: number = 400,
  errors?: Record<string, string[]>,
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(errors && { errors }),
    },
    { status },
  );
}

export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// Extract client IP for rate limiting
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
