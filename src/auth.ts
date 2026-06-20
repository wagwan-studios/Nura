import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
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

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          role: user.role,
          
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.organizationId = (user as { organizationId: string }).organizationId;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as typeof session.user & { id: string; organizationId: string; role: string }).id =
          token.sub as string;
        (session.user as typeof session.user & { organizationId: string; role: string }).organizationId =
          token.organizationId as string;
        (session.user as typeof session.user & { organizationId: string; role: string }).role =
          token.role as string;
        if (token.impersonating) {
          (session.user as typeof session.user & { impersonating?: boolean; impersonatedOrgName?: string }).impersonating =
            token.impersonating as boolean;
          (session.user as typeof session.user & { impersonating?: boolean; impersonatedOrgName?: string }).impersonatedOrgName =
            token.impersonatedOrgName as string;
        }
      }
      return session;
    },
  },
});
