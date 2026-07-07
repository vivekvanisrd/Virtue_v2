import { NextRequest, NextResponse } from "next/server";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest) {
  try {
    // 1. Verify developer/owner authentication
    const identity = await getSovereignIdentity();
    if (!identity) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Session required." } },
        { status: 401 }
      );
    }

    const allowedRoles = ["DEVELOPER", "OWNER"];
    if (!allowedRoles.includes(identity.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access forbidden." } },
        { status: 403 }
      );
    }

    // 2. Health check database
    let dbStatus = "healthy";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (_) {
      dbStatus = "unhealthy";
    }

    // 3. Health check redis
    let redisStatus = "healthy";
    if (redis) {
      try {
        await redis.ping();
      } catch (_) {
        redisStatus = "unhealthy";
      }
    } else {
      redisStatus = "disabled";
    }

    // 4. Gather operational metrics
    const activeSimulationJobs = await prisma.simulationJob.count({
      where: { status: "RUNNING" }
    });

    const activeTrips = await prisma.tripSession.count({
      where: { status: "ACTIVE" }
    });

    const oneHourAgo = new Date(Date.now() - 3600000);
    const gpsUpdatesLastHour = await prisma.vehicleGPSLog.count({
      where: { serverTimestamp: { gte: oneHourAgo } }
    });
    const gpsUpdatesPerMinute = Math.round(gpsUpdatesLastHour / 60);

    const latestJob = await prisma.simulationJob.findFirst({
      where: { status: "RUNNING" },
      orderBy: { lastExecutedAt: "desc" },
      select: { lastExecutedAt: true }
    });

    return NextResponse.json({
      status: dbStatus === "healthy" && (redisStatus === "healthy" || redisStatus === "disabled") ? "healthy" : "degraded",
      database: dbStatus,
      redis: redisStatus,
      activeSimulationJobs,
      activeTrips,
      gpsUpdatesPerMinute,
      lastSuccessfulTick: latestJob?.lastExecutedAt ? latestJob.lastExecutedAt.toISOString() : null,
      simulatorEnabled: process.env.ENABLE_GPS_SIMULATOR === "true"
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message || "An unexpected error occurred." } },
      { status: 500 }
    );
  }
}
