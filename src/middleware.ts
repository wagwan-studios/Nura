import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { HQ_SESSION_COOKIE } from "@/auth-hq";

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

if (!AUTH_SECRET) {
  throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required");
}

async function getNormalUserToken(req: NextRequest) {
  const isHttps =
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https";

  const cookieName = isHttps
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  return getToken({
    req,
    secret: AUTH_SECRET,
    cookieName,
  });
}

async function getSuperAdminToken(req: NextRequest) {
  return getToken({
    req,
    secret: AUTH_SECRET,
    cookieName: HQ_SESSION_COOKIE,
  });
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = await getNormalUserToken(req);

    if (!token || !token.sub || !token.role || !token.organizationId) {
      return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
    }
  }

  if (pathname.startsWith("/superadmin") && pathname !== "/superadmin/login") {
    const token = await getSuperAdminToken(req);

    if (!token || !token.sub) {
      return NextResponse.redirect(
        new URL("/superadmin/login", req.nextUrl.origin)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/superadmin/:path*"],
};
// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import { getToken } from "next-auth/jwt";
// import { HQ_SESSION_COOKIE } from "@/auth-hq";

// export default async function middleware(req: NextRequest) {
//   const { pathname } = req.nextUrl;

//   if (pathname.startsWith("/dashboard")) {
//     const token = await getToken({ req, secret: process.env.AUTH_SECRET });
//     if (!token) {
//       return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
//     }
//   }

//   if (pathname.startsWith("/superadmin") && pathname !== "/superadmin/login") {
//     const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName: HQ_SESSION_COOKIE });
//     if (!token) {
//       return NextResponse.redirect(new URL("/superadmin/login", req.nextUrl.origin));
//     }
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/dashboard/:path*", "/superadmin/:path*"],
// };
