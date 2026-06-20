"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function resolveCustomerAlert(alertId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.platformAlert.update({
    where: { id: alertId, organizationId: session.user.organizationId },
    data: { resolved: true, resolvedAt: new Date() },
  });

  revalidatePath("/dashboard/alerts");
}
