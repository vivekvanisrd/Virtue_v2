import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
let redisClient: Redis | null = null;

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    lazyConnect: true,
  });
  redisClient.on("error", (err) => {
    console.warn("⚠️ Redis Connection Failure:", err.message);
  });
} catch (err) {
  console.warn("⚠️ Redis Init Failure:", err);
}

export const redis = redisClient;
export default redis;
