export const SITE = {
  name: "Eron",
  tagline: "Tempat komunitas modern diskusi & berbagi",
  description:
    "Eron adalah platform komunitas modern. Bagikan postingan, diskusi berlapis, vote, bookmark, dan jelajahi topik favoritmu.",
} as const;

export const ROLES = ["USER", "MODERATOR", "ADMIN"] as const;
export type RoleName = (typeof ROLES)[number];

export const UPLOAD_FOLDERS = ["posts", "avatars"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export const MAX_IMAGES_PER_POST = 5;
export const AVATAR_MAX_SIZE = 256; // px

export const REPORT_REASONS = [
  "SPAM",
  "HARASSMENT",
  "INAPPROPRIATE",
  "MISINFORMATION",
  "OFF_TOPIC",
  "OTHER",
] as const;

export const SORT_OPTIONS = ["new", "popular", "trending"] as const;
export type SortType = (typeof SORT_OPTIONS)[number];

export const PAGE_SIZE = 12;
