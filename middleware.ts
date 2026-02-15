import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/", "/login", "/register"];
const API_AUTH_PATHS = ["/api/auth/login", "/api/auth/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    // For login/register pages, redirect to dashboard if already authenticated
    if (pathname === "/login" || pathname === "/register") {
      const accessToken = request.cookies.get("access_token")?.value;
      if (accessToken) {
        try {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET);
          await jwtVerify(accessToken, secret);
          return NextResponse.redirect(new URL("/dashboard", request.url));
        } catch {
          // Token invalid, continue to login page
        }
      }
    }
    return NextResponse.next();
  }

  // Protected routes — require valid JWT
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(accessToken, secret);
    return NextResponse.next();
  } catch {
    // Token expired or invalid — try refresh
    const refreshToken = request.cookies.get("refresh_token")?.value;
    if (refreshToken) {
      // Redirect through refresh flow
      const refreshUrl = new URL("/api/auth/refresh", request.url);
      const response = await fetch(refreshUrl, {
        method: "POST",
        headers: {
          cookie: `refresh_token=${refreshToken}`,
        },
      });

      if (response.ok) {
        // Get the set-cookie headers and forward them
        const newResponse = NextResponse.redirect(new URL(pathname, request.url));
        const setCookies = response.headers.getSetCookie();
        for (const cookie of setCookies) {
          newResponse.headers.append("set-cookie", cookie);
        }
        return newResponse;
      }
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
