import Redis from "ioredis";

async function testConn() {
  const redis = new Redis("redis://127.0.0.1:4379");
  try {
    const res = await redis.ping();
    console.log("Redis Ping response:", res);
  } catch (err) {
    console.error("Redis Connection failed:", err);
  } finally {
    await redis.disconnect();
  }
}

testConn();
