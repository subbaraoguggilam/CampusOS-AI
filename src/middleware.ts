import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "campus-os-dev-secret-change-me"
);

const PROTECTED: Record<string, string[]> = {
  "/student": ["student"],
  "/faculty": ["faculty", "hod"],
  "/admin": ["admin"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const matched = Object.entries(PROTECTED).find(([prefix]) =>
    pathname.startsWith(prefix)
  );
  if (!matched) return NextResponse.next();

  const token = req.cookies.get("campus_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;
    const [, allowedRoles] = matched;

    if (!allowedRoles.includes(role)) {
      const roleHome: Record<string, string> = {
        student: "/student",
        faculty: "/faculty",
        hod: "/faculty",
        admin: "/admin",
      };
      return NextResponse.redirect(new URL(roleHome[role] || "/login", req.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/faculty/:path*", "/admin/:path*"],
};
