import { prisma } from "@/lib/prisma";
import type { SortType } from "@/lib/constants";

export type AuthorInfo = {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
};

export type PostCard = {
  id: string;
  title: string;
  content: string;
  images: string[];
  pinned: boolean;
  createdAt: Date;
  viewCount: number;
  author: (AuthorInfo & { role: "USER" | "MODERATOR" | "ADMIN" }) & { createdAt?: Date | null };
  category: { id: string; name: string; slug: string } | null;
  tags: Array<{ tag: { id: string; name: string; slug: string } }>;
  likedByMe: boolean;
  bookmarkedByMe: boolean;
  _count: { likes: number; comments: number; bookmarks: number };
};

function baseWhere(extra: Record<string, unknown> = {}) {
  return {
    deletedAt: null,
    author: { banned: false },
    ...extra,
  };
}

function rowSelect(viewerId: string | null) {
  return {
    id: true,
    title: true,
    content: true,
    images: true,
    pinned: true,
    createdAt: true,
    viewCount: true,
    author: {
      select: { id: true, name: true, username: true, image: true, role: true },
    },
    category: { select: { id: true, name: true, slug: true } },
    tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
    likes: viewerId
      ? { where: { userId: viewerId }, select: { userId: true }, take: 1 }
      : false,
    bookmarks: viewerId
      ? { where: { userId: viewerId }, select: { userId: true }, take: 1 }
      : false,
    _count: {
      select: {
        likes: true,
        comments: { where: { deletedAt: null } },
        bookmarks: true,
      },
    },
  } as const;
}

type Row = {
  id: string;
  title: string;
  content: string;
  images: string[];
  pinned: boolean;
  createdAt: Date;
  viewCount: number;
  author: { id: string; name: string | null; username: string; image: string | null; role: string };
  category: { id: string; name: string; slug: string } | null;
  tags: Array<{ tag: { id: string; name: string; slug: string } }>;
  likes?: Array<{ userId: string }>;
  bookmarks?: Array<{ userId: string }>;
  _count: { likes: number; comments: number; bookmarks: number };
};

function toCard(row: Row, viewerId: string | null): PostCard {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    images: row.images,
    pinned: row.pinned,
    createdAt: row.createdAt,
    viewCount: row.viewCount,
    author: {
      id: row.author.id,
      name: row.author.name,
      username: row.author.username,
      image: row.author.image,
      role: (row.author.role as PostCard["author"]["role"]) ?? "USER",
    },
    category: row.category,
    tags: row.tags,
    likedByMe: Boolean(viewerId && row.likes?.some((l) => l.userId === viewerId)),
    bookmarkedByMe: Boolean(viewerId && row.bookmarks?.some((b) => b.userId === viewerId)),
    _count: {
      likes: row._count.likes,
      comments: row._count.comments,
      bookmarks: row._count.bookmarks,
    },
  };
}

export async function getFeed(options: {
  sort: SortType;
  page: number;
  viewerId: string | null;
  categorySlug?: string;
  tagSlug?: string;
  q?: string;
  perPage?: number;
}): Promise<{ posts: PostCard[]; total: number; hasMore: boolean }> {
  const { sort, page, viewerId } = options;
  const perPage = options.perPage ?? 12;
  const skip = (page - 1) * perPage;

  const where: Record<string, unknown> = baseWhere();
  if (options.categorySlug) where.category = { slug: options.categorySlug };
  if (options.tagSlug) where.tags = { some: { tag: { slug: options.tagSlug } } };
  if (options.q) {
    where.OR = [
      { title: { contains: options.q, mode: "insensitive" } },
      { content: { contains: options.q, mode: "insensitive" } },
    ];
  }

  if (sort === "trending") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = (await prisma.post.findMany({
      where: { ...where, updatedAt: { gte: weekAgo } },
      orderBy: [{ createdAt: "desc" }],
      select: rowSelect(viewerId),
      take: 200,
    })) as unknown as Row[];
    const scored = recent
      .map((row) => ({
        row,
        score: row._count.likes * 2 + row._count.comments * 3 + (row.pinned ? 10_000 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => toCard(entry.row, viewerId));

    return {
      posts: scored.slice(skip, skip + perPage),
      total: scored.length,
      hasMore: skip + perPage < scored.length,
    };
  }

  const orderBy =
    sort === "popular"
      ? [
          { pinned: "desc" as const },
          { likes: { _count: "desc" as const } },
          { comments: { _count: "desc" as const } },
          { viewCount: "desc" as const },
        ]
      : [{ pinned: "desc" as const }, { createdAt: "desc" as const }];

  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy,
      select: rowSelect(viewerId),
      skip,
      take: perPage,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    posts: (rows as unknown as Row[]).map((row) => toCard(row, viewerId)),
    total,
    hasMore: skip + perPage < total,
  };
}

export type PostDetail = PostCard & {
  updatedAt: Date;
  author: PostCard["author"] & { createdAt: Date };
  reportedByMe: boolean;
};

export async function getPostDetail(id: string, viewerId: string | null): Promise<PostDetail | null> {
  const row = (await prisma.post.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...rowSelect(viewerId),
      updatedAt: true,
      author: {
        select: { id: true, name: true, username: true, image: true, role: true, createdAt: true },
      },
      reports: viewerId
        ? { where: { reporterId: viewerId, status: "PENDING" }, select: { id: true }, take: 1 }
        : false,
    },
  })) as unknown as (Row & { updatedAt: Date; author: { createdAt: Date }; reports?: unknown[] }) | null;

  if (!row) return null;

  return {
    ...toCard(row, viewerId),
    updatedAt: row.updatedAt,
    author: { ...toCard(row, viewerId).author, createdAt: row.author.createdAt },
    reportedByMe: Boolean(viewerId && row.reports && row.reports.length > 0),
  };
}

