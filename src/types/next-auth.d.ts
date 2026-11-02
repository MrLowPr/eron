import type { DefaultSession } from "next-auth";

type Role = "USER" | "MODERATOR" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    username?: string;
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    role?: string;
  }
}
