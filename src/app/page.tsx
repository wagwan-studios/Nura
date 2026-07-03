"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SourceIcon } from "@/components/SourceIcon";
import "./landing.css";

type SourceTag = { label: string; color: string; bg: string; border: string };

const demoAnswers: { q: string; icon: string; text: string; sources: SourceTag[] }[] = [
  {
    q: "How do we handle refund requests?",
    icon: "💸",
    text: "Refunds under $200 can be approved directly by CS. Anything over $200 requires VP sign-off. For SaaS subscriptions, prorate from the cancellation date. Log all refunds in the Finance sheet by EOD.",
    sources: [
      { label: "Slack · #support", color: "#4A154B", bg: "#F4ECF7", border: "#E8D5EB" },
      { label: "Notion · CS Runbook", color: "#191919", bg: "#F5F5F5", border: "#E0E0E0" },
    ],
  },
  {
    q: "What's the process for a P0 incident?",
    icon: "🚨",
    text: "P0: page @oncall immediately — don't Slack first, too slow. Set up a war room in #incidents. CTO joins if unresolved after 15 min. Postmortem required within 48 hours of resolution.",
    sources: [
      { label: "Slack · #eng", color: "#4A154B", bg: "#F4ECF7", border: "#E8D5EB" },
      { label: "Notion · Incident Playbook", color: "#191919", bg: "#F5F5F5", border: "#E0E0E0" },
      { label: "Zoom · Eng All-hands", color: "#2D8CFF", bg: "#EFF6FF", border: "#BFDBFE" },
    ],
  },
  {
    q: "Who approves contracts over $50k?",
    icon: "📋",
    text: "Contracts under $50k can be signed by VPs. Over $50k requires CEO + legal review. NDAs are separate — any VP can sign those regardless of value. CC legal@ on all executed contracts.",
    sources: [
      { label: "Slack · #legal", color: "#4A154B", bg: "#F4ECF7", border: "#E8D5EB" },
      { label: "Email · ceo@", color: "#C5221F", bg: "#FEF2F2", border: "#FECACA" },
    ],
  },
  {
    q: "What discount can I offer to close a deal?",
    icon: "🤝",
    text: "AEs can offer up to 15% without approval. 15–30% needs VP Sales sign-off. Never exceed 30% — that requires board approval per Series A docs. Annual prepay unlocks an extra 10% regardless of tier.",
    sources: [
      { label: "Notion · Pricing Policy", color: "#191919", bg: "#F5F5F5", border: "#E0E0E0" },
      { label: "Slack · #sales", color: "#4A154B", bg: "#F4ECF7", border: "#E8D5EB" },
    ],
  },
];

type KnowledgeItem = {
  source: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  date: string;
  text: string;
};