export async function getRelatedPosts(postId: string, categoryId: string | null, viewerId: string | null) {
  if (!categoryId) return [];
  const rows = (await prisma.post.findMany({
    where: baseWhere({ categoryId, id: { not: postId } }),
    orderBy: { createdAt: "desc" },
    select: rowSelect(viewerId),
    take: 4,
  })) as unknown as Row[];
  return rows.map((row) => toCard(row, viewerId));
}

export async function getBookmarkedPosts(userId: string): Promise<PostCard[]> {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { post: { select: rowSelect(userId) } },
    take: 60,
  });
  return (bookmarks as unknown as Array<{ post: Row }>).map((b) => toCard(b.post, userId));
}

export async function getUserPosts(userId: string, viewerId: string | null): Promise<PostCard[]> {
  const rows = (await prisma.post.findMany({
    where: { authorId: userId, deletedAt: null },
    orderBy: [{ createdAt: "desc" }],
    select: rowSelect(viewerId),
    take: 50,
  })) as unknown as Row[];
  return rows.map((row) => toCard(row, viewerId));
}

// ── Comments ────────────────────────────────────────────────────────────────

export type CommentItemData = {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  author: { id: string; name: string | null; username: string; image: string | null; role: string };
  likeCount: number;
  likedByMe: boolean;
  children: CommentItemData[];
};

export async function getCommentTree(postId: string, viewerId: string | null): Promise<CommentItemData[]> {
  const rows = await prisma.comment.findMany({
    where: { postId, deletedAt: null },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      content: true,
      parentId: true,
      createdAt: true,
      author: {
        select: { id: true, name: true, username: true, image: true, role: true },
      },
      likes: viewerId
        ? { where: { userId: viewerId }, select: { userId: true }, take: 1 }
        : false,
      _count: { select: { likes: true } },
    },
  });

  type CRow = {
    id: string;
    content: string;
    parentId: string | null;
    createdAt: Date;
    author: { id: string; name: string | null; username: string; image: string | null; role: string };
    likes?: Array<{ userId: string }>;
    _count: { likes: number };
  };

  const nodes = new Map<string, CommentItemData>();
  for (const row of rows as unknown as CRow[]) {
    nodes.set(row.id, {
      id: row.id,
      content: row.content,
      parentId: row.parentId,
      createdAt: row.createdAt.toISOString(),
      author: row.author,
      likeCount: row._count.likes,
      likedByMe: Boolean(viewerId && row.likes?.some((l) => l.userId === viewerId)),
      children: [],
    });
  }

  const roots: CommentItemData[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// ── Sidebar & profile & search ───────────────────────────────────────────────

export async function getSidebarData() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [categories, weekPosts, monthPosts, commentCount, userCount] = await Promise.all([
    prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { posts: { where: { deletedAt: null } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.post.findMany({
      where: { deletedAt: null, createdAt: { gte: weekAgo }, author: { banned: false } },
      select: { id: true, title: true, _count: { select: { likes: true, comments: true } } },
      skip: 0,
      take: 100,
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "Post" WHERE "deletedAt" IS NULL AND "createdAt" >= ${monthAgo.toISOString()}::timestamp`,
    prisma.comment.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { banned: false } }),
  ]);

  const trendingPosts = weekPosts
    .map((p) => ({ id: p.id, title: p.title, score: p._count.likes * 2 + p._count.comments }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    categories: categories as Array<{ id: string; name: string; slug: string; _count: { posts: number } }>,
    trendingPosts,
    stats: {
      postsWeek: weekPosts.length,
      postsMonth: Number(monthPosts[0]?.count ?? 0),
      comments: commentCount,
      users: userCount,
    },
  };
}

export async function getUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      role: true,
      banned: true,
      createdAt: true,
      _count: { select: { posts: true, comments: true } },
    },
  });
}

export type PublicUser = NonNullable<Awaited<ReturnType<typeof getUserByUsername>>>;

export async function getUserComments(userId: string) {
  return prisma.comment.findMany({
    where: { authorId: userId, deletedAt: null },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      content: true,
      createdAt: true,
      post: { select: { id: true, title: true } },
      _count: { select: { likes: true } },
    },
    take: 50,
  });
}

export async function searchUsers(q: string) {
  if (!q) return [];
  return prisma.user.findMany({
    where: {
      banned: false,
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      role: true,
      _count: { select: { posts: true } },
    },
    take: 8,
  });
}
