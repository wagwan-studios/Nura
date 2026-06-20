import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const HQ_SESSION_COOKIE = "authjs.hq-session-token";

export const { handlers: hqHandlers, signIn: hqSignIn, signOut: hqSignOut, auth: hqAuth } = NextAuth({
  session: { strategy: "jwt" },
  basePath: "/api/auth/hq",
  pages: {
    signIn: "/superadmin/login",
  },
  cookies: {
    sessionToken: {
      name: HQ_SESSION_COOKIE,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const admin = await prisma.superAdmin.findUnique({ where: { email } });
        if (!admin) return null;

        const valid = await bcrypt.compare(password, admin.passwordHash);
        if (!valid) return null;

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        };
      },
    }),
  ],
  callbacks: {
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as typeof session.user & { id: string }).id = token.sub as string;
      }
      return session;
    },
  },
});
