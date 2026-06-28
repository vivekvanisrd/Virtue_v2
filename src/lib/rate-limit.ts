import { redis } from "./redis";

export async function checkRedisRateLimit(
  action: string,
  key: string,
  limit: number,
  windowSec: number,
  failClosed: boolean = false
): Promise<{ allowed: boolean; error?: string }> {
  const fullKey = `transport:rate:${action}:${key}`;
  if (!redis) {
    if (failClosed) {
      return { allowed: false, error: "RATE_LIMIT_UNAVAILABLE" };
    }
    return { allowed: true };
  }

  try {
    const count = await redis.incr(fullKey);
    if (count === 1) {
      await redis.expire(fullKey, windowSec);
    }
    return { allowed: count <= limit };
  } catch (err) {
    console.error("Redis Rate Limiter Error:", err);
    if (failClosed) {
      return { allowed: false, error: "RATE_LIMIT_UNAVAILABLE" };
    }
    return { allowed: true };
  }
}
