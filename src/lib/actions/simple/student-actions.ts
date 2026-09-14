"use server";

import prisma from "../../prisma";
import { requireIdentity, toNumber, computeTuitionAndAncillary } from "./shared";
import { revalidatePath } from "next/cache";

const MANAGER_ROLES = new Set(["OWNER", "DEVELOPER", "PLATFORM_ADMIN"]);

/** Branches this identity is allowed to act on: their own for STAFF/PRINCIPAL, all of the school for OWNER/DEVELOPER. */
export async function listMyBranches() {
  try {
    const identity = await requireIdentity();
    // NOTE: Branch.status is stored inconsistently across the data ("Active"
    // vs "ACTIVE"), so this excludes case-insensitively rather than matching
    // "Active" exactly (which silently returned zero rows before). Also: the
    // tenancy extension rejects a truly empty `where` on findMany/count as an
    // "ambiguous query" — the NOT clause below keeps this non-empty.
    const branches = await prisma.branch.findMany({
      where: { NOT: { status: { equals: "Inactive", mode: "insensitive" } } },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
    return {
      success: true as const,
      data: branches,
      canPickBranch: MANAGER_ROLES.has(identity.role),
      myBranchId: identity.branchId || null,
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load branches." };
  }
}

export async function listClassesForBranch(branchId: string) {
  try {
    await requireIdentity();
    const classes = await prisma.class.findMany({
      where: { branchId },
      orderBy: { level: "asc" },
      select: { id: true, name: true },
    });
    return { success: true as const, data: classes };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load classes." };
  }
}

/**
 * Distinct class names across whatever branch(es) this identity can see,
 * for filter dropdowns — filtering by NAME (not id) so one dropdown works
 * whether the list is scoped to one branch or (for an owner) the whole school.
 */
export async function listDistinctClassNames(branchId?: string) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const scopeBranchId = canPickBranch ? branchId : identity.branchId;

    const classes = await prisma.class.findMany({
      where: { level: { gte: 0 }, ...(scopeBranchId ? { branchId: scopeBranchId } : {}) },
      select: { name: true, level: true },
    });
    const byName = new Map<string, number>();
    for (const c of classes) if (!byName.has(c.name)) byName.set(c.name, c.level);
    const distinct = [...byName.entries()].map(([name, level]) => ({ name, level })).sort((a, b) => a.level - b.level);
    return { success: true as const, data: distinct };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load classes." };
  }
}

export type StudentSortKey =
  | "name"
  | "nameDesc"
  | "admissionNumber"
  | "admissionNumberDesc"
  | "class"
  | "classDesc"
  | "balance"
  | "balanceAsc"
  | "totalFee"
  | "totalFeeAsc"
  | "paid"
  | "paidAsc"
  | "joiningDate"
  | "joiningDateAsc";

export type StudentListParams = {
  page?: number;
  className?: string;
  branchId?: string;
  gender?: string;
  status?: "active" | "inactive" | "all";
  feeStatus?: "all" | "dues" | "paid-up" | "no-payment";
  transport?: "all" | "yes" | "no";
  q?: string;
  sortBy?: StudentSortKey;
};

/** Every distinct gender value actually present, for the filter dropdown. */
export async function listStudentFilterOptions(branchId?: string) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const scopeBranchId = canPickBranch ? branchId : identity.branchId;

    const students = await prisma.student.findMany({
      where: { isDeleted: false, ...(scopeBranchId ? { branchId: scopeBranchId } : {}) },
      select: { gender: true, status: true },
    });
    const genders = [...new Set(students.map((s) => s.gender).filter((g): g is string => !!g))].sort();
    const statuses = [...new Set(students.map((s) => s.status).filter(Boolean))].sort();
    return { success: true as const, data: { genders, statuses } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load filter options." };
  }
}

/**
 * Paginated, branch-safe student list with the full set of filters/sorts.
 * Balance/paid/fee-status depend on computed values (not plain DB columns), so
 * this fetches every student matching the simple (DB-level) filters, computes
 * balances in memory the same way the fee reports do, then applies the
 * computed-field filter/sort/pagination — same pattern as getPendingDuesReport.
 */
