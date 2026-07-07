import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { SimulationStatus } from "@prisma/client";
import crypto from "crypto";

export const ROUTE_COORDINATES: Record<string, [number, number][]> = {
  "DEMO-R-A": [
    [17.6000, 78.1000],
    [17.6020, 78.1050],
    [17.6050, 78.1100],
    [17.6090, 78.1150],
    [17.6120, 78.1200]
  ],
  "DEMO-R-B": [
    [17.6200, 78.1500],
    [17.6230, 78.1550],
    [17.6260, 78.1600],
    [17.6290, 78.1650]
  ]
};

const DEFAULT_COORDS: [number, number][] = [
  [17.6000, 78.1000],
  [17.6010, 78.1020],
  [17.6020, 78.1040],
  [17.6030, 78.1060],
  [17.6040, 78.1080]
];

let globalSimulationTimeout: NodeJS.Timeout | null = null;
let isRunnerActive = false;

export function initSimulationRunner() {
  if (process.env.ENABLE_GPS_SIMULATOR !== "true") {
    console.log("ℹ️ GPS Simulator is disabled via ENABLE_GPS_SIMULATOR flag.");
    return;
  }

  if (isRunnerActive) {
    return;
  }

  isRunnerActive = true;
  console.log("🚀 Initializing Server-Side GPS Simulation Runner...");

  async function tick() {
    const correlationId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // 1. Fetch all SimulationJobs flagged as RUNNING
      const runningJobs = await prisma.simulationJob.findMany({
        where: { status: "RUNNING" },
        include: {
          tripSession: {
            include: {
              route: true,
              vehicle: true,
              driver: true
            }
          }
        }
      });

      for (const job of runningJobs) {
        const trip = job.tripSession;
        const lockKey = `transport:simulation:${job.id}:lock`;
        const lockToken = crypto.randomUUID();
        let lockAcquired = false;

        // 2. Try acquiring Redis Distributed Lock with lease duration of 4s
        if (redis) {
          try {
            const res = await redis.set(lockKey, lockToken, "EX", 4, "NX");
            if (res === "OK") {
              lockAcquired = true;
            } else {
              // Lock collision: skip processing this job in this cycle
              console.warn(JSON.stringify({
                correlationId,
                tripSessionId: job.tripSessionId,
                event: "GPS_LOCK_ACQUISITION_FAILED",
                message: "Simulation lock already acquired by another worker node."
              }));
              continue;
            }
          } catch (err: any) {
            console.warn(`[SIMULATOR] Redis lock failed, falling back to execution:`, err.message);
            // Fail open locally in dev if redis connection drops, but require lock in production
            if (process.env.NODE_ENV === "production") {
              continue;
            }
          }
        }

        const now = new Date();

        try {
          // 3. Multi-Entity Status Verification
          let invalidReason = "";

          if (!trip || trip.isDeleted) {
            invalidReason = "Trip session no longer exists or is deleted.";
          } else if (trip.status.toUpperCase() !== "ACTIVE") {
            invalidReason = `Trip session status is '${trip.status}', expected 'ACTIVE'.`;
          } else if (!trip.vehicle || trip.vehicle.isDeleted || (trip.vehicle.onboardingStatus || "").toUpperCase() !== "ACTIVE") {
            invalidReason = `Vehicle ${trip.vehicle?.registrationNo} is deleted or inactive.`;
          } else if (!trip.driver || trip.driver.isDeleted || trip.driver.status.toUpperCase() !== "ACTIVE") {
            invalidReason = `Driver ${trip.driver?.name} is deleted or inactive.`;
          }

          // Verify DriverAssignment is active
          if (!invalidReason && trip) {
            const assignment = await prisma.driverAssignment.findFirst({
              where: {
                driverId: trip.driverId,
                vehicleId: trip.vehicleId,
                routeId: trip.routeId,
                status: "Active",
                isDeleted: false
              }
            });
            if (!assignment) {
              invalidReason = "Driver assignment for this route/vehicle has been unlinked.";
            }
          }

          if (invalidReason) {
            console.warn(`[SIMULATOR] Stopping SimulationJob ${job.id}: ${invalidReason}`);
            
            await prisma.$transaction([
              prisma.simulationJob.update({
                where: { id: job.id },
                data: { status: "STOPPED" }
              }),
              prisma.transportAuditLog.create({
                data: {
                  userId: "SYSTEM_SIMULATOR",
                  action: "SIMULATION_AUTO_STOPPED",
                  entityType: "SimulationJob",
                  entityId: job.id,
                  schoolId: job.schoolId,
                  branchId: job.branchId,
                  timestamp: now
                }
              })
            ]);

            // Release lock immediately via owner token validation
            if (redis && lockAcquired) {
              await redis.eval(
                `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
                1,
                lockKey,
                lockToken
              );
            }
            continue;
          }

          // 4. Index Out-of-Bounds Protection & Steps Fetch
          const routeCode = trip.route.routeCode;
          const coords = ROUTE_COORDINATES[routeCode] || DEFAULT_COORDS;
          
          let nextIndex = job.currentPolylineIndex + 1;
          if (nextIndex >= coords.length || nextIndex < 0) {
            nextIndex = 0; // Loop coordinates
          }

          const [lat, lng] = coords[nextIndex];

          // 5. Update Database Telemetry and Redis Location Cache
          const redisKeyLive = `transport:vehicle:${trip.vehicleId}:live`;
          const liveData = {
            latitude: lat,
            longitude: lng,
            speed: 40.0,
            heading: 90.0,
            sequenceNo: nextIndex,
            timestamp: now.toISOString()
          };

          if (redis) {
            try {
              await redis.set(redisKeyLive, JSON.stringify(liveData));
            } catch (err: any) {
              console.warn(`[SIMULATOR] Redis coordinates write failed:`, err.message);
            }
          }

          const latencyMs = Date.now() - startTime;

          await prisma.$transaction([
            prisma.simulationJob.update({
              where: { id: job.id },
              data: {
                currentPolylineIndex: nextIndex,
                lastExecutedAt: now
              }
            }),
            prisma.vehicleGPSLive.upsert({
              where: { vehicleId: trip.vehicleId },
              update: {
                latitude: lat,
                longitude: lng,
                speed: 40.0,
                heading: 90.0,
                sequenceNo: nextIndex,
                clientTimestamp: now,
                serverTimestamp: now
              },
              create: {
                vehicleId: trip.vehicleId,
                latitude: lat,
                longitude: lng,
                speed: 40.0,
                heading: 90.0,
                sequenceNo: nextIndex,
                clientTimestamp: now,
                serverTimestamp: now,
                schoolId: job.schoolId,
                branchId: job.branchId
              }
            }),
            prisma.vehicleGPSLog.create({
              data: {
                vehicleId: trip.vehicleId,
                tripSessionId: trip.id,
                latitude: lat,
                longitude: lng,
                speed: 40.0,
                heading: 90.0,
                sequenceNo: nextIndex,
                clientTimestamp: now,
                serverTimestamp: now,
                timestamp: now,
                schoolId: job.schoolId,
                branchId: job.branchId
              }
            })
          ]);

          // Structured Observability Logging
          console.log(JSON.stringify({
            correlationId,
            tripSessionId: trip.id,
            vehicleId: trip.vehicleId,
            driverId: trip.driverId,
            event: "SIMULATION_TICK_PROCESSED",
            latencyMs
          }));

        } finally {
          // 6. Release Distributed Lock via token verification script
          if (redis && lockAcquired) {
            try {
              await redis.eval(
                `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
                1,
                lockKey,
                lockToken
              );
            } catch (err: any) {
              console.warn(`[SIMULATOR] Redis lock release failed:`, err.message);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(JSON.stringify({
        correlationId,
        event: "SIMULATION_TICK_FAILED",
        message: err.message || "Tick execution failure",
        stack: err.stack
      }));
    } finally {
      // Re-schedule recursion strictly after execution finishes
      globalSimulationTimeout = setTimeout(tick, 5000);
    }
  }

  // Launch first recursion
  globalSimulationTimeout = setTimeout(tick, 5000);
}
