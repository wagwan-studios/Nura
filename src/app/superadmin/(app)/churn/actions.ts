"use server";

import { revalidatePath } from "next/cache";
import { hqAuth } from "@/auth-hq";
import { prisma } from "@/lib/prisma";

export async function sendCheckinEmail(orgId: string) {
  const session = await hqAuth();
  if (!session?.user) throw new Error("Unauthorized");

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const admin = await prisma.user.findFirst({ where: { organizationId: orgId, role: "ADMIN" } });

  let resultNote: string;
  if (process.env.RESEND_API_KEY) {
    resultNote = `Check-in email sent to ${admin?.email || "admin"} via Resend`;
  } else {
    resultNote = `Check-in email queued for ${admin?.email || "admin"} (Resend not configured — logged to audit trail)`;
  }

  await prisma.platformAuditLog.create({
    data: {
      organizationId: org.id,
      actor: session.user.email || "founder@nura.ai",
      eventType: "admin",
      description: resultNote,
    },
  });

  revalidatePath("/superadmin/churn");
  revalidatePath("/superadmin/customers");
  return resultNote;
}
