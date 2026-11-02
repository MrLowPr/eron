/**
 * Rate limiting with Upstash Redis REST first (distributed), in-memory fallback (per-instance).
 * No extra dependency: Upstash REST is plain HTTP.
 */

type LimiterOptions = {
  /** Max requests per window. */
  limit: number;
  /** Window length in seconds. */
  window: number;
};

export type Limiter = {
  success: boolean;
  remaining: number;
};

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, { limit, window }: LimiterOptions): Limiter {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + window * 1000 });
    return { success: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) return { success: false, remaining: 0 };

  bucket.count += 1;
  return { success: true, remaining: limit - bucket.count };
}

// Opportunistic cleanup so the map does not grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) memoryBuckets.delete(key);
  }
}, 60_000).unref?.();

const restUrl = process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand<T = unknown>(path: string): Promise<T | null> {
  if (!restUrl || !restToken) return null;
  try {
    const res = await fetch(`${restUrl}${path}`, {
      headers: { Authorization: `Bearer ${restToken}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Fixed-window limiter keyed by an arbitrary string (e.g. `login:ip:1.2.3.4`).
 * Returns success: true when Redis/Upstash is unreachable (fail-open) so that
 * infrastructure issues never lock the app, combined with the in-memory guard.
 */
export async function rateLimit(key: string, options: LimiterOptions): Promise<Limiter> {
  const memory = memoryLimit(`mem:${key}`, options);
  if (!memory.success) return memory;

  if (!restUrl || !restToken) return memory;

  const normalizedKey = `rl:${key}:${Math.floor(Date.now() / (options.window * 1000))}`;
  const result = await redisCommand<{ result: number }>(`/INCR/${normalizedKey}`);
  if (result === null) return memory;

  if (result.result === 1) {
    await redisCommand(`/EXPIRE/${normalizedKey}/${options.window}`);
  }

  const success = result.result <= options.limit;
  return { success, remaining: Math.max(0, options.limit - result.result) };
}

/** Build a rate-limit key based on the caller IP (behind a proxy header chain). */
export function ipFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