export async function listStudents(params: StudentListParams = {}) {
  try {
    const identity = await requireIdentity();
    const page = Math.max(1, params.page ?? 1);
    const pageSize = 25;

    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;

    const where: any = {
      isDeleted: false,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      ...(params.className ? { academic: { class: { name: params.className } } } : {}),
      ...(params.gender ? { gender: params.gender } : {}),
      ...(params.status && params.status !== "all"
        ? { status: { equals: params.status === "active" ? "ACTIVE" : "INACTIVE", mode: "insensitive" } }
        : {}),
      ...(params.q
        ? {
            OR: [
              { firstName: { contains: params.q, mode: "insensitive" } },
              { lastName: { contains: params.q, mode: "insensitive" } },
              { admissionNumber: { contains: params.q, mode: "insensitive" } },
              { family: { fatherName: { contains: params.q, mode: "insensitive" } } },
              { family: { fatherPhone: { contains: params.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const students = await prisma.student.findMany({
      where,
      include: {
        academic: { include: { class: true } },
        branch: { select: { name: true } },
        family: { select: { fatherPhone: true, fatherName: true } },
        financial: { include: { components: true } },
        collections: { where: { status: "Success", isDeleted: false }, select: { amountPaid: true } },
      },
    });

    let enriched = students.map((s) => {
      const { tuition, ancillary } = computeTuitionAndAncillary(s.financial as any);
      const extra = (s.financial?.components ?? [])
        .filter((c) => c.isApplicable)
        .reduce((sum, c) => sum + toNumber(c.baseAmount) - toNumber(c.waiverAmount) - toNumber(c.discountAmount), 0);
      const totalCharges = tuition + ancillary.reduce((sum, r) => sum + r.amount, 0) + extra;
      const paid = s.collections.reduce((sum, c) => sum + toNumber(c.amountPaid), 0);
      const balance = totalCharges - paid;
      const hasTransport = toNumber(s.financial?.transportFee) > 0;
      return {
        id: s.id,
        name: [s.firstName, s.lastName].filter(Boolean).join(" "),
        admissionNumber: s.admissionNumber,
        className: s.academic?.class?.name ?? null,
        classLevel: s.academic?.class?.level ?? 999,
        branchName: s.branch?.name ?? null,
        status: s.status,
        gender: s.gender,
        parentName: s.family?.fatherName ?? null,
        parentPhone: s.family?.fatherPhone ?? null,
        hasTransport,
        joiningDate: s.academic?.admissionDate ?? s.createdAt,
        totalCharges,
        paid,
        balance,
      };
    });

    if (params.transport === "yes") enriched = enriched.filter((s) => s.hasTransport);
    if (params.transport === "no") enriched = enriched.filter((s) => !s.hasTransport);
    if (params.feeStatus === "dues") enriched = enriched.filter((s) => s.balance > 0);
    if (params.feeStatus === "paid-up") enriched = enriched.filter((s) => s.balance <= 0 && s.totalCharges > 0);
    if (params.feeStatus === "no-payment") enriched = enriched.filter((s) => s.paid === 0);

    const sortBy = params.sortBy ?? "name";
    const cmp = {
      name: (a: any, b: any) => a.name.localeCompare(b.name),
      nameDesc: (a: any, b: any) => b.name.localeCompare(a.name),
      admissionNumber: (a: any, b: any) => (a.admissionNumber || "").localeCompare(b.admissionNumber || ""),
      admissionNumberDesc: (a: any, b: any) => (b.admissionNumber || "").localeCompare(a.admissionNumber || ""),
      class: (a: any, b: any) => a.classLevel - b.classLevel,
      classDesc: (a: any, b: any) => b.classLevel - a.classLevel,
      balance: (a: any, b: any) => b.balance - a.balance,
      balanceAsc: (a: any, b: any) => a.balance - b.balance,
      totalFee: (a: any, b: any) => b.totalCharges - a.totalCharges,
      totalFeeAsc: (a: any, b: any) => a.totalCharges - b.totalCharges,
      paid: (a: any, b: any) => b.paid - a.paid,
      paidAsc: (a: any, b: any) => a.paid - b.paid,
      joiningDate: (a: any, b: any) => new Date(b.joiningDate).getTime() - new Date(a.joiningDate).getTime(),
      joiningDateAsc: (a: any, b: any) => new Date(a.joiningDate).getTime() - new Date(b.joiningDate).getTime(),
    }[sortBy];
    enriched.sort(cmp);

    const total = enriched.length;
    const pageItems = enriched.slice((page - 1) * pageSize, page * pageSize);

    return {
      success: true as const,
      data: { students: pageItems, total, page, pageSize },
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load students." };
  }
}

export async function createStudent(input: {
  firstName: string;
  lastName?: string;
  branchId: string;
  classId?: string;
  parentName?: string;
  parentPhone?: string;
  tuitionFee: number;
  admissionFee?: number;
  transportFee?: number;
  concession?: number;
}) {
  try {
    const identity = await requireIdentity();

    if (!input.firstName?.trim()) {
      return { success: false as const, error: "Student name is required." };
    }

    // Mirrors the tenancy extension's own rule (src/lib/prisma-tenancy.ts): a
    // STAFF/PRINCIPAL identity is always jailed to their own branch for the
    // top-level Student write. That auto-correction does NOT reach nested
    // relation writes (academic/family below), so resolve the effective
    // branch here rather than trusting client input for those roles.
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? input.branchId : identity.branchId;

    if (!effectiveBranchId) {
      return { success: false as const, error: "Branch is required." };
    }

    const branch = await prisma.branch.findUnique({
      where: { id: effectiveBranchId },
      select: { id: true, schoolId: true },
    });
    if (!branch) {
      return { success: false as const, error: "Branch not found." };
    }

    const admissionNumber = `TMP${Date.now().toString().slice(-8)}`;
    const tuitionFee = Number(input.tuitionFee) || 0;
    const concession = Number(input.concession) || 0;
    const netTuition = Math.max(tuitionFee - concession, 0);

    const student = await prisma.student.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName?.trim() || null,
        admissionNumber,
        studentCode: admissionNumber,
        branchId: effectiveBranchId,
        status: "ACTIVE",
        ...(input.classId
          ? {
              academic: {
                create: {
                  admissionDate: new Date(),
                  academicYear: new Date().getFullYear().toString(),
                  classId: input.classId,
                  branchId: effectiveBranchId,
                },
              },
            }
          : {}),
        ...(input.parentName || input.parentPhone
          ? {
              family: {
                create: {
                  fatherName: input.parentName?.trim() || null,
                  fatherPhone: input.parentPhone?.trim() || null,
                },
              },
            }
          : {}),
        financial: {
          create: {
            annualTuition: tuitionFee,
            tuitionFee,
            totalDiscount: concession,
            netTuition,
            admissionFee: Number(input.admissionFee) || 0,
            transportFee: Number(input.transportFee) || 0,
            paymentType: "Term-wise",
          },
        },
      } as any,
      select: { id: true },
    });

    revalidatePath("/simple/students");
    return { success: true as const, studentId: student.id, admissionNumber };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not add student." };
  }
}
