import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { HQ_SESSION_COOKIE } from "@/auth-hq";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
    }
  }

  if (pathname.startsWith("/superadmin") && pathname !== "/superadmin/login") {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName: HQ_SESSION_COOKIE });
    if (!token) {
      return NextResponse.redirect(new URL("/superadmin/login", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/superadmin/:path*"],
};
