"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
import crypto from "crypto";

// ── Types ──────────────────────────────────────────────────────────────────

export type CalendarDayType =
  | "HOLIDAY"
  | "PUBLIC_HOLIDAY"
  | "WEEKLY_OFF"
  | "WORKING"
  | "EXTRA_WORKING";

export interface CalendarDay {
  id: string;
  date: string;        // YYYY-MM-DD
  type: CalendarDayType;
  reason: string;
  source: string;
  isOverride: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toDateOnly(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isSecondSaturday(date: Date): boolean {
  if (date.getDay() !== 6) return false;
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstSat = (6 - firstDay.getDay() + 7) % 7 + 1;
  const secondSat = firstSat + 7;
  return date.getDate() === secondSat;
}

// ── FETCH MONTH ────────────────────────────────────────────────────────────

export async function getCalendarMonthAction(year: number, month: number, branchId?: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");
    const schoolId = identity.schoolId;

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    // Fetch school settings for saturday policy
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { saturdayPolicy: true }
    });
    const satPolicy = school?.saturdayPolicy || "ALL_WORKING";

    let timezone = "Asia/Kolkata";
    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { timezone: true }
      });
      if (branch) {
        timezone = branch.timezone;
      }
    }

    // Fetch DB entries for this month
    const dbEntries = await prisma.schoolCalendar.findMany({
      where: {
        schoolId,
        ...(branchId ? { branchId } : {}),
        date: { gte: monthStart, lte: monthEnd }
      }
    });

    const dbMap = new Map<string, typeof dbEntries[0]>();
    for (const e of dbEntries) {
      dbMap.set(toDateOnly(new Date(e.date)), e);
    }

    // Fetch public holidays for this month
    const publicHolidays = await prismaBypass.publicHolidayMaster.findMany({
      where: {
        year,
        date: { gte: monthStart, lte: monthEnd }
      }
    });
    const phMap = new Map<string, typeof publicHolidays[0]>();
    for (const h of publicHolidays) {
      phMap.set(toDateOnly(new Date(h.date)), h);
    }

    // Build full month grid
    const days: CalendarDay[] = [];
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = toDateOnly(new Date(d));
      const dow = d.getDay(); // 0=Sun, 6=Sat

      const dbEntry = dbMap.get(dateStr);
      const ph = phMap.get(dateStr);

      if (dbEntry) {
        // Explicit DB entry wins
        days.push({
          id: dbEntry.id,
          date: dateStr,
          type: dbEntry.type as CalendarDayType,
          reason: dbEntry.reason,
          source: dbEntry.source,
          isOverride: dbEntry.isOverride
        });
      } else if (dow === 0) {
        // Sunday — always off
        days.push({ id: "", date: dateStr, type: "WEEKLY_OFF", reason: "Sunday", source: "AUTO", isOverride: false });
      } else if (dow === 6 && satPolicy === "SECOND_OFF" && isSecondSaturday(new Date(d))) {
        days.push({ id: "", date: dateStr, type: "WEEKLY_OFF", reason: "2nd Saturday Off", source: "AUTO", isOverride: false });
      } else if (dow === 6 && satPolicy === "ALL_OFF") {
        days.push({ id: "", date: dateStr, type: "WEEKLY_OFF", reason: "Saturday Off", source: "AUTO", isOverride: false });
      } else if (ph) {
        // Public holiday from master list
        days.push({ id: "", date: dateStr, type: "PUBLIC_HOLIDAY", reason: ph.name, source: "GOVT", isOverride: false });
      } else {
        days.push({ id: "", date: dateStr, type: "WORKING", reason: "", source: "AUTO", isOverride: false });
      }
    }

    const workingCount = days.filter(d => d.type === "WORKING" || d.type === "EXTRA_WORKING").length;

    return { success: true, days, workingDays: workingCount, satPolicy, timezone };
  } catch (error: any) {
    return { success: false, error: error.message, days: [], workingDays: 0, satPolicy: "ALL_WORKING", timezone: "Asia/Kolkata" };
  }
}

// ── UPSERT DAY ─────────────────────────────────────────────────────────────

export async function setCalendarDayAction(
  date: string,
  type: CalendarDayType,
  reason: string,
  branchId?: string
) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const allowed = ["OWNER", "PRINCIPAL", "ADMIN"];
    if (!allowed.includes(identity.role)) throw new Error("ACCESS_DENIED: Only Owner, Principal or Admin can edit the calendar.");

    if (!reason.trim()) throw new Error("VALIDATION: A reason is required.");

    const schoolId = identity.schoolId;
    const dateObj = new Date(date + "T00:00:00.000Z");

    const existing = await prisma.schoolCalendar.findFirst({
      where: { schoolId, date: dateObj, branchId: branchId || null }
    });

    if (existing) {
      await prisma.schoolCalendar.update({
        where: { id: existing.id, schoolId },
        data: { type, reason: reason.trim(), isOverride: true, source: "SCHOOL" }
      });
    } else {
      await prisma.schoolCalendar.create({
        data: {
          id: crypto.randomUUID(),
          schoolId,
          branchId: branchId || null,
          date: dateObj,
          type,
          reason: reason.trim(),
          source: "SCHOOL",
          isOverride: true,
          createdBy: identity.staffId
        }
      });
    }

    revalidatePath("/dashboard/calendar");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── RESET DAY (remove manual override) ────────────────────────────────────

