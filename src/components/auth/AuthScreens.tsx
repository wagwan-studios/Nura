"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Screen = "signin" | "signup" | "verify-email" | "forgot" | "forgot-sent";

const DEMOS = [
  {
    q: "Who approves contracts over $50k?",
    text: "Contracts under $50k can be signed by VPs. Over $50k requires CEO + legal review. NDAs are separate — any VP can sign those regardless of value.",
    sources: [
      { label: "Slack · #legal", color: "#4A154B", bg: "#F4ECF7", border: "#E8D5EB" },
      { label: "Email · ceo@", color: "#C5221F", bg: "#FEF2F2", border: "#FECACA" },
    ],
  },
  {
    q: "What discount can I offer to close a deal?",
    text: "AEs can offer up to 15% without approval. 15–30% needs VP Sales sign-off. Never exceed 30% — that requires board approval per Series A docs.",
    sources: [
      { label: "Notion · Pricing", color: "#191919", bg: "#F5F5F5", border: "#E0E0E0" },
      { label: "Slack · #sales", color: "#4A154B", bg: "#F4ECF7", border: "#E8D5EB" },
    ],
  },
  {
    q: "What's the P0 incident process?",
    text: "P0: page @oncall immediately — don't Slack first, too slow. Set up a war room in #incidents. CTO joins if unresolved after 15 min.",
    sources: [
      { label: "Slack · #eng", color: "#4A154B", bg: "#F4ECF7", border: "#E8D5EB" },
      { label: "Notion · Playbook", color: "#191919", bg: "#F5F5F5", border: "#E0E0E0" },
    ],
  },
];

