import { hqSignIn } from "@/auth-hq";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export default async function SuperAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function loginAction(formData: FormData) {
    "use server";

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await hqSignIn("credentials", {
        email,
        password,
        redirectTo: "/superadmin",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/superadmin/login?error=1");
      }
      throw err;
    }
  }

  return (
    <div className="auth-app">
      <div className="auth-left" style={{ width: "100%", borderRight: "none" }}>
        <a className="auth-logo" href="/">
          <span className="logo-dot" style={{ background: "#1A1A1A" }}></span>
          Nura <span style={{ color: "var(--faint)", fontWeight: 400, fontSize: 14, marginLeft: 4 }}>HQ</span>
        </a>

        <div className="auth-form-wrap" style={{ maxWidth: 380, margin: "0 auto", width: "100%" }}>
          <div className="auth-screen active">
            <div className="auth-heading">Nura HQ.</div>
            <div className="auth-sub">Founder &amp; ops console. Restricted access.</div>

            <form action={loginAction}>
              <div className="field">
                <label className="field-label">Email</label>
                <input
                  className="field-input"
                  type="email"
                  name="email"
                  placeholder="founder@nura.ai"
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label className="field-label">Password</label>
                <input
                  className="field-input"
                  type="password"
                  name="password"
                  placeholder="••••••••••"
                  required
                />
              </div>

              {error && <div className="error-banner">Invalid email or password</div>}

              <button className="btn-submit" type="submit" style={{ background: "#1A1A1A" }}>
                Sign in →
              </button>
            </form>
          </div>
        </div>

        <div className="auth-footer" style={{ justifyContent: "center" }}>
          <span>© 2026 Nura, Inc. — Internal use only</span>
        </div>
      </div>
    </div>
  );
}
