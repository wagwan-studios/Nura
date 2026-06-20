export async function GET() {
  const res = new Response(null, { status: 302, headers: { Location: "/superadmin/customers" } });
  res.headers.append(
    "Set-Cookie",
    "authjs.session-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  return res;
}