export async function resetCalendarDayAction(date: string, branchId?: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const allowed = ["OWNER", "PRINCIPAL", "ADMIN"];
    if (!allowed.includes(identity.role)) throw new Error("ACCESS_DENIED");

    const schoolId = identity.schoolId;
    const dateObj = new Date(date + "T00:00:00.000Z");

    await prisma.schoolCalendar.deleteMany({
      where: { schoolId, date: dateObj, source: "SCHOOL", branchId: branchId || null }
    });

    revalidatePath("/dashboard/calendar");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── LOAD INDIA PUBLIC HOLIDAYS ─────────────────────────────────────────────

const INDIA_HOLIDAYS_2025: { date: string; name: string; type: string }[] = [
  { date: "2025-01-26", name: "Republic Day", type: "PUBLIC" },
  { date: "2025-03-14", name: "Holi", type: "PUBLIC" },
  { date: "2025-03-31", name: "Id-ul-Fitr (Eid)", type: "PUBLIC" },
  { date: "2025-04-14", name: "Dr. Ambedkar Jayanti / Baisakhi", type: "PUBLIC" },
  { date: "2025-04-18", name: "Good Friday", type: "PUBLIC" },
  { date: "2025-05-12", name: "Buddha Purnima", type: "PUBLIC" },
  { date: "2025-06-07", name: "Id-ul-Zuha (Bakrid)", type: "PUBLIC" },
  { date: "2025-07-06", name: "Muharram", type: "PUBLIC" },
  { date: "2025-08-15", name: "Independence Day", type: "PUBLIC" },
  { date: "2025-09-05", name: "Milad-un-Nabi", type: "PUBLIC" },
  { date: "2025-10-02", name: "Gandhi Jayanti", type: "PUBLIC" },
  { date: "2025-10-02", name: "Mahatma Gandhi Jayanti", type: "PUBLIC" },
  { date: "2025-10-20", name: "Dussehra (Vijayadashami)", type: "PUBLIC" },
  { date: "2025-10-20", name: "Diwali (Deepawali)", type: "PUBLIC" },
  { date: "2025-11-05", name: "Diwali", type: "PUBLIC" },
  { date: "2025-11-15", name: "Guru Nanak Jayanti", type: "PUBLIC" },
  { date: "2025-12-25", name: "Christmas Day", type: "PUBLIC" },
];

const INDIA_HOLIDAYS_2026: { date: string; name: string; type: string }[] = [
  { date: "2026-01-26", name: "Republic Day", type: "PUBLIC" },
  { date: "2026-03-03", name: "Holi", type: "PUBLIC" },
  { date: "2026-03-20", name: "Id-ul-Fitr (Eid)", type: "PUBLIC" },
  { date: "2026-04-02", name: "Ram Navami", type: "PUBLIC" },
  { date: "2026-04-03", name: "Good Friday", type: "PUBLIC" },
  { date: "2026-04-14", name: "Dr. Ambedkar Jayanti", type: "PUBLIC" },
  { date: "2026-05-01", name: "Labour Day", type: "PUBLIC" },
  { date: "2026-05-31", name: "Buddha Purnima", type: "PUBLIC" },
  { date: "2026-06-27", name: "Id-ul-Zuha (Bakrid)", type: "PUBLIC" },
  { date: "2026-07-25", name: "Muharram", type: "PUBLIC" },
  { date: "2026-08-15", name: "Independence Day", type: "PUBLIC" },
  { date: "2026-08-25", name: "Janmashtami", type: "PUBLIC" },
  { date: "2026-09-24", name: "Milad-un-Nabi", type: "PUBLIC" },
  { date: "2026-10-02", name: "Gandhi Jayanti", type: "PUBLIC" },
  { date: "2026-10-19", name: "Dussehra (Vijayadashami)", type: "PUBLIC" },
  { date: "2026-11-08", name: "Diwali (Deepawali)", type: "PUBLIC" },
  { date: "2026-11-24", name: "Guru Nanak Jayanti", type: "PUBLIC" },
  { date: "2026-12-25", name: "Christmas Day", type: "PUBLIC" },
];

export async function loadPublicHolidaysAction(year: number) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");
    if (!["OWNER", "PRINCIPAL", "ADMIN"].includes(identity.role)) throw new Error("ACCESS_DENIED");

    const list = year === 2025 ? INDIA_HOLIDAYS_2025 : year === 2026 ? INDIA_HOLIDAYS_2026 : [];
    if (list.length === 0) return { success: false, error: `No holiday data for ${year}.` };

    let loaded = 0;
    for (const h of list) {
      const dateObj = new Date(h.date + "T00:00:00.000Z");
      const existing = await prismaBypass.publicHolidayMaster.findFirst({
        where: { country: "India", state: null, year, date: dateObj }
      });
      if (!existing) {
        await prismaBypass.publicHolidayMaster.create({
          data: {
            id: crypto.randomUUID(),
            country: "India",
            state: null,
            year,
            date: dateObj,
            name: h.name,
            type: h.type
          }
        });
        loaded++;
      }
    }

    return { success: true, message: `Loaded ${loaded} public holidays for ${year}.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── UPDATE SATURDAY POLICY ─────────────────────────────────────────────────

export async function updateSaturdayPolicyAction(policy: "ALL_WORKING" | "SECOND_OFF" | "ALL_OFF") {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");
    if (!["OWNER", "PRINCIPAL"].includes(identity.role)) throw new Error("ACCESS_DENIED: Only Owner or Principal can change Saturday policy.");

    await prisma.school.update({
      where: { id: identity.schoolId },
      data: { saturdayPolicy: policy }
    });

    revalidatePath("/dashboard/calendar");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
