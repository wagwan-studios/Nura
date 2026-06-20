import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      organizationId: string;
      role: string;
    };
  }
}
