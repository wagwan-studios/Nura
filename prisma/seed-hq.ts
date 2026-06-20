// Nura HQ — Super Admin demo data
// Seeds: super admin account, demo tenant roster, billing events, platform
// alerts, feature flags, audit log, and AI job telemetry.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = () => new Date();
const daysAgo = (d: number) => new Date(Date.now() - d * DAY);
const minsAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

async function main() {
  // ── SUPER ADMIN ──
  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.superAdmin.upsert({
    where: { email: "founder@nura.ai" },
    update: {},
    create: {
      email: "founder@nura.ai",
      name: "You (Founder)",
      passwordHash,
    },
  });

  // ── HIQOR (real demo tenant — already seeded by seed.ts) ──
  await prisma.organization.updateMany({
    where: { slug: "hiqor" },
    data: {
      subdomain: "hiqor",
      plan: "GROWTH",
      status: "ACTIVE",
      mrr: 39900,
      healthScore: 92,
      entriesCount: 24100,
      queriesPerDay: 1247,
      membersCount: 52,
      lastActiveAt: now(),
      createdAt: new Date("2025-02-10"),
    },
  });

  // ── DEMO TENANT ROSTER ──
  type TenantDef = {
    name: string;
    slug: string;
    plan: "TRIAL" | "STARTER" | "GROWTH" | "SCALE";
    status: "ACTIVE" | "AT_RISK" | "SUSPENDED" | "CANCELLED";
    mrr: number; // cents
    entriesCount: number;
    queriesPerDay: number;
    membersCount: number;
    healthScore: number;
    createdAt: Date;
    trialEndsAt?: Date;
    lastActiveAt?: Date;
    onboardingStage?: string;
    stageEnteredAt?: Date;
  };

  const tenants: TenantDef[] = [
    { name: "Stripe Inc", slug: "stripe-inc", plan: "SCALE", status: "ACTIVE", mrr: 120000, entriesCount: 98400, queriesPerDay: 980, membersCount: 180, healthScore: 88, createdAt: new Date("2025-01-15"), lastActiveAt: now() },
    { name: "Shopify", slug: "shopify", plan: "SCALE", status: "ACTIVE", mrr: 120000, entriesCount: 112000, queriesPerDay: 1102, membersCount: 210, healthScore: 90, createdAt: new Date("2025-03-02"), lastActiveAt: now() },
    { name: "Intercom", slug: "intercom", plan: "SCALE", status: "ACTIVE", mrr: 120000, entriesCount: 76300, queriesPerDay: 845, membersCount: 140, healthScore: 86, createdAt: new Date("2025-04-18"), lastActiveAt: now() },
    { name: "Figma", slug: "figma", plan: "GROWTH", status: "ACTIVE", mrr: 39900, entriesCount: 38210, queriesPerDay: 744, membersCount: 74, healthScore: 79, createdAt: new Date("2025-05-09"), lastActiveAt: now() },
    { name: "Vercel", slug: "vercel", plan: "GROWTH", status: "AT_RISK", mrr: 39900, entriesCount: 80400, queriesPerDay: 621, membersCount: 61, healthScore: 72, createdAt: new Date("2025-04-02"), lastActiveAt: now() },
    { name: "Linear", slug: "linear", plan: "STARTER", status: "AT_RISK", mrr: 9900, entriesCount: 9800, queriesPerDay: 310, membersCount: 28, healthScore: 65, createdAt: new Date("2025-03-20"), lastActiveAt: minsAgo(40) },
    { name: "Raycast", slug: "raycast", plan: "TRIAL", status: "ACTIVE", mrr: 0, entriesCount: 420, queriesPerDay: 38, membersCount: 12, healthScore: 55, createdAt: daysAgo(5), trialEndsAt: daysAgo(-9), lastActiveAt: minsAgo(31), onboardingStage: "ACTIVATED", stageEnteredAt: minsAgo(31) },
    { name: "Loom", slug: "loom", plan: "STARTER", status: "AT_RISK", mrr: 9900, entriesCount: 3100, queriesPerDay: 12, membersCount: 19, healthScore: 18, createdAt: new Date("2025-06-01"), lastActiveAt: daysAgo(9) },
    { name: "Maze", slug: "maze", plan: "STARTER", status: "AT_RISK", mrr: 9900, entriesCount: 5400, queriesPerDay: 22, membersCount: 16, healthScore: 38, createdAt: new Date("2025-05-22"), lastActiveAt: daysAgo(3) },
    { name: "Rows", slug: "rows", plan: "STARTER", status: "AT_RISK", mrr: 9900, entriesCount: 4100, queriesPerDay: 19, membersCount: 9, healthScore: 44, createdAt: new Date("2025-06-08"), lastActiveAt: daysAgo(6) },
    // ── Onboarding pipeline tenants (still ramping up) ──
    { name: "Notion HQ", slug: "notion-hq", plan: "TRIAL", status: "ACTIVE", mrr: 0, entriesCount: 0, queriesPerDay: 0, membersCount: 1, healthScore: 40, createdAt: minsAgo(120), trialEndsAt: daysAgo(-14), onboardingStage: "SIGNED_UP", stageEnteredAt: minsAgo(120) },
    { name: "Superhuman", slug: "superhuman", plan: "TRIAL", status: "ACTIVE", mrr: 0, entriesCount: 0, queriesPerDay: 0, membersCount: 1, healthScore: 40, createdAt: daysAgo(1), trialEndsAt: daysAgo(-13), onboardingStage: "SIGNED_UP", stageEnteredAt: daysAgo(1) },
    { name: "Clerk", slug: "clerk", plan: "TRIAL", status: "ACTIVE", mrr: 0, entriesCount: 180, queriesPerDay: 0, membersCount: 4, healthScore: 48, createdAt: daysAgo(2), trialEndsAt: daysAgo(-12), onboardingStage: "INVITED_TEAM", stageEnteredAt: daysAgo(2) },
    { name: "Resend", slug: "resend-co", plan: "TRIAL", status: "ACTIVE", mrr: 0, entriesCount: 240, queriesPerDay: 0, membersCount: 8, healthScore: 50, createdAt: daysAgo(3), trialEndsAt: daysAgo(-11), onboardingStage: "INVITED_TEAM", stageEnteredAt: daysAgo(3) },
    { name: "Trigger.dev", slug: "triggerdev", plan: "TRIAL", status: "ACTIVE", mrr: 0, entriesCount: 310, queriesPerDay: 3, membersCount: 6, healthScore: 58, createdAt: daysAgo(4), trialEndsAt: daysAgo(-10), onboardingStage: "FIRST_QUERY", stageEnteredAt: daysAgo(4) },
    { name: "Cal.com", slug: "cal-com", plan: "TRIAL", status: "ACTIVE", mrr: 0, entriesCount: 890, queriesPerDay: 51, membersCount: 11, healthScore: 70, createdAt: daysAgo(6), trialEndsAt: daysAgo(-8), onboardingStage: "ACTIVATED", stageEnteredAt: daysAgo(6) },
  ];

  const orgs: Record<string, { id: string; createdAt: Date }> = {};
  for (const t of tenants) {
    const org = await prisma.organization.upsert({
      where: { slug: t.slug },
      update: {
        plan: t.plan,
        status: t.status,
        mrr: t.mrr,
        entriesCount: t.entriesCount,
        queriesPerDay: t.queriesPerDay,
        membersCount: t.membersCount,
        healthScore: t.healthScore,
        trialEndsAt: t.trialEndsAt,
        lastActiveAt: t.lastActiveAt,
        onboardingStage: t.onboardingStage,
        stageEnteredAt: t.stageEnteredAt,
        subdomain: t.slug,
      },
      create: {
        name: t.name,
        slug: t.slug,
        subdomain: t.slug,
        plan: t.plan,
        status: t.status,
        mrr: t.mrr,
        entriesCount: t.entriesCount,
        queriesPerDay: t.queriesPerDay,
        membersCount: t.membersCount,
        healthScore: t.healthScore,
        createdAt: t.createdAt,
        trialEndsAt: t.trialEndsAt,
        lastActiveAt: t.lastActiveAt,
        onboardingStage: t.onboardingStage,
        stageEnteredAt: t.stageEnteredAt,
      },
    });
    orgs[t.slug] = { id: org.id, createdAt: t.createdAt };
  }

  const hiqor = await prisma.organization.findUniqueOrThrow({ where: { slug: "hiqor" } });
  orgs["hiqor"] = { id: hiqor.id, createdAt: hiqor.createdAt };

  // ── PLATFORM ALERTS ──
  await prisma.platformAlert.deleteMany({});
  await prisma.platformAlert.createMany({
    data: [
      {
        severity: "CRITICAL",
        title: "Jira OAuth tokens expired — 4 tenants affected",
        description:
          "Linear, Notion HQ, Cal.com, Resend have all lost Jira sync. Auto-retry failed 3 times. Requires Jira API credential rotation or tenant re-auth.",
        actionLabel: "Fix now",
        organizationId: orgs["linear"].id,
        createdAt: minsAgo(14),
      },
      {
        severity: "WARNING",
        title: "Vercel approaching Growth plan entry limit",
        description:
          "At 80,400 / 100,000 entries. At current ingestion rate, they'll hit the cap in ~6 days. Good upsell opportunity.",
        actionLabel: "Send upgrade nudge",
        organizationId: orgs["vercel"].id,
        createdAt: minsAgo(22),
      },
      {
        severity: "WARNING",
        title: "Loom usage dropped 68% — possible churn",
        description:
          "Daily queries fell from 38 to 12. Admin last active 9 days ago. No queries in 4 days. Likely disengaged before contract renewal.",
        actionLabel: "Send check-in",
        organizationId: orgs["loom"].id,
        createdAt: daysAgo(0.13),
      },
      {
        severity: "WARNING",
        title: "AI extraction latency spike — p99 at 4.2s",
        description:
          "Extraction pipeline p99 is above the 3s threshold, mainly on large Slack batch jobs. Not user-facing yet but could be soon.",
        actionLabel: "View logs",
        createdAt: minsAgo(47),
      },
      {
        severity: "INFO",
        title: "Raycast completed onboarding",
        description: "Trial customer asked their first question 31 min ago. Team of 12. Activation email auto-sent.",
        organizationId: orgs["raycast"].id,
        createdAt: minsAgo(31),
      },
      {
        severity: "INFO",
        title: "Figma upgraded from Starter → Growth",
        description: "MRR increased by $300. Upgrade triggered automatically by hitting user limit.",
        organizationId: orgs["figma"].id,
        createdAt: minsAgo(8),
      },
    ],
  });

  // ── FEATURE FLAGS ──
  await prisma.featureFlag.deleteMany({});
  await prisma.featureFlag.createMany({
    data: [
      { name: "AI-powered knowledge summaries", description: "Weekly digest email summarizing new knowledge for each user's team", enabled: true, scope: "scale · growth" },
      { name: "Zoom transcript ingestion", description: "Automatically extract knowledge from Zoom meeting recordings", enabled: true, scope: "all plans" },
      { name: "Slack /nura slash command", description: "Let employees query Nura directly from Slack with /nura", enabled: true, scope: "beta · 4 tenants" },
      { name: "GitHub PR extraction", description: "Extract engineering decisions from PR descriptions and review comments", enabled: false, scope: "private beta · 2 tenants" },
      { name: "Nura API access", description: "Allow tenants to query their knowledge base via REST API", enabled: true, scope: "scale only" },
      { name: "Custom subdomain", description: "White-label Nura under client's own domain (e.g. knowledge.acme.com)", enabled: false, scope: "scale only" },
      { name: "HubSpot integration (v2)", description: "New HubSpot connector with deal context extraction — unreleased", enabled: false, scope: "internal only" },
    ],
  });

  // ── BILLING EVENTS (drives MRR growth + revenue screens) ──
  await prisma.billingEvent.deleteMany({});
  const billingData = [
    { slug: "hiqor", eventType: "new", amountCents: 39900, planTo: "GROWTH", createdAt: orgs["hiqor"].createdAt },
    { slug: "stripe-inc", eventType: "new", amountCents: 120000, planTo: "SCALE", createdAt: orgs["stripe-inc"].createdAt },
    { slug: "shopify", eventType: "new", amountCents: 120000, planTo: "SCALE", createdAt: orgs["shopify"].createdAt },
    { slug: "intercom", eventType: "new", amountCents: 120000, planTo: "SCALE", createdAt: orgs["intercom"].createdAt },
    { slug: "figma", eventType: "upgrade", amountCents: 30000, planFrom: "STARTER", planTo: "GROWTH", createdAt: minsAgo(8) },
    { slug: "vercel", eventType: "new", amountCents: 39900, planTo: "GROWTH", createdAt: orgs["vercel"].createdAt },
    { slug: "linear", eventType: "new", amountCents: 9900, planTo: "STARTER", createdAt: orgs["linear"].createdAt },
    { slug: "loom", eventType: "new", amountCents: 9900, planTo: "STARTER", createdAt: orgs["loom"].createdAt },
    { slug: "maze", eventType: "downgrade", amountCents: -9900, planFrom: "GROWTH", planTo: "STARTER", createdAt: daysAgo(20) },
    { slug: "rows", eventType: "new", amountCents: 9900, planTo: "STARTER", createdAt: orgs["rows"].createdAt },
    { slug: "loom", eventType: "payment_failed", amountCents: 9900, createdAt: daysAgo(2) },
  ];
  for (const b of billingData) {
    await prisma.billingEvent.create({
      data: {
        organizationId: orgs[b.slug].id,
        eventType: b.eventType,
        amountCents: b.amountCents,
        planFrom: b.planFrom,
        planTo: b.planTo,
        createdAt: b.createdAt,
      },
    });
  }

  // ── AUDIT LOG ──
  await prisma.platformAuditLog.deleteMany({});
  await prisma.platformAuditLog.createMany({
    data: [
      { description: "Slack sync completed — 42 entries", organizationId: orgs["hiqor"].id, actor: "system", eventType: "sync", createdAt: minsAgo(16) },
      { description: "User invited: james.park@acme.com", organizationId: orgs["hiqor"].id, actor: "demo@hiqor.com", eventType: "auth", createdAt: minsAgo(19) },
      { description: "Plan upgraded: Starter → Growth", organizationId: orgs["figma"].id, actor: "stripe", eventType: "billing", createdAt: minsAgo(22) },
      { description: "Jira webhook failed (token expired)", organizationId: orgs["linear"].id, actor: "system", eventType: "error", createdAt: minsAgo(28) },
      { description: "Knowledge entry archived", organizationId: orgs["stripe-inc"].id, actor: "ops@stripe.com", eventType: "kb", createdAt: minsAgo(39) },
      { description: "New tenant created: Raycast", organizationId: orgs["raycast"].id, actor: "founder@nura.ai", eventType: "admin", createdAt: daysAgo(1) },
      { description: "Feature flag enabled: Slack /nura", organizationId: orgs["hiqor"].id, actor: "founder@nura.ai", eventType: "admin", createdAt: daysAgo(1) },
      { description: "Payment failed — retrying", organizationId: orgs["loom"].id, actor: "stripe", eventType: "billing", createdAt: daysAgo(2) },
      { description: "Notion sync completed — 18 entries", organizationId: orgs["stripe-inc"].id, actor: "system", eventType: "sync", createdAt: daysAgo(0.3) },
      { description: "New tenant created: Notion HQ", organizationId: orgs["notion-hq"].id, actor: "system", eventType: "admin", createdAt: minsAgo(120) },
      { description: "New tenant created: Superhuman", organizationId: orgs["superhuman"].id, actor: "system", eventType: "admin", createdAt: daysAgo(1) },
      { description: "Team invited (4 members)", organizationId: orgs["clerk"].id, actor: "system", eventType: "auth", createdAt: daysAgo(2) },
      { description: "Team invited (8 members)", organizationId: orgs["resend-co"].id, actor: "system", eventType: "auth", createdAt: daysAgo(3) },
      { description: "First query answered", organizationId: orgs["triggerdev"].id, actor: "system", eventType: "kb", createdAt: daysAgo(4) },
      { description: "Onboarding activated (50+ queries)", organizationId: orgs["cal-com"].id, actor: "system", eventType: "admin", createdAt: daysAgo(6) },
      { description: "Gmail sync completed — 9 entries", organizationId: orgs["vercel"].id, actor: "system", eventType: "sync", createdAt: minsAgo(55) },
      { description: "Suspended tenant reactivated", organizationId: orgs["rows"].id, actor: "founder@nura.ai", eventType: "admin", createdAt: daysAgo(5) },
      { description: "API key regenerated", organizationId: orgs["hiqor"].id, actor: "demo@hiqor.com", eventType: "admin", createdAt: daysAgo(3) },
    ],
  });

  // ── AI JOBS (extraction / query / embedding telemetry) ──
  await prisma.aiJob.deleteMany({});
  const sourcesForJobs = ["SLACK", "NOTION", "GMAIL", "ZOOM", "JIRA", "GITHUB"];
  const jobTenants = ["hiqor", "stripe-inc", "shopify", "figma", "vercel", "linear", "intercom"];
  const accuracyBySource: Record<string, number> = {
    SLACK: 0.961, NOTION: 0.948, GMAIL: 0.912, ZOOM: 0.884, JIRA: 0.791, GITHUB: 0.93,
  };
  const aiJobRows: {
    organizationId: string; jobType: string; source: string | null;
    latencyMs: number; success: boolean; autoAccepted: boolean | null;
    tokensUsed: number; costUsd: number; createdAt: Date;
  }[] = [];
  let seedCounter = 0;
  for (const slug of jobTenants) {
    for (const source of sourcesForJobs) {
      for (let i = 0; i < 6; i++) {
        seedCounter++;
        const acc = accuracyBySource[source];
        const success = (seedCounter % 100) / 100 < acc;
        aiJobRows.push({
          organizationId: orgs[slug].id,
          jobType: "extraction",
          source,
          latencyMs: source === "ZOOM" ? 2400 + (seedCounter % 7) * 250 : source === "JIRA" ? 2100 + (seedCounter % 5) * 300 : 1200 + (seedCounter % 9) * 150,
          success,
          autoAccepted: success ? (seedCounter % 5) !== 0 : false,
          tokensUsed: 800 + (seedCounter % 12) * 120,
          costUsd: 0.004 + ((seedCounter % 12) * 0.0006),
          createdAt: minsAgo(seedCounter * 7),
        });
      }
    }
    // query answering + embedding jobs
    for (let i = 0; i < 8; i++) {
      seedCounter++;
      aiJobRows.push({
        organizationId: orgs[slug].id,
        jobType: "query",
        source: null,
        latencyMs: 600 + (seedCounter % 6) * 120,
        success: true,
        autoAccepted: null,
        tokensUsed: 400 + (seedCounter % 8) * 90,
        costUsd: 0.0015 + ((seedCounter % 8) * 0.0004),
        createdAt: minsAgo(seedCounter * 5),
      });
    }
    for (let i = 0; i < 4; i++) {
      seedCounter++;
      aiJobRows.push({
        organizationId: orgs[slug].id,
        jobType: "embedding",
        source: null,
        latencyMs: 200 + (seedCounter % 4) * 50,
        success: true,
        autoAccepted: null,
        tokensUsed: 150 + (seedCounter % 4) * 60,
        costUsd: 0.0003 + ((seedCounter % 4) * 0.0001),
        createdAt: minsAgo(seedCounter * 11),
      });
    }
  }
  await prisma.aiJob.createMany({ data: aiJobRows });

  // ── QUERY LOGS (recent "ask" activity, used for live feed flavor) ──
  await prisma.queryLog.deleteMany({});
  await prisma.queryLog.createMany({
    data: [
      { organizationId: orgs["hiqor"].id, question: "Who approves contracts over $50k?", createdAt: minsAgo(3) },
      { organizationId: orgs["stripe-inc"].id, question: "What's our refund policy for annual plans?", createdAt: minsAgo(9) },
      { organizationId: orgs["raycast"].id, question: "How do I escalate a P0 incident?", createdAt: minsAgo(31) },
      { organizationId: orgs["cal-com"].id, question: "What discount can I offer to close a deal?", createdAt: daysAgo(1) },
    ],
  });

  console.log("HQ seed complete:", Object.keys(orgs).length, "tenants");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
