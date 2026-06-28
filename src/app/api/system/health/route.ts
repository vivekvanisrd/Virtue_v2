import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const health: any = {
    status: "OK",
    timestamp: new Date().toISOString(),
    services: {}
  };

  let hasError = false;

  // Check Database
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = {
      status: "UP",
      latencyMs: Date.now() - start
    };
  } catch (err: any) {
    hasError = true;
    health.services.database = {
      status: "DOWN",
      error: err.message || "Database connection error"
    };
  }

  // Check Redis
  if (redis) {
    try {
      const start = Date.now();
      const pingRes = await redis.ping();
      health.services.redis = {
        status: pingRes === "PONG" ? "UP" : "DOWN",
        latencyMs: Date.now() - start
      };
      if (pingRes !== "PONG") {
        hasError = true;
      }
    } catch (err: any) {
      hasError = true;
      health.services.redis = {
        status: "DOWN",
        error: err.message || "Redis ping failed"
      };
    }
  } else {
    hasError = true;
    health.services.redis = {
      status: "DOWN",
      error: "Redis client is null or uninitialized"
    };
  }

  if (hasError) {
    health.status = "DEGRADED";
    return NextResponse.json(health, { status: 500 });
  }

  return NextResponse.json(health, { status: 200 });
}