const knowledgeItems: KnowledgeItem[] = [
  { source: "slack", label: "Slack · #support", color: "#4A154B", bg: "#F4ECF7", border: "#E8D5EB", date: "2d ago", text: "Refunds over $200 need VP approval — CS can handle under $200 directly without escalation" },
  { source: "email", label: "Email · founders@", color: "#C5221F", bg: "#FEF2F2", border: "#FECACA", date: "5d ago", text: "AWS credits negotiated at 30% off list price — must renegotiate before March or we lose the discount tier" },
  { source: "notion", label: "Notion · Runbook", color: "#191919", bg: "#F5F5F5", border: "#E0E0E0", date: "1w ago", text: "When Stripe webhook fails: check queue depth first, then DLQ before paging eng. Never page without checking both." },
  { source: "slack", label: "Slack · #eng", color: "#4A154B", bg: "#F4ECF7", border: "#E8D5EB", date: "1w ago", text: "P0 incident → page @oncall directly. Do not Slack first — too slow. CTO joins if unresolved in 15 minutes." },
  { source: "jira", label: "Jira · CS-2091", color: "#0052CC", bg: "#EFF6FF", border: "#BFDBFE", date: "2w ago", text: "Client Acme Corp — 20% lifetime discount agreed by CEO after renewal threat in September 2023. Non-negotiable." },
  { source: "zoom", label: "Zoom · All-hands", color: "#2D8CFF", bg: "#EFF6FF", border: "#BFDBFE", date: "2w ago", text: "Q3 decision: do NOT pursue enterprise segment until ARR hits $3M. Current ARR: $1.8M. Revisit January board meeting." },
  { source: "slack", label: "Slack · #legal", color: "#4A154B", bg: "#F4ECF7", border: "#E8D5EB", date: "3w ago", text: "NDAs under $50K can be signed by any VP. Above that needs legal review and CEO co-sign. No exceptions." },
  { source: "notion", label: "Notion · Pricing", color: "#191919", bg: "#F5F5F5", border: "#E0E0E0", date: "1mo ago", text: "Maximum discount without board approval is 30% — set in Series A investment docs. Annual prepay unlocks extra 10%." },
  { source: "email", label: "Email · cto@", color: "#C5221F", bg: "#FEF2F2", border: "#FECACA", date: "1mo ago", text: "Standardized on Postgres for all new services — no MySQL or MongoDB without architecture review from CTO." },
  { source: "slack", label: "Slack · #data", color: "#4A154B", bg: "#F4ECF7", border: "#E8D5EB", date: "1mo ago", text: "GDPR deletion requests: 48hr SLA, log in the compliance tracking sheet, always CC legal@ on the response." },
  { source: "zoom", label: "Zoom · 1:1 CEO", color: "#2D8CFF", bg: "#EFF6FF", border: "#BFDBFE", date: "6w ago", text: "David handles all UK enterprise deals personally — do not involve AEs without asking him first." },
  { source: "jira", label: "Jira · ENG-890", color: "#0052CC", bg: "#EFF6FF", border: "#BFDBFE", date: "2mo ago", text: "API rate limit set to 1000 req/min after the Stripe outage incident. Do not change without eng review + postmortem." },
];

const explorerFilters = [
  { key: "all", label: "All knowledge", color: "#6B7280" },
  { key: "slack", label: "Slack", color: "#4A154B" },
  { key: "notion", label: "Notion", color: "#191919" },
  { key: "email", label: "Email", color: "#C5221F" },
  { key: "jira", label: "Jira", color: "#0052CC" },
  { key: "zoom", label: "Zoom", color: "#2D8CFF" },
];

const sourceChips = [
  { label: "Slack", type: "SLACK", className: "chip-slack" },
  { label: "Notion", type: "NOTION", className: "chip-notion" },
  { label: "Gmail", type: "GMAIL", className: "chip-gmail" },
  { label: "Jira", type: "JIRA", className: "chip-jira" },
  { label: "Linear", type: "LINEAR", className: "chip-linear" },
  { label: "GitHub", type: "GITHUB", className: "chip-github" },
  { label: "Confluence", type: "CONFLUENCE", className: "chip-notion2" },
  { label: "Google Drive", type: "GOOGLE_DRIVE", className: "chip-drive" },
  { label: "Zoom", type: "ZOOM", className: "chip-zoom" },
  { label: "HubSpot", type: "HUBSPOT", className: "chip-hubspot" },
];

const featureCards = [
  { emoji: "🔍", title: "Knowledge harvester", body: "Auto-extracts processes and decisions from Slack, email, Notion, Jira, GitHub, and calls. Continuous, not a one-time import." },
  { emoji: "🗺️", title: "Living skills map", body: "Not a static index. A dynamic map of how decisions actually get made — who approves what, when exceptions apply, real escalation paths." },
  { emoji: "⚡", title: "Real-time sync", body: "When a process changes in Slack, Nura updates automatically. The brain stays current without anyone maintaining it." },
  { emoji: "💬", title: "Institutional search", body: '"How do we handle X?" — answered instantly with the exact source cited. Always traceable, never invented.' },
  { emoji: "🤖", title: "Agent context API", body: "AI agents query Nura before acting. They get exactly the context they need — no hallucinations from missing information." },
  { emoji: "🚀", title: "Onboarding mode", body: "New hires ask Nura anything about how the company works. Guided, sourced answers from day one — not a 90-day scavenger hunt." },
];

