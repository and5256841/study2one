import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
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
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
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
        token.role = (user as any).role;
        token.userId = (user as any).id;
        token.pseudonym = (user as any).pseudonym;
        token.avatarSeed = (user as any).avatarSeed;
        token.avatarStyle = (user as any).avatarStyle;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.userId;
        (session.user as any).pseudonym = token.pseudonym;
        (session.user as any).avatarSeed = token.avatarSeed;
        (session.user as any).avatarStyle = token.avatarStyle;
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
};
