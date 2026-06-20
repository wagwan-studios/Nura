"use server";

import { revalidatePath } from "next/cache";
import { hqAuth } from "@/auth-hq";
import { prisma } from "@/lib/prisma";

export async function resolveAlert(alertId: string) {
  const session = await hqAuth();
  if (!session?.user) throw new Error("Unauthorized");

  const alert = await prisma.platformAlert.update({
    where: { id: alertId },
    data: { resolved: true, resolvedAt: new Date() },
  });

  await prisma.platformAuditLog.create({
    data: {
      organizationId: alert.organizationId,
      actor: session.user.email || "founder@nura.ai",
      eventType: "admin",
      description: `Alert resolved: ${alert.title}`,
    },
  });

  revalidatePath("/superadmin/alerts");
  revalidatePath("/superadmin");
}
