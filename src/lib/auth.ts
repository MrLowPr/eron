import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpFromHeaders } from "@/lib/client-ip";

/**
 * Auth.js v5 config.
 * - Session strategy: JWT (stateless, edge-friendly) while users/accounts persist in Postgres.
 * - Credentials provider verifies bcrypt passwords (never exposed to the client).
 * - OAuth (Google) links accounts via PrismaAdapter; email sharing across providers is
 *   blocked by default (allowDangerousEmailAccountLinking = false) which is the secure default.
 */
export const authConfig = {
  adapter: PrismaAdapter(prisma as PrismaClient),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  pages: { signIn: "/login" },
  providers: [
    Google({
      allowDangerousEmailAccountLinking: false,
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials, request) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Batas ini berlaku untuk SEMUA jalur login (server action maupun endpoint /api/auth langsung).
        const ip = request ? clientIpFromHeaders(request.headers) : "unknown";
        const [byIp, byEmail] = await Promise.all([
          rateLimit(`auth:ip:${ip}`, { limit: 30, window: 600 }),
          rateLimit(`auth:email:${parsed.data.email}`, { limit: 10, window: 600 }),
        ]);
        if (!byIp.success || !byEmail.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            image: true,
            role: true,
            password: true,
            banned: true,
            emailVerified: true,
          },
        });
        if (!user || !user.password) return null;
        if (user.banned) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          image: user.image,
          role: user.role as "USER" | "MODERATOR" | "ADMIN",
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return true;

      if (account.provider === "credentials") return true;

      // OAuth: block banned users; new users are created by the adapter (email + name).
      const existing = await prisma.user.findUnique({
        where: { email: user.email ?? "" },
        select: { banned: true },
      });
      if (existing?.banned) return false;
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const isOAuth = account?.provider !== "credentials";

        if (isOAuth && user.email) {
          // The adapter may have just created the user, so ensure a unique username exists.
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, role: true, username: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.username = dbUser.username;
            if (!dbUser.username) {
              const base = slugify(user.name ?? user.email.split("@")[0]) || "user";
              token.username = `${base}-${Math.random().toString(36).slice(2, 8)}`;
              await prisma.user
                .update({
                  where: { id: dbUser.id },
                  data: { username: token.username },
                })
                .catch(() => undefined);
            }
            return token;
          }
        }

        token.id = user.id;
        token.username = user.username ?? (user as { username?: string }).username ?? "";
        token.role = (user.role as string) ?? "USER";
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = (token.id as string) ?? "";
      session.user.username = (token.username as string) ?? "";
      session.user.role = ((token.role as string) ?? "USER") as
        | "USER"
        | "MODERATOR"
        | "ADMIN";
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