function Stat({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  return (
    <span className="stat-val" data-target={target} data-prefix={prefix} data-suffix={suffix}>
      {prefix}0{suffix}
    </span>
  );
}

export default function Home() {
  const [activeDemo, setActiveDemo] = useState<number | null>(null);
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [explorerFilter, setExplorerFilter] = useState("all");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    root.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));

    const statObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const target = parseInt(el.dataset.target || "0", 10);
          const prefix = el.dataset.prefix || "";
          const suffix = el.dataset.suffix || "";
          statObs.unobserve(el);
          let current = 0;
          const step = Math.ceil(target / 40);
          const t = setInterval(() => {
            current = Math.min(current + step, target);
            el.textContent = prefix + current + suffix;
            if (current >= target) clearInterval(t);
          }, 30);
        });
      },
      { threshold: 0.5 }
    );
    root.querySelectorAll(".stat-val[data-target]").forEach((el) => statObs.observe(el));

    return () => {
      revealObs.disconnect();
      statObs.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeDemo === null) return;
    const text = demoAnswers[activeDemo].text;
    setTypedText("");
    setIsTyping(true);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setTypedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(t);
        setIsTyping(false);
      }
    }, 14);
    return () => clearInterval(t);
  }, [activeDemo]);

  const filteredKnowledge =
    explorerFilter === "all" ? knowledgeItems : knowledgeItems.filter((k) => k.source === explorerFilter);

  return (
    <div className="nura-landing" ref={rootRef}>
      {/* NAV */}
      <nav>
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <span className="nav-logo-dot"></span>
            Nura
          </Link>
          <ul className="nav-links">
            <li><a href="#how">How it works</a></li>
            <li><a href="#explorer">Explore</a></li>
            <li><a href="#features">Features</a></li>
            <li><Link href="/login">Sign in</Link></li>
          </ul>
          <Link href="/signup" className="btn-nav">Get started</Link>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero">
        <div className="wrap">
          <div className="hero-inner">
            <div className="hero-left reveal">
              <div className="eyebrow">The memory layer for your company</div>
              <h1>Your company knows more than it can <em>remember.</em></h1>
              <p className="lead">
                Nura captures the knowledge buried in your Slack threads, email chains, and people&apos;s heads —
                and turns it into something your team and your AI can actually use.
              </p>
              <div className="btn-row">
                <Link href="/signup" className="btn-primary">
                  Get started
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
                <a href="#how" className="btn-secondary">See how it works</a>
              </div>
            </div>

            {/* INTERACTIVE DEMO */}
            <div className="hero-demo reveal" style={{ transitionDelay: "0.15s" }}>
              <div className="demo-topbar">
                <div className="demo-dots">
                  <div className="demo-dot"></div>
                  <div className="demo-dot"></div>
                  <div className="demo-dot"></div>
                </div>
                <span className="demo-title">nura — ask anything</span>
              </div>
              <div className="demo-body">
                <p className="demo-prompt-label">Try asking Nura</p>
                <div className="demo-questions">
                  {demoAnswers.map((a, idx) => (
                    <button
                      key={a.q}
                      className={`demo-q${activeDemo === idx ? " active" : ""}`}
                      onClick={() => setActiveDemo(idx)}
                    >
                      <span className="demo-q-icon">{a.icon}</span>
                      {a.q}
                    </button>
                  ))}
                </div>
                <div className="demo-response" style={{ opacity: 1 }}>
                  {activeDemo === null ? (
                    <div className="demo-response-empty">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#9CA3AF" strokeWidth="1.2" /><path d="M7 4.5v3l2 1.5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" /></svg>
                      Click a question above
                    </div>
                  ) : (
                    <div>
                      <div className="demo-answer-header">
                        <span className="demo-answer-badge">✓ Found</span>
                      </div>
                      <p className="demo-answer-text">
                        {typedText}
                        {isTyping && <span className="cursor"></span>}
                      </p>
                      <div className="demo-sources-row">
                        {demoAnswers[activeDemo].sources.map((s) => (
                          <span
                            key={s.label}
                            className="demo-source-tag"
                            style={{ color: s.color, background: s.bg, borderColor: s.border }}
                          >
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOURCES */}
      <section id="sources">
        <div className="wrap">
          <p className="sources-label">Works with the tools your knowledge already lives in</p>
          <div className="sources-row">
            {sourceChips.map((c) => (
              <span key={c.label} className={`source-chip ${c.className}`}>
                <SourceIcon type={c.type} className="source-chip-icon" />
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section id="problem">
        <div className="wrap">
          <div className="problem-grid">
            <div className="reveal problem-left">
              <div className="eyebrow">The cost of forgetting</div>
              <h2>When knowledge walks out the door, everything slows down.</h2>
              <p style={{ marginTop: 20 }}>
                Every company has the same invisible problem. The person who knew how to handle that edge case left
                six months ago. The decision buried in a 2019 email thread — nobody remembers why.
              </p>
              <p>Nobody&apos;s fault. <strong>Just how companies work.</strong> Until now.</p>
            </div>
            <div className="pain-cards reveal" style={{ transitionDelay: "0.1s" }}>
              <div className="pain-card">
                <div className="pain-emoji">🚪</div>
                <h3>Knowledge leaves with people</h3>
                <p>Every resignation is a knowledge drain. Months of context, gone with two weeks&apos; notice.</p>
              </div>
              <div className="pain-card">
                <div className="pain-emoji">🤖</div>
                <h3>AI agents hit walls</h3>
                <p>Your agents are only as smart as what they can find. Missing context means hallucinations.</p>
              </div>
              <div className="pain-card">
                <div className="pain-emoji">⏳</div>
                <h3>Onboarding takes forever</h3>
                <p>New hires spend 90 days hunting for answers that should take 90 seconds.</p>
              </div>
              <div className="pain-card">
                <div className="pain-emoji">🔁</div>
                <h3>Decisions repeat themselves</h3>
                <p>Without memory, teams relitigate the same choices. Same debates, different quarters.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="wrap">
          <div className="how-header reveal">
            <div className="eyebrow">How it works</div>
            <h2>Capture. Structure. <em>Surface.</em></h2>
            <p className="lead">Three things happen the moment you connect Nura. Nothing to configure.</p>
          </div>
          <div className="how-steps">
            <div className="how-step reveal" style={{ transitionDelay: "0.05s" }}>
              <span className="how-number">01 · Capture</span>
              <h3>Nura listens to your tools</h3>
              <p>Connects to Slack, email, Notion, Jira, and meeting recordings. Reads everything, extracts what matters — without you doing a thing.</p>
            </div>
            <div className="how-step reveal" style={{ transitionDelay: "0.12s" }}>
              <span className="how-number">02 · Structure</span>
              <h3>Nura maps how you work</h3>
              <p>Doesn&apos;t just index documents. Builds a living map of how your company actually operates: who decides what, how exceptions get handled, what the real rules are.</p>
            </div>
            <div className="how-step reveal" style={{ transitionDelay: "0.19s" }}>
              <span className="how-number">03 · Surface</span>
              <h3>Nura answers when you need it</h3>
              <p>Ask anything. Your team gets instant, sourced answers. Your AI agents get the context they need to act reliably — no hallucinations, no guesswork.</p>
            </div>
          </div>
        </div>
      </section>

      {/* KNOWLEDGE EXPLORER */}
      <section id="explorer">
        <div className="wrap">
          <div className="explorer-header reveal">
            <div className="eyebrow" style={{ background: "var(--violet-bg)", borderColor: "var(--violet-bdr)", color: "var(--violet)" }}>Explore Nura</div>
            <h2>Browse your company&apos;s <em>living memory.</em></h2>
            <p className="lead">Filter by source or topic. Everything sourced, timestamped, and always current.</p>
          </div>
          <div className="explorer-grid">
            <div>
              <p className="filter-group-label">By source</p>
              <div className="explorer-filters">
                {explorerFilters.map((f) => (
                  <button
                    key={f.key}
                    className={`filter-btn${explorerFilter === f.key ? " active" : ""}`}
                    onClick={() => setExplorerFilter(f.key)}
                  >
                    <span className="filter-dot" style={{ background: f.color }}></span> {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="knowledge-panel">
              <div className="knowledge-toolbar">
                <span className="knowledge-toolbar-left">company.brain</span>
                <span className="knowledge-count">{filteredKnowledge.length} entries</span>
              </div>
              <div className="knowledge-items">
                {filteredKnowledge.map((k, i) => (
                  <div className="k-item" key={`${k.label}-${k.text}`} style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="k-item-header">
                      <span className="k-source-tag" style={{ color: k.color, background: k.bg, borderColor: k.border }}>{k.label}</span>
                      <span className="k-date">{k.date}</span>
                    </div>
                    <p className="k-text">{k.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section id="proof">
        <div className="wrap">
          <div style={{ textAlign: "center", marginBottom: 56 }} className="reveal">
            <div className="eyebrow" style={{ background: "var(--green-bg)", borderColor: "var(--green-bdr)", color: "var(--green)" }}>Why Nura</div>
            <h2>Memory changes everything.</h2>
          </div>
          <div className="stats-grid">
            <div className="stat-card reveal">
              <Stat target={90} suffix="x faster" />
              <span className="stat-label">Onboarding for new hires — weeks to days</span>
            </div>
            <div className="stat-card reveal" style={{ transitionDelay: "0.08s" }}>
              <Stat target={0} prefix="~" suffix="% hallucinations" />
              <span className="stat-label">AI agent accuracy on company-specific decisions</span>
            </div>
            <div className="stat-card reveal" style={{ transitionDelay: "0.16s" }}>
              <Stat target={100} suffix="% retained" />
              <span className="stat-label">Institutional knowledge — even when people leave</span>
            </div>
          </div>
          <div className="testimonial-grid" style={{ marginTop: 24 }}>
            <div className="testimonial reveal">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                &quot;We lost our Head of Ops in April. Normally a disaster — three months of scrambling. With Nura,
                her replacement was fully up to speed in four days. Every process, every exception, every vendor
                relationship. Just there.&quot;
              </p>
              <div className="testimonial-author">
                <div className="author-avatar" style={{ background: "var(--orange)" }}>SC</div>
                <div>
                  <p className="author-name">Sara Chen</p>
                  <p className="author-role">CEO, Meridian Labs</p>
                </div>
              </div>
            </div>
            <div className="testimonial reveal" style={{ transitionDelay: "0.1s" }}>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                &quot;We were deploying AI agents for tier-1 support. They kept hallucinating our refund policies and
                escalation paths. We gave them Nura as the knowledge layer. Hallucinations dropped to zero in a week.
                I don&apos;t know how we shipped without this.&quot;
              </p>
              <div className="testimonial-author">
                <div className="author-avatar" style={{ background: "var(--violet)" }}>JR</div>
                <div>
                  <p className="author-name">James Reyes</p>
                  <p className="author-role">CTO, Stackform</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features">
        <div className="wrap">
          <div className="features-header reveal">
            <div className="eyebrow" style={{ background: "var(--green-bg)", borderColor: "var(--green-bdr)", color: "var(--green)" }}>Features</div>
            <h2>Built for how knowledge <em>actually works.</em></h2>
          </div>
          <div className="features-grid">
            {featureCards.map((f, i) => (
              <div className="feat-card reveal" key={f.title} style={{ transitionDelay: `${(i % 3) * 0.05}s` }}>
                <div className="feat-emoji">{f.emoji}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta">
        <div className="wrap">
          <div className="reveal" style={{ textAlign: "center" }}>
            <div className="eyebrow">Get started</div>
            <h2>Your company already knows<br />everything it needs.</h2>
            <p className="lead">Nura helps you remember it.</p>
            <div className="btn-row" style={{ justifyContent: "center", marginBottom: 14 }}>
              <Link href="/signup" className="btn-primary">Create your workspace</Link>
              <Link href="/login" className="btn-secondary" style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--white)" }}>Sign in</Link>
            </div>
            <p className="cta-fine">No credit card required. <span>Set up your company&apos;s memory in minutes.</span></p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <span className="footer-logo">
            <span className="nav-logo-dot"></span>
            Nura
          </span>
          <ul className="footer-links">
            <li><a href="#how">Product</a></li>
            <li><a href="#features">Features</a></li>
            <li><Link href="/login">Sign in</Link></li>
            <li><Link href="/signup">Get started</Link></li>
          </ul>
          <span className="footer-copy">© {new Date().getFullYear()} Nura, Inc.</span>
        </div>
      </footer>
    </div>
  );
}
