"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hqAuth } from "@/auth-hq";
import { prisma } from "@/lib/prisma";

async function requireFounder() {
  const session = await hqAuth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function toggleSuspend(orgId: string) {
  const user = await requireFounder();
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const newStatus = org.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";

  await prisma.organization.update({ where: { id: orgId }, data: { status: newStatus } });
  await prisma.platformAuditLog.create({
    data: {
      organizationId: orgId,
      actor: user.email || "founder@nura.ai",
      eventType: "admin",
      description: newStatus === "SUSPENDED" ? `Tenant suspended by ${user.email}` : `Tenant reactivated by ${user.email}`,
    },
  });

  revalidatePath("/superadmin/customers");
  revalidatePath("/superadmin");
}

export async function resyncIntegrations(orgId: string) {
  const user = await requireFounder();
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

  await prisma.organization.update({ where: { id: orgId }, data: { lastActiveAt: new Date() } });
  await prisma.platformAuditLog.create({
    data: {
      organizationId: orgId,
      actor: user.email || "founder@nura.ai",
      eventType: "sync",
      description: `Manual resync triggered for ${org.name} by ${user.email}`,
    },
  });

  revalidatePath("/superadmin/customers");
  revalidatePath("/superadmin");
}

export async function startImpersonation(orgId: string) {
  await requireFounder();
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

  const token = await prisma.impersonationToken.create({
    data: {
      organizationId: orgId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await prisma.platformAuditLog.create({
    data: {
      organizationId: orgId,
      actor: "founder@nura.ai",
      eventType: "admin",
      description: `Impersonation session started for ${org.name}`,
    },
  });

  redirect(`/impersonate/${token.token}`);
}
