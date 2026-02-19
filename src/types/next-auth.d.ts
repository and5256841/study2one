import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "STUDENT" | "COORDINATOR" | "CLIENT";
      pseudonym?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    userId: string;
    pseudonym?: string;
  }
}
