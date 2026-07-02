import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";


export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: true,

  logger: {
    error(code) {
      console.error("AUTH ERROR:", code);
    },
    warn(code) {
      console.warn("AUTH WARN:", code);
    },
    debug(code, metadata) {
      console.log("AUTH DEBUG:", code, metadata);
    },
  },

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
        console.log("NORMAL LOGIN: authorize called");

        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        console.log("NORMAL LOGIN: credentials received", {
          hasEmail: Boolean(email),
          hasPassword: Boolean(password),
          email,
        });

        if (!email || !password) {
          console.log("NORMAL LOGIN: missing email or password");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            organizationId: true,
            role: true,
          },
        });

        console.log("NORMAL LOGIN: user lookup result", {
          found: Boolean(user),
          userId: user?.id,
          email: user?.email,
          role: user?.role,
          organizationId: user?.organizationId,
          hasPasswordHash: Boolean(user?.passwordHash),
        });

        if (!user) {
          console.log("NORMAL LOGIN: user not found");
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);

        console.log("NORMAL LOGIN: password check", {
          valid,
        });

        if (!valid) {
          console.log("NORMAL LOGIN: invalid password");
          return null;
        }

        console.log("NORMAL LOGIN: success", {
          userId: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        });

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
      console.log("NORMAL LOGIN: jwt callback", {
        hasUser: Boolean(user),
        tokenSub: token.sub,
      });

      if (user) {
        token.organizationId = (user as { organizationId: string }).organizationId;
        token.role = (user as { role: string }).role;
      }

      return token;
    },

    session: async ({ session, token }) => {
      console.log("NORMAL LOGIN: session callback", {
        tokenSub: token.sub,
        organizationId: token.organizationId,
        role: token.role,
      });

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


// export const { handlers, signIn, signOut, auth } = NextAuth({
//   session: { strategy: "jwt" },
//   pages: {
//     signIn: "/login",
//   },
//   providers: [
//     Credentials({
//       credentials: {
//         email: { label: "Email", type: "email" },
//         password: { label: "Password", type: "password" },
//       },
//       authorize: async (credentials) => {
//         const email = credentials?.email as string | undefined;
//         const password = credentials?.password as string | undefined;
//         if (!email || !password) return null;

//         const user = await prisma.user.findUnique({ where: { email } });
//         if (!user) return null;
        
//         const valid = await bcrypt.compare(password, user.passwordHash);
//         if (!valid) return null;

//         return {
//           id: user.id,
//           email: user.email,
//           name: user.name,
//           organizationId: user.organizationId,
//           role: user.role,
          
//         };
//       },
//     }),
//   ],
//   callbacks: {
//     jwt: async ({ token, user }) => {
//       if (user) {
//         token.organizationId = (user as { organizationId: string }).organizationId;
//         token.role = (user as { role: string }).role;
//       }
//       return token;
//     },
//     session: async ({ session, token }) => {
//       if (session.user) {
//         (session.user as typeof session.user & { id: string; organizationId: string; role: string }).id =
//           token.sub as string;
//         (session.user as typeof session.user & { organizationId: string; role: string }).organizationId =
//           token.organizationId as string;
//         (session.user as typeof session.user & { organizationId: string; role: string }).role =
//           token.role as string;
//         if (token.impersonating) {
//           (session.user as typeof session.user & { impersonating?: boolean; impersonatedOrgName?: string }).impersonating =
//             token.impersonating as boolean;
//           (session.user as typeof session.user & { impersonating?: boolean; impersonatedOrgName?: string }).impersonatedOrgName =
//             token.impersonatedOrgName as string;
//         }
//       }
//       return session;
//     },
//   },
// });
