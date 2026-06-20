"use server";

import { revalidatePath } from "next/cache";
import { hqAuth } from "@/auth-hq";
import { prisma } from "@/lib/prisma";

export async function toggleFlag(flagId: string) {
  const session = await hqAuth();
  if (!session?.user) throw new Error("Unauthorized");

  const flag = await prisma.featureFlag.findUniqueOrThrow({ where: { id: flagId } });
  await prisma.featureFlag.update({ where: { id: flagId }, data: { enabled: !flag.enabled } });

  await prisma.platformAuditLog.create({
    data: {
      actor: session.user.email || "founder@nura.ai",
      eventType: "admin",
      description: `Feature flag ${!flag.enabled ? "enabled" : "disabled"}: ${flag.name}`,
    },
  });

  revalidatePath("/superadmin/flags");
  revalidatePath("/superadmin/audit");
}
