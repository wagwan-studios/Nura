import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const impersonation = await prisma.impersonationToken.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!impersonation || impersonation.expiresAt < new Date()) {
    return new Response("This impersonation link has expired or is invalid.", { status: 410 });
  }

  const adminUser = await prisma.user.findFirst({
    where: { organizationId: impersonation.organizationId, role: "ADMIN" },
  });

  if (!adminUser) {
    return new Response("No admin user found for this organization.", { status: 404 });
  }

  const jwt = await encode({
    secret: process.env.AUTH_SECRET!,
    salt: "authjs.session-token",
    token: {
      sub: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      organizationId: adminUser.organizationId,
      role: adminUser.role,
      impersonating: true,
      impersonatedOrgName: impersonation.organization.name,
    },
  });

  const res = new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  res.headers.append(
    "Set-Cookie",
    `authjs.session-token=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
  );
  return res;
}
