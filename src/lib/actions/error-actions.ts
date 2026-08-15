"use server";

import prisma from "@/lib/prisma";
import { logSystemError, LogErrorParams } from "@/lib/utils/error-logger";

/**
 * Client-facing Server Action to record frontend JS errors, unhandled rejections, or React component crashes.
 */
export async function logClientErrorAction(params: {
  schoolId?: string;
  branchId?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  errorName?: string;
  message: string;
  stack?: string;
  digest?: string;
  route?: string;
  component?: string;
  metadata?: any;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}) {
  try {
    const record = await logSystemError({
      ...params,
      source: "CLIENT",
    });
    return { success: true, errorId: record?.id };
  } catch (err: any) {
    console.error("Failed to execute logClientErrorAction:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches system errors from PostgreSQL database with filtering & pagination for Admin/Developer portal.
 */
export async function getSystemErrorsAction(params?: {
  schoolId?: string;
  severity?: string;
  status?: string;
  source?: string;
  query?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const where: any = {};
    if (params?.schoolId) where.schoolId = params.schoolId;
    if (params?.severity && params.severity !== "ALL") where.severity = params.severity;
    if (params?.status && params.status !== "ALL") where.status = params.status;
    if (params?.source && params.source !== "ALL") where.source = params.source;

    if (params?.query && params.query.trim() !== "") {
      const q = params.query.trim();
      where.OR = [
        { message: { contains: q, mode: "insensitive" } },
        { stack: { contains: q, mode: "insensitive" } },
        { route: { contains: q, mode: "insensitive" } },
        { component: { contains: q, mode: "insensitive" } },
        { userName: { contains: q, mode: "insensitive" } },
        { userId: { contains: q, mode: "insensitive" } },
      ];
    }

    const [errors, total, unresolvedCount, criticalCount] = await Promise.all([
      prisma.systemErrorLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.systemErrorLog.count({ where }),
      prisma.systemErrorLog.count({ where: { status: "UNRESOLVED" } }),
      prisma.systemErrorLog.count({ where: { severity: "CRITICAL", status: "UNRESOLVED" } }),
    ]);

    return {
      success: true,
      errors,
      total,
      stats: {
        unresolved: unresolvedCount,
        critical: criticalCount,
      },
    };
  } catch (err: any) {
    console.error("Failed to fetch system errors:", err);
    return { success: false, error: err.message, errors: [], total: 0, stats: { unresolved: 0, critical: 0 } };
  }
}

/**
 * Updates status of a system error (UNRESOLVED -> INVESTIGATING / RESOLVED / IGNORED).
 */
export async function resolveSystemErrorAction(errorId: string, status: "UNRESOLVED" | "INVESTIGATING" | "RESOLVED" | "IGNORED") {
  try {
    const updated = await prisma.systemErrorLog.update({
      where: { id: errorId },
      data: { status },
    });
    return { success: true, record: updated };
  } catch (err: any) {
    console.error("Failed to update error status:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Purges old system error logs older than X days.
 */
export async function clearOldSystemErrorsAction(daysOld: number = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deleted = await prisma.systemErrorLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return { success: true, count: deleted.count };
  } catch (err: any) {
    console.error("Failed to clear old system error logs:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Test Server Action to simulate a server-side exception and verify email notification & DB logging.
 */
export async function testTriggerErrorAction(simulatedMessage?: string) {
  try {
    const msg = simulatedMessage || "Simulated test exception for real-time error logging verification.";
    throw new Error(msg);
  } catch (err: any) {
    const logged = await logSystemError({
      message: err.message,
      stack: err.stack,
      errorName: err.name || "TestException",
      source: "SERVER",
      severity: "CRITICAL",
      route: "/developer",
      component: "testTriggerErrorAction",
      metadata: {
        testMode: true,
        initiatedBy: "Admin Diagnostics Test",
        timestamp: new Date().toISOString(),
      },
    });
    return { success: true, message: "Test error successfully captured into database and mail sent to admin.", errorRecord: logged };
  }
}
