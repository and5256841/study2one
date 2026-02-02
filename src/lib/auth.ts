import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// Force trust host in production
const useSecureCookies = process.env.NODE_ENV === "production";
const hostName = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        if (user.enrollmentStatus !== "APPROVED" && user.role === "STUDENT") {
          throw new Error("PENDING_APPROVAL");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          pseudonym: user.pseudonym,
          avatarSeed: user.avatarSeed,
          avatarStyle: user.avatarStyle,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as Record<string, unknown>).role as string;
        token.userId = (user as Record<string, unknown>).id as string;
        token.pseudonym = (user as Record<string, unknown>).pseudonym as string;
        token.avatarSeed = (user as Record<string, unknown>).avatarSeed as string;
        token.avatarStyle = (user as Record<string, unknown>).avatarStyle as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as "STUDENT" | "COORDINATOR" | "CLIENT";
        session.user.pseudonym = token.pseudonym as string;
        session.user.avatarSeed = token.avatarSeed as string;
        session.user.avatarStyle = token.avatarStyle as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: useSecureCookies ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
});
