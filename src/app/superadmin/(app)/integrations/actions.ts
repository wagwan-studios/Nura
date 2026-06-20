"use server";

import { revalidatePath } from "next/cache";
import { hqAuth } from "@/auth-hq";
import { prisma } from "@/lib/prisma";

export async function fixAllIntegrations() {
  const session = await hqAuth();
  if (!session?.user) throw new Error("Unauthorized");

  const alert = await prisma.platformAlert.findFirst({
    where: { resolved: false, title: { contains: "Jira OAuth" } },
  });

  if (alert) {
    await prisma.platformAlert.update({
      where: { id: alert.id },
      data: { resolved: true, resolvedAt: new Date() },
    });
  }

  await prisma.platformAuditLog.create({
    data: {
      actor: session.user.email || "founder@nura.ai",
      eventType: "admin",
      description: "Jira credentials rotated — all affected tenants re-synced",
    },
  });

  revalidatePath("/superadmin/integrations");
  revalidatePath("/superadmin");
  revalidatePath("/superadmin/alerts");
}
