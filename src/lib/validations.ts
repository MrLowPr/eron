import { z } from "zod";
import { REPORT_REASONS } from "@/lib/constants";

// ── Auth ─────────────────────────────────────────────────────────────────────

export const usernameSchema = z
  .string()
  .min(3, "Username minimal 3 karakter")
  .max(24, "Username maksimal 24 karakter")
  .regex(/^[a-zA-Z0-9_-]+$/, "Hanya huruf, angka, underscore, dan tanda minus")
  .transform((v) => v.toLowerCase());

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(50, "Nama maksimal 50 karakter"),
  username: usernameSchema,
  email: z.string().trim().email("Email tidak valid").max(200).toLowerCase(),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(72, "Password maksimal 72 karakter")
    .regex(/[a-zA-Z]/, "Password harus mengandung huruf")
    .regex(/[0-9]/, "Password harus mengandung angka"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid").toLowerCase(),
  password: z.string().min(1, "Password wajib diisi"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Email tidak valid").toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(72)
      .regex(/[a-zA-Z]/, "Password harus mengandung huruf")
      .regex(/[0-9]/, "Password harus mengandung angka"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ── Content ──────────────────────────────────────────────────────────────────

const contentText = z
  .string()
  .trim()
  .min(3, "Minimal 3 karakter")
  .max(10_000, "Maksimal 10.000 karakter");

export const postSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Judul minimal 5 karakter")
    .max(150, "Judul maksimal 150 karakter"),
  content: contentText,
  categoryId: z.string().cuid().optional().nullable(),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(2)
        .max(24)
        .regex(/^[^<>"'&]+$/, "Karakter tidak diizinkan"),
    )
    .max(5, "Maksimal 5 tag"),
  images: z.array(z.string().startsWith("/uploads/") || z.string().url()).max(5, "Maksimal 5 gambar"),
});
export type PostInput = z.infer<typeof postSchema>;

export const commentSchema = z.object({
  content: contentText.max(2000, "Komentar maksimal 2000 karakter"),
  postId: z.string().cuid(),
  parentId: z.string().cuid().optional().nullable(),
});
export type CommentInput = z.infer<typeof commentSchema>;

// ── Profile ──────────────────────────────────────────────────────────────────

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(50, "Nama maksimal 50 karakter"),
  username: usernameSchema,
  bio: z
    .string()
    .trim()
    .max(280, "Bio maksimal 280 karakter")
    .optional()
    .or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;

// ── Report ───────────────────────────────────────────────────────────────────

export const reportSchema = z.object({
  postId: z.string().cuid().optional(),
  commentId: z.string().cuid().optional(),
  reason: z.enum(REPORT_REASONS),
  detail: z.string().trim().max(500, "Detail maksimal 500 karakter").optional(),
});
export type ReportInput = z.infer<typeof reportSchema>;

// ── Admin ────────────────────────────────────────────────────────────────────

export const banSchema = z.object({
  userId: z.string().cuid(),
  banned: z.boolean(),
  reason: z.string().trim().max(200).optional(),
});

export const roleSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["USER", "MODERATOR", "ADMIN"]),
});