export default function AuthScreens({ initialScreen = "signin" }: { initialScreen?: Screen }) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [demoIdx, setDemoIdx] = useState(0);

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPw, setSigninPw] = useState("");
  const [signinError, setSigninError] = useState<string | null>(null);
  const [signinLoading, setSigninLoading] = useState(false);

  const [signupForm, setSignupForm] = useState({ organizationName: "", name: "", email: "", password: "" });
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setDemoIdx((i) => (i + 1) % DEMOS.length), 4500);
    return () => clearInterval(interval);
  }, []);

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setSigninLoading(true);
    setSigninError(null);
    const res = await signIn("credentials", { email: signinEmail, password: signinPw, redirect: false });
    setSigninLoading(false);
    if (res?.error) {
      setSigninError("Invalid email or password");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  function updateSignup(field: keyof typeof signupForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setSignupForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError(null);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupForm),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSignupError(data.error ?? "Something went wrong");
      setSignupLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email: signupForm.email,
      password: signupForm.password,
      redirect: false,
    });

    setSignupLoading(false);
    if (signInRes?.error) {
      setSigninError("Account created, but sign in failed. Try logging in.");
      setScreen("signin");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const demo = DEMOS[demoIdx];

  return (
    <div className="auth-app">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <a className="auth-logo" href="/">
          <span className="logo-dot"></span>
          Nura
        </a>

        <div className="auth-form-wrap">
          {/* SIGN IN */}
          <div className={`auth-screen${screen === "signin" ? " active" : ""}`}>
            <div className="auth-heading">Welcome back.</div>
            <div className="auth-sub">Sign in to your company&apos;s memory layer.</div>

            <button className="social-btn" type="button">
              <span className="social-icon">
                <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              </span>
              Continue with Google
            </button>
            <button className="social-btn" type="button">
              <span className="social-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              </span>
              Continue with Slack
            </button>

            <div className="divider">
              <div className="divider-line"></div>
              <span className="divider-text">or sign in with email</span>
              <div className="divider-line"></div>
            </div>

            <form onSubmit={handleSignin}>
              <div className="field">
                <label className="field-label">Work email</label>
                <input
                  className="field-input"
                  type="email"
                  placeholder="you@company.com"
                  required
                  value={signinEmail}
                  onChange={(e) => setSigninEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <div className="field-link-row">
                  <label className="field-label" style={{ marginBottom: 0 }}>Password</label>
                  <button type="button" className="auth-link" onClick={() => setScreen("forgot")}>Forgot password?</button>
                </div>
                <input
                  className="field-input"
                  type="password"
                  placeholder="••••••••••"
                  required
                  value={signinPw}
                  onChange={(e) => setSigninPw(e.target.value)}
                />
              </div>

              {signinError && <div className="error-banner">{signinError}</div>}

              <button className="btn-submit" type="submit" disabled={signinLoading}>
                {signinLoading ? "Signing in…" : "Sign in →"}
              </button>
            </form>

            <div className="switch-line">
              Don&apos;t have an account?{" "}
              <button type="button" className="auth-link" onClick={() => setScreen("signup")}>Start free trial</button>
            </div>
          </div>

          {/* SIGN UP */}
          <div className={`auth-screen${screen === "signup" ? " active" : ""}`}>
            <div className="success-pill">✦ First 50 companies get free onboarding</div>
            <div className="auth-heading">Your company&apos;s <em>memory</em> starts here.</div>
            <div className="auth-sub">14-day free trial. No credit card required.</div>

            <button className="social-btn" type="button">
              <span className="social-icon">
                <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              </span>
              Sign up with Google
            </button>

            <div className="divider">
              <div className="divider-line"></div>
              <span className="divider-text">or create your account</span>
              <div className="divider-line"></div>
            </div>

            <form onSubmit={handleSignup}>
              <div className="field">
                <label className="field-label">Your name</label>
                <input className="field-input" type="text" placeholder="Sarah Amir" required value={signupForm.name} onChange={updateSignup("name")} />
              </div>
              <div className="field">
                <label className="field-label">Work email</label>
                <input className="field-input" type="email" placeholder="you@company.com" required value={signupForm.email} onChange={updateSignup("email")} />
                <div className="field-hint">Use your company email — Nura links to your workspace automatically.</div>
              </div>
              <div className="field">
                <label className="field-label">Company name</label>
                <input className="field-input" type="text" placeholder="Acme Corp" required value={signupForm.organizationName} onChange={updateSignup("organizationName")} />
              </div>
              <div className="field">
                <label className="field-label">Password</label>
                <input className="field-input" type="password" placeholder="Min. 8 characters" required minLength={8} value={signupForm.password} onChange={updateSignup("password")} />
              </div>

              {signupError && <div className="error-banner">{signupError}</div>}

              <button className="btn-submit" type="submit" disabled={signupLoading}>
                {signupLoading ? "Creating…" : "Start free trial →"}
              </button>
            </form>

            <div className="switch-line">
              Already have an account?{" "}
              <button type="button" className="auth-link" onClick={() => setScreen("signin")}>Sign in</button>
            </div>
          </div>

          {/* VERIFY EMAIL (illustrative — accounts are active immediately) */}
          <div className={`auth-screen${screen === "verify-email" ? " active" : ""}`}>
            <div className="verify-icon">📬</div>
            <div className="auth-heading">Check your inbox.</div>
            <div className="auth-sub">
              We sent a verification link to <strong>{signupForm.email || "you@company.com"}</strong>.<br />
              Click it to activate your Nura workspace.
            </div>

            <div style={{ background: "var(--bg-warm)", border: "1.5px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px 18px", fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 24 }}>
              <strong style={{ color: "var(--text)" }}>Didn&apos;t get it?</strong> Check your spam folder, or make sure you used your work email. The link expires in 24 hours.
            </div>

            <button className="btn-submit btn-submit-secondary" type="button">Resend verification email</button>
            <div className="switch-line">
              Wrong email?{" "}
              <button type="button" className="auth-link" onClick={() => setScreen("signup")}>Go back</button>
            </div>
          </div>

          {/* FORGOT PASSWORD */}
          <div className={`auth-screen${screen === "forgot" ? " active" : ""}`}>
            <div className="verify-icon">🔑</div>
            <div className="auth-heading">Reset your password.</div>
            <div className="auth-sub">Enter your work email and we&apos;ll send a reset link. It expires in 1 hour.</div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setScreen("forgot-sent");
              }}
            >
              <div className="field">
                <label className="field-label">Work email</label>
                <input className="field-input" type="email" placeholder="you@company.com" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
              </div>
              <button className="btn-submit" type="submit">Send reset link →</button>
            </form>
            <div className="switch-line">
              <button type="button" className="auth-link" onClick={() => setScreen("signin")}>← Back to sign in</button>
            </div>
          </div>

          {/* FORGOT SENT */}
          <div className={`auth-screen${screen === "forgot-sent" ? " active" : ""}`}>
            <div className="verify-icon">✅</div>
            <div className="auth-heading">Link sent.</div>
            <div className="auth-sub">
              Check your inbox at <strong>{forgotEmail || "you@company.com"}</strong>. If it doesn&apos;t arrive in a few minutes, check your spam folder.
            </div>
            <div className="switch-line" style={{ marginTop: 32 }}>
              <button type="button" className="auth-link" onClick={() => setScreen("signin")}>← Back to sign in</button>
            </div>
          </div>
        </div>

        <div className="auth-footer">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Security</a>
          <span style={{ marginLeft: "auto" }}>© 2026 Nura, Inc.</span>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right">
        <div className="right-bg-circle" style={{ width: 500, height: 500, top: -100, right: -150 }}></div>
        <div className="right-bg-circle" style={{ width: 300, height: 300, bottom: -80, left: -60, background: "radial-gradient(circle,rgba(124,58,237,0.06) 0%,transparent 70%)" }}></div>

        <div className="right-content">
          <div className="right-eyebrow">✦ Company memory layer</div>
          <div className="right-heading">
            The answer is <em>already</em><br />in your company.
          </div>
          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.7 }}>
            Nura captures what lives in Slack, email, and people&apos;s heads — and makes it instantly queryable by your whole team.
          </p>

          <div className="demo-card">
            <div className="demo-topbar">
              <div className="demo-dot" style={{ background: "#FC5753" }}></div>
              <div className="demo-dot" style={{ background: "#FDBC40" }}></div>
              <div className="demo-dot" style={{ background: "#34C84A" }}></div>
              <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-jetbrains-mono), monospace", marginLeft: 6 }}>nura — ask anything</span>
            </div>
            <div className="demo-body">
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 8 }}>Ask your company</div>
              {DEMOS.map((d, i) => (
                <div key={d.q} className={`demo-q${i === demoIdx ? " active" : ""}`} onClick={() => setDemoIdx(i)}>
                  {d.q}
                </div>
              ))}
              <div className="demo-answer">
                <div className="demo-answer-badge">✓ Found</div>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>{demo.text}</div>
                <div className="demo-source-row">
                  {demo.sources.map((s) => (
                    <span key={s.label} className="demo-chip" style={{ color: s.color, background: s.bg, borderColor: s.border }}>{s.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="social-proof">
            <div className="avatars">
              <div className="av" style={{ background: "#F97316" }}>SA</div>
              <div className="av" style={{ background: "#7C3AED" }}>JK</div>
              <div className="av" style={{ background: "#059669" }}>PM</div>
              <div className="av" style={{ background: "#2563EB" }}>TR</div>
              <div className="av" style={{ background: "#DB2777" }}>AL</div>
            </div>
            <div className="proof-text">
              <strong>2,400+ employees</strong> at 17 companies<br />get answers in seconds, not days.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
