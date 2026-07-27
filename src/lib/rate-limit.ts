/// Small in-memory rate limiter for the public form endpoints.
///
/// This is per-instance and resets on deploy — deliberately. It exists to stop
/// a single bot hammering the booking form, not as a security boundary. If the
/// site ever runs on more than one instance, move this to Redis.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Bounded so a spray of unique IPs cannot grow the map without limit.
const MAX_BUCKETS = 5_000;

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_BUCKETS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/// Best-effort client IP. Behind Vercel/Cloudflare the first x-forwarded-for
/// hop is the real client; locally there is no header at all.
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}
