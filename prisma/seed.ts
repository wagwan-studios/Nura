import { PrismaClient, SourceType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const org = await prisma.organization.upsert({
    where: { slug: "hiqor" },
    update: {},
    create: {
      name: "HIQOR",
      slug: "hiqor",
      users: {
        create: {
          name: "Demo Admin",
          email: "demo@hiqor.com",
          passwordHash,
          role: "ADMIN",
          title: "Head of Operations",
          department: "Operations",
        },
      },
    },
  });

  const admin = await prisma.user.findUnique({ where: { email: "demo@hiqor.com" } });

  await prisma.user.upsert({
    where: { email: "demo@hiqor.com" },
    update: { title: "Head of Operations", department: "Operations" },
    create: {
      name: "Demo Admin",
      email: "demo@hiqor.com",
      passwordHash,
      role: "ADMIN",
      title: "Head of Operations",
      department: "Operations",
      organizationId: org.id,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@hiqor.com" },
    update: { title: "Compliance Analyst", department: "Compliance" },
    create: {
      name: "Demo Employee",
      email: "employee@hiqor.com",
      passwordHash,
      role: "MEMBER",
      title: "Compliance Analyst",
      department: "Compliance",
      organizationId: org.id,
    },
  });

  const salesLead = await prisma.user.upsert({
    where: { email: "sales.lead@hiqor.com" },
    update: { title: "Sales Lead", department: "Sales" },
    create: {
      name: "Sales Lead",
      email: "sales.lead@hiqor.com",
      passwordHash,
      role: "MEMBER",
      title: "Sales Lead",
      department: "Sales",
      organizationId: org.id,
    },
  });

  const engLead = await prisma.user.upsert({
    where: { email: "eng.lead@hiqor.com" },
    update: { title: "Engineering Lead", department: "Engineering" },
    create: {
      name: "Engineering Lead",
      email: "eng.lead@hiqor.com",
      passwordHash,
      role: "MEMBER",
      title: "Engineering Lead",
      department: "Engineering",
      organizationId: org.id,
    },
  });

  // Clean slate so re-running the seed gives a consistent demo dataset
  await prisma.knowledgeEntry.deleteMany({ where: { organizationId: org.id } });
  await prisma.source.deleteMany({ where: { organizationId: org.id } });

  const sourceDefs: { key: string; name: string; type: SourceType }[] = [
    { key: "partners", name: "#partner-integrations", type: "SLACK" },
    { key: "carrier-ops", name: "#carrier-ops", type: "SLACK" },
    { key: "compliance", name: "#compliance", type: "SLACK" },
    { key: "eng", name: "#eng", type: "SLACK" },
    { key: "sales", name: "#sales", type: "SLACK" },
    { key: "playbook", name: "Partner Integration Playbook", type: "NOTION" },
    { key: "carrier-guide", name: "Carrier Onboarding Guide", type: "NOTION" },
    { key: "partners-inbox", name: "partners@hiqor.com", type: "GMAIL" },
    { key: "support-jira", name: "Platform Support", type: "JIRA" },
    { key: "eng-linear", name: "Engineering", type: "LINEAR" },
    { key: "platform-repo", name: "hiqor/platform", type: "GITHUB" },
    { key: "compliance-wiki", name: "Compliance & Licensing Wiki", type: "CONFLUENCE" },
    { key: "legal-drive", name: "Legal & Licensing", type: "GOOGLE_DRIVE" },
    { key: "leadership-sync", name: "Leadership Sync Recordings", type: "ZOOM" },
    { key: "carrier-pipeline", name: "Carrier Pipeline", type: "HUBSPOT" },
  ];

  const sources: Record<string, { id: string }> = {};
  for (const def of sourceDefs) {
    sources[def.key] = await prisma.source.create({
      data: {
        name: def.name,
        type: def.type,
        status: "CONNECTED",
        lastSyncAt: new Date(),
        organizationId: org.id,
      },
    });
  }

  type EntryDef = {
    title: string;
    type: "PROCESS" | "DECISION" | "EXCEPTION" | "POLICY";
    status?: "DRAFT" | "PUBLISHED";
    summary: string;
    content: string;
    tags: string[];
    sourceKey?: string;
    citation?: { excerpt: string; author?: string };
  };

  const entries: EntryDef[] = [
    {
      title: "New aggregation partner onboarding flow",
      type: "PROCESS",
      summary: "Standard 5-step flow for bringing a new fitness, race, or wellness platform onto the HIQOR network.",
      content:
        "## Process\n\n1. Partner signs the aggregation agreement (Legal & Licensing drive).\n2. Integrations team provisions a sandbox API key and shares the embed snippet for the registration/enrollment flow.\n3. Partner embeds the HIQOR consent + eligibility widget at the point of signup (no redirect, no separate app).\n4. QA validates consent capture, identity verification fields, and eligibility payload in sandbox.\n5. Promote to production, enable live carrier offers, and add the partner to the weekly volume dashboard.\n\n## Why\nKeeping the embed redirect-free is core to our conversion advantage — partners that add a redirect step see 40%+ drop-off.",
      tags: ["onboarding", "partners", "integrations"],
      sourceKey: "playbook",
      citation: { excerpt: "Do not let a partner ship a redirect-based flow — embed must be inline at the registration moment or eligibility capture rates tank.", author: "integrations-lead" },
    },
    {
      title: "Carrier activation: sandbox to production promotion",
      type: "PROCESS",
      summary: "Carriers must complete eligibility schema mapping and a 2-week sandbox period before receiving live leads.",
      content:
        "## Process\n\n1. Carrier signs distribution agreement and assigns a technical integration contact.\n2. HIQOR maps the carrier's quote eligibility schema to our structured eligibility payload.\n3. Carrier runs in sandbox for a minimum of 2 weeks, receiving synthetic leads.\n4. Carrier ops reviews acceptance/decline rates from sandbox — must be within expected range before go-live.\n5. Flip the carrier to 'live' in the routing config; leads begin flowing in ready-to-quote format.",
      tags: ["carriers", "onboarding", "integrations"],
      sourceKey: "carrier-guide",
      citation: { excerpt: "No carrier goes live without 2 full weeks in sandbox — we've been burned before by carriers whose underwriting rules didn't match their stated eligibility schema." },
    },
    {
      title: "Consent and identity verification capture at point of participation",
      type: "PROCESS",
      summary: "Every enrollment must capture explicit insurance-offer consent and verified identity before any data reaches a carrier.",
      content:
        "## Process\n\n1. At the moment of registration (race signup, gym membership, wellness program enrollment), the HIQOR widget presents the insurance offer with a clear, separate consent checkbox.\n2. Identity is verified using the partner's existing KYC data where available; otherwise HIQOR runs a lightweight verification pass.\n3. Consent timestamp, IP, and exact offer copy version shown are logged immutably — this record is what we hand to carriers and regulators on request.\n4. Only after consent + verification succeed does the structured eligibility payload get queued for carrier delivery.",
      tags: ["consent", "compliance", "data"],
      sourceKey: "compliance-wiki",
    },
    {
      title: "Race and event platform integration setup",
      type: "PROCESS",
      summary: "Event-based partners (race registrars, ticketing platforms) follow a slightly different setup than gyms/subscriptions.",
      content:
        "## Process\n\n1. Confirm the partner's ticketing platform (most are on RunSignUp, Race Roster, or a custom stack).\n2. Insert the HIQOR widget on the checkout confirmation step, not the initial registration step — event insurance offers convert better post-purchase.\n3. Tag the integration with the event category (running, cycling, triathlon, obstacle) — this feeds carrier risk models.\n4. For recurring event series, set up a single integration that auto-applies to all events under that organizer.",
      tags: ["events", "partners", "integrations"],
      sourceKey: "partners",
      citation: { excerpt: "for race partners always put the widget on the checkout confirmation step, not registration — conversion is way better post-purchase", author: "partnerships" },
    },
    {
      title: "HIQOR Dental referral handoff to acquisition partners",
      type: "PROCESS",
      summary: "Dental leads are routed through a separate handoff queue with a 24-hour SLA to the receiving practice/network.",
      content:
        "## Process\n\n1. A user opts into a dental offer (separate consent from general insurance offers).\n2. Lead is enriched with location and plan-preference data, then queued in the HIQOR Dental handoff system.\n3. Receiving practice or network partner must acknowledge the lead within 24 hours.\n4. If unacknowledged after 24 hours, lead is reassigned to the next partner in the regional rotation.",
      tags: ["dental", "process", "partners"],
      sourceKey: "support-jira",
    },
    {
      title: "Claims data handoff between carrier and HIQOR",
      type: "PROCESS",
      summary: "HIQOR does not process claims directly — we provide enrollment and identity records to carriers on request.",
      content:
        "## Process\n\n1. Carrier submits a claims-support data request via the secure carrier portal, referencing the policy/enrollment ID.\n2. HIQOR verifies the request against the carrier's authorized contact list.\n3. The original consent record, identity verification snapshot, and eligibility payload (as sent at enrollment time) are exported and delivered via the secure portal.\n4. All claims data requests and exports are logged for audit — HIQOR never modifies historical enrollment records.",
      tags: ["claims", "carriers", "compliance"],
      sourceKey: "carrier-ops",
      citation: { excerpt: "reminder: we never edit a historical enrollment record, even to 'fix' a typo — carriers need the exact data as captured at enrollment for claims", author: "carrier-ops-lead" },
    },
    {
      title: "Incident response for carrier data feed outages",
      type: "PROCESS",
      status: "DRAFT",
      summary: "If a carrier feed goes down, leads queue for up to 6 hours before falling back to the next carrier in routing priority.",
      content:
        "## Draft — needs review\n\n1. Monitoring detects a carrier feed returning errors or timing out.\n2. On-call engineer confirms whether it's a HIQOR-side or carrier-side issue.\n3. If carrier-side: leads destined for that carrier queue for up to 6 hours.\n4. If still down after 6 hours, routing automatically falls back to the next-priority carrier for that vertical, and the original carrier is flagged in the partner dashboard.\n5. Once restored, queued leads are delivered with an 'delayed_delivery' flag so the carrier's SLA clock reflects the real delay.",
      tags: ["engineering", "incidents", "carriers"],
      sourceKey: "eng-linear",
      citation: { excerpt: "Proposing a 6hr queue-then-failover window for carrier feed outages — open to feedback before we ship this." },
    },
    {
      title: "New state licensing activation checklist",
      type: "PROCESS",
      summary: "HIQOR must hold an active insurance producer license in a state before any carrier offer can be shown to residents there.",
      content:
        "## Process\n\n1. Legal confirms HIQOR (or the relevant licensed distributor partner) holds an active producer license in the target state.\n2. Compliance reviews state-specific disclosure and consent language requirements.\n3. Engineering adds the state to the eligibility geofencing config — offers remain hidden for that state until this step completes.\n4. Compliance signs off, then the state is enabled in production.\n\n## Why\nShowing an insurance offer to a resident of a state where we're not licensed is a regulatory violation, not just a bad look.",
      tags: ["licensing", "compliance", "legal"],
      sourceKey: "legal-drive",
      citation: { excerpt: "Do not enable a new state in the geofencing config until Compliance has signed off on licensing — engineering flag alone is not sufficient." },
    },
    {
      title: "Carrier priority routing by vertical",
      type: "DECISION",
      summary: "Each insurance vertical (life, accident, dental) has a ranked carrier routing order, reviewed quarterly.",
      content:
        "## Decision\n\nFor each vertical, leads are routed to carriers in a ranked order based on: historical acceptance rate, payout terms, and integration reliability. The current life-insurance vertical ranks our top carrier first for all leads from running/triathlon partners (best acceptance rate for endurance-athlete profiles), with a secondary carrier for leads outside that profile. Rankings are reviewed quarterly by carrier ops and require sign-off from the VP of Partnerships to change.",
      tags: ["carriers", "routing", "strategy"],
      sourceKey: "carrier-pipeline",
      citation: { excerpt: "Routing rankings are locked for the quarter unless VP of Partnerships signs off — don't let an account manager change priority order ad hoc." },
    },
    {
      title: "Aggregation partner revenue share tiers",
      type: "DECISION",
      summary: "Standard partners get 50/50 revenue share; high-volume partners (10K+ monthly enrollments) get 60/40 in their favor.",
      content:
        "## Decision\n\n- Standard aggregation partners: 50/50 revenue share on carrier payouts.\n- High-volume partners (10,000+ monthly enrollments, sustained for 2+ months): 60/40 in the partner's favor.\n- Strategic partners (signed by leadership directly) may have custom terms documented in their individual agreement — check Legal & Licensing drive before assuming standard tiers apply.",
      tags: ["partners", "pricing", "revenue"],
      sourceKey: "sales",
      citation: { excerpt: "once a partner crosses 10k enrollments/month for 2 months straight, bump them to the 60/40 tier — don't make them ask", author: "vp-partnerships" },
    },
    {
      title: "HIQOR Clinical prioritized over Care Management for Q3",
      type: "DECISION",
      summary: "Engineering resourcing for Q3 favors the Clinical research platform; Care Management roadmap items are deprioritized.",
      content:
        "## Decision\n\nLeadership decided in the Q3 planning sync to prioritize HIQOR Clinical (research platform) engineering work over HIQOR Care Management this quarter, driven by a signed pilot with a research partner that has a hard data-integration deadline. Care Management feature requests should be logged but not scheduled until Q4 planning, unless a current customer contract is at risk.",
      tags: ["strategy", "roadmap", "leadership"],
      sourceKey: "leadership-sync",
      citation: { excerpt: "Q3 call: Clinical gets the eng resourcing because of the research partner's integration deadline. Care Management slips to Q4 unless a contract is at risk." },
    },
    {
      title: "Double opt-in consent required in CA and NY",
      type: "DECISION",
      summary: "California and New York enrollments require a second confirmation step before eligibility data is sent to carriers.",
      content:
        "## Decision\n\nDue to heightened regulatory scrutiny in California and New York, enrollments originating from those states require a double opt-in: the standard consent checkbox, plus a confirmation email/SMS that the user must actively confirm before their eligibility payload is sent to any carrier. This adds latency but was decided as the safer posture after compliance review.",
      tags: ["compliance", "consent", "ca", "ny"],
      sourceKey: "compliance",
      citation: { excerpt: "for CA and NY we're going with double opt-in — yes it adds a step, but compliance flagged this as the safer call given recent enforcement trends", author: "compliance-lead" },
    },
    {
      title: "Minimum volume threshold for direct vs. aggregator integration",
      type: "DECISION",
      summary: "Platforms under 1,000 monthly registrations are routed to an aggregator partner instead of a direct HIQOR integration.",
      content:
        "## Decision\n\nTo keep the integrations team focused on high-impact work, platforms with under 1,000 monthly registrations are not given a direct HIQOR integration. Instead, they're introduced to one of our aggregator partners who can onboard them under their existing embed. Platforms that grow past 1,000/month for 3 consecutive months become eligible for a direct integration on request.",
      tags: ["partners", "strategy", "integrations"],
      sourceKey: "playbook",
    },
    {
      title: "High-volume partners get a dedicated data pipeline",
      type: "EXCEPTION",
      summary: "Partners over 50,000 monthly enrollments are moved off the shared ingestion queue onto a dedicated pipeline.",
      content:
        "## Exception\n\nThe standard ingestion pipeline is shared across all partners and is sized for typical volumes. Partners exceeding 50,000 monthly enrollments are moved to a dedicated pipeline (separate queue, separate worker pool) to avoid one partner's traffic spikes degrading delivery latency for everyone else. Engineering must provision this manually — it does not happen automatically.",
      tags: ["engineering", "infrastructure", "partners"],
      sourceKey: "eng-linear",
      citation: { excerpt: "once a partner is consistently over 50k/month we need to manually cut them over to their own pipeline — it's not automatic yet, file the infra ticket", author: "platform-eng" },
    },
    {
      title: "Post-enrollment opt-out handling",
      type: "EXCEPTION",
      summary: "If a user revokes consent after their data was already sent to a carrier, HIQOR notifies the carrier but cannot retract delivered data.",
      content:
        "## Exception\n\nNormally, revoking consent before eligibility data is sent prevents any data from leaving HIQOR. If a user revokes consent *after* their eligibility payload has already been delivered to a carrier, HIQOR:\n\n1. Immediately stops any further data sharing for that user.\n2. Sends a formal revocation notice to the carrier via the secure portal.\n3. Cannot force-delete data already in the carrier's systems — that request must go directly to the carrier, and HIQOR's notice includes instructions for the user to do so.",
      tags: ["consent", "compliance", "privacy"],
      sourceKey: "compliance-wiki",
    },
    {
      title: "NY Reg 187 best-interest documentation for life insurance offers",
      type: "EXCEPTION",
      summary: "New York requires additional best-interest documentation for any life insurance offer — this is layered on top of standard consent.",
      content:
        "## Exception\n\nNew York's Regulation 187 requires that any recommendation of a life insurance product document that it's in the consumer's best interest. For NY users seeing a life insurance offer (not just accident/dental), HIQOR's widget additionally presents a short suitability questionnaire and logs the responses alongside the consent record. This is in addition to, not instead of, the standard CA/NY double opt-in.",
      tags: ["compliance", "ny", "legal", "life-insurance"],
      sourceKey: "legal-drive",
      citation: { excerpt: "NY Reg 187 best-interest docs are required specifically for life insurance offers — accident and dental offers in NY don't need the extra questionnaire, just the double opt-in." },
    },
    {
      title: "High-risk activity leads require manual carrier underwriting review",
      type: "EXCEPTION",
      summary: "Ultramarathons, technical climbing, and similar high-risk event categories skip auto-acceptance and go to manual carrier review.",
      content:
        "## Exception\n\nMost leads flow through to carriers for automated underwriting decisions. For event categories flagged as high-risk (ultramarathons over 50 miles, technical/alpine climbing, BASE jumping, and similar), several carriers require the lead to be routed to manual underwriting review instead of auto-decisioning. These categories are tagged at the integration level (see Race and event platform integration setup) so routing can apply the manual-review flag automatically.",
      tags: ["carriers", "underwriting", "events"],
      sourceKey: "carrier-ops",
      citation: { excerpt: "for ultramarathon and alpine climbing event categories, make sure the manual-review flag is set — two of our carriers will outright reject auto-decisioned leads in those categories", author: "carrier-ops" },
    },
    {
      title: "PII and consent data retention policy",
      type: "POLICY",
      summary: "Consent and identity records are retained for 7 years to support carrier claims and regulatory audits, then purged.",
      content:
        "## Policy\n\n- Consent records, identity verification snapshots, and eligibility payloads are retained for 7 years from the enrollment date, matching the longest relevant state record-keeping requirement.\n- After 7 years, records are purged via the scheduled retention job — no manual extensions without Legal sign-off.\n- Aggregate/anonymized analytics (no PII) may be retained indefinitely for product and carrier-performance reporting.",
      tags: ["data", "privacy", "compliance", "retention"],
      sourceKey: "compliance-wiki",
    },
    {
      title: "Producer licensing required before activating a new state",
      type: "POLICY",
      summary: "No carrier offer may be shown to residents of a state where HIQOR or the relevant distributor lacks an active producer license.",
      content:
        "## Policy\n\nHIQOR (or the licensed distributor partner acting on our behalf) must hold an active insurance producer license in any state where carrier offers are shown to residents. This is enforced via the geofencing config — see the New state licensing activation checklist for the activation process. Violations of this policy are treated as critical compliance incidents requiring immediate offer suspension in the affected state.",
      tags: ["licensing", "compliance", "legal", "policy"],
      sourceKey: "legal-drive",
      citation: { excerpt: "Treat any 'offer shown without active license' situation as a critical compliance incident — immediate suspension in that state, then root-cause." },
    },
    {
      title: "Carrier integration SLA: 99.9% uptime, sub-2s lead delivery",
      type: "POLICY",
      summary: "All carrier-facing integrations must meet 99.9% uptime and deliver structured eligibility payloads within 2 seconds of consent.",
      content:
        "## Policy\n\n- Carrier-facing delivery endpoints must maintain 99.9% uptime, measured monthly.\n- Eligibility payloads must be delivered to the carrier within 2 seconds of consent capture under normal load.\n- Any sustained breach (more than 1 hour) triggers an incident review and a credit/notice to the affected carrier per their distribution agreement.",
      tags: ["sla", "carriers", "engineering"],
      sourceKey: "platform-repo",
    },
    {
      title: "Carrier data feeds: encrypted in transit and at rest, service accounts only",
      type: "POLICY",
      summary: "All carrier data exchange uses TLS in transit and encryption at rest; access is restricted to dedicated service accounts.",
      content:
        "## Policy\n\n- All data exchanged with carriers (eligibility payloads, claims-support exports) must use TLS 1.2+ in transit and be encrypted at rest.\n- Access to carrier feed infrastructure is restricted to dedicated service accounts — no individual engineer credentials are used for carrier-facing systems.\n- Any new carrier integration must pass a security review confirming these requirements before go-live.",
      tags: ["security", "carriers", "engineering", "compliance"],
      sourceKey: "platform-repo",
      citation: { excerpt: "security review is a hard gate before a new carrier goes live — no individual creds on carrier-facing systems, service accounts only", author: "security-lead" },
    },
    {
      title: "All consumer-facing insurance offer copy needs compliance review",
      type: "POLICY",
      summary: "Any change to offer copy, disclosures, or consent language shown to consumers must be reviewed by Compliance before launch.",
      content:
        "## Policy\n\nMarketing, product, and partnerships may not change consumer-facing insurance offer copy, disclosure text, or consent language without Compliance review and sign-off — including A/B test variants. This applies regardless of how minor the wording change seems, since disclosure language is often what's reviewed in regulatory audits.",
      tags: ["compliance", "marketing", "legal"],
      sourceKey: "compliance",
      citation: { excerpt: "even 'minor' copy tweaks to the consent screen need compliance sign-off — including A/B variants. Auditors look at exactly what was shown.", author: "compliance-lead" },
    },
    {
      title: "Partner support tickets: 24h first response, 5-business-day resolution target",
      type: "POLICY",
      summary: "Standard SLA for aggregation partner support tickets filed via the partner portal.",
      content:
        "## Policy\n\n- First response to any partner support ticket: within 24 hours.\n- Resolution target: 5 business days for standard issues.\n- Integration-breaking issues (partner's enrollment flow is down) are treated as P1 and get a 2-hour first response with continuous updates until resolved.",
      tags: ["support", "partners", "sla"],
      sourceKey: "support-jira",
    },
    {
      title: "Raw capture: carrier feed outage runbook discussion",
      type: "PROCESS",
      status: "DRAFT",
      summary: "alice: what happens if a carrier feed goes down mid-day? raj: leads queue for up to 6 hours then failover to next carrier in that vertical.",
      content:
        "alice: quick q — if a carrier's feed goes down mid-day, what happens to the leads we'd normally send them?\nraj: they queue for up to 6 hours, then we failover to the next-priority carrier for that vertical. once the original carrier's feed is back, queued leads still go to them but flagged as delayed_delivery so their SLA clock reflects the real delay\nalice: got it, makes sense — is that documented anywhere yet?\nraj: not formally, I'll write it up",
      tags: ["raw-capture", "carriers", "incidents"],
      sourceKey: "eng",
      citation: { excerpt: "they queue for up to 6 hours, then we failover to the next-priority carrier for that vertical", author: "raj" },
    },
  ];

  const ownerByTitle: Record<string, string> = {
    "Carrier activation: sandbox to production promotion": engLead.id,
    "Incident response for carrier data feed outages": engLead.id,
    "Claims data handoff between carrier and HIQOR": engLead.id,
    "Carrier data feeds: encrypted in transit and at rest, service accounts only": engLead.id,
    "Raw capture: carrier feed outage runbook discussion": engLead.id,

    "Carrier priority routing by vertical": salesLead.id,
    "Aggregation partner revenue share tiers": salesLead.id,
    "HIQOR Clinical prioritized over Care Management for Q3": salesLead.id,
    "Minimum volume threshold for direct vs. aggregator integration": salesLead.id,
    "Race and event platform integration setup": salesLead.id,
    "HIQOR Dental referral handoff to acquisition partners": salesLead.id,

    "PII and consent data retention policy": employee.id,
    "Producer licensing required before activating a new state": employee.id,
    "NY Reg 187 best-interest documentation for life insurance offers": employee.id,
    "Double opt-in consent required in CA and NY": employee.id,
    "All consumer-facing insurance offer copy needs compliance review": employee.id,
    "Post-enrollment opt-out handling": employee.id,
    "Consent and identity verification capture at point of participation": employee.id,
    "High-risk activity leads require manual carrier underwriting review": employee.id,
  };

  for (const entry of entries) {
    const source = entry.sourceKey ? sources[entry.sourceKey] : undefined;
    await prisma.knowledgeEntry.create({
      data: {
        title: entry.title,
        type: entry.type,
        status: entry.status ?? "PUBLISHED",
        summary: entry.summary,
        content: entry.content,
        tags: entry.tags,
        organizationId: org.id,
        sourceId: source?.id,
        authorId: admin?.id,
        ownerId: ownerByTitle[entry.title] ?? admin?.id,
        citations: entry.citation
          ? {
              create: [
                {
                  excerpt: entry.citation.excerpt,
                  author: entry.citation.author,
                  sourceId: source?.id,
                },
              ],
            }
          : undefined,
      },
    });
  }

  const consentEntry = await prisma.knowledgeEntry.findFirst({
    where: { organizationId: org.id, title: "Double opt-in consent required in CA and NY" },
  });

  await prisma.platformAlert.create({
    data: {
      severity: "WARNING",
      organizationId: org.id,
      relatedEntryId: consentEntry?.id,
      assignedToId: employee.id,
      title: `Possible conflict: new draft contradicts "Double opt-in consent required in CA and NY"`,
      description:
        "A recently captured note suggests allowing single opt-in consent in CA to speed up conversions, which conflicts with the published double opt-in policy for CA and NY.",
      actionLabel: "Review conflict",
    },
  });

  console.log("Seeded organization:", org.slug);
  console.log(`Seeded ${sourceDefs.length} sources and ${entries.length} knowledge entries`);
  console.log("Demo login: demo@hiqor.com / password123");
  console.log("Employee login: employee@hiqor.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
