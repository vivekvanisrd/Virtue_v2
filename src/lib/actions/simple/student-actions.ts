"use server";

import prisma from "../../prisma";
import { requireIdentity, toNumber, computeTuitionAndAncillary, computeTermBreakdown, normalizeIndianPhone } from "./shared";
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
      where: { schoolId: identity.schoolId, NOT: { status: { equals: "Inactive", mode: "insensitive" } } },
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
    const identity = await requireIdentity();
    const classes = await prisma.class.findMany({
      where: { schoolId: identity.schoolId, branchId },
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
      where: { schoolId: identity.schoolId, level: { gte: 0 }, ...(scopeBranchId ? { branchId: scopeBranchId } : {}) },
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

export type TermFilter = "all" | "term1-due" | "term1-paid" | "term2-due" | "term2-paid" | "term3-due" | "term3-paid" | "partial";

export type StudentListParams = {
  page?: number;
  className?: string;
  branchId?: string;
  gender?: string;
  status?: "active" | "inactive" | "all";
  feeStatus?: "all" | "dues" | "paid-up" | "no-payment";
  transport?: "all" | "yes" | "no";
  termFilter?: TermFilter;
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
      where: { schoolId: identity.schoolId, isDeleted: false, ...(scopeBranchId ? { branchId: scopeBranchId } : {}) },
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
      schoolId: identity.schoolId,
      isDeleted: false,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      ...(params.className ? { academic: { class: { name: params.className } } } : {}),
      ...(params.gender ? { gender: params.gender } : {}),
      // "Active" means "not marked Inactive" (exclusion), not "status literally
      // equals ACTIVE" (inclusion) — the real data uses several in-use status
      // values across different admission workflows (ACTIVE, CONFIRMED,
      // PROVISIONAL), not just the one this module's own create-student flow
      // happens to write. An inclusion match against "ACTIVE" silently hid an
      // entire branch's real students whose status was CONFIRMED/PROVISIONAL
      // instead — matches the exclusion pattern already used for Branch.status
      // above and in dashboard-actions.ts.
      ...(params.status && params.status !== "all"
        ? params.status === "active"
          ? { NOT: { status: { equals: "INACTIVE", mode: "insensitive" } } }
          : { status: { equals: "INACTIVE", mode: "insensitive" } }
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
        collections: { where: { status: "Success", isDeleted: false }, select: { amountPaid: true, allocatedTo: true } },
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
      const termBreakdown = computeTermBreakdown(s.financial as any, s.collections);
      return {
        id: s.id,
        name: [s.firstName, s.lastName].filter(Boolean).join(" "),
        firstName: s.firstName,
        lastName: s.lastName ?? "",
        admissionNumber: s.admissionNumber,
        className: s.academic?.class?.name ?? null,
        classLevel: s.academic?.class?.level ?? 999,
        branchName: s.branch?.name ?? null,
        status: s.status,
        gender: s.gender,
        parentName: s.family?.fatherName ?? "",
        parentPhone: (s.family?.fatherPhone ?? "").replace(/\.0$/, ""),
        hasTransport,
        joiningDate: s.academic?.admissionDate ?? s.createdAt,
        tuitionFee: toNumber(s.financial?.tuitionFee),
        admissionFee: toNumber(s.financial?.admissionFee),
        transportFee: toNumber(s.financial?.transportFee),
        concession: toNumber(s.financial?.totalDiscount),
        totalCharges,
        paid,
        balance,
        termBreakdown,
      };
    });

    if (params.transport === "yes") enriched = enriched.filter((s) => s.hasTransport);
    if (params.transport === "no") enriched = enriched.filter((s) => !s.hasTransport);
    if (params.feeStatus === "dues") enriched = enriched.filter((s) => s.balance > 0);
    if (params.feeStatus === "paid-up") enriched = enriched.filter((s) => s.balance <= 0 && s.totalCharges > 0);
    if (params.feeStatus === "no-payment") enriched = enriched.filter((s) => s.paid === 0);

    const termFilter = params.termFilter ?? "all";
    if (termFilter === "partial") enriched = enriched.filter((s) => s.paid > 0 && s.balance > 0);
    if (termFilter === "term1-due") enriched = enriched.filter((s) => s.termBreakdown.term1.status === "due" || s.termBreakdown.term1.status === "partial");
    if (termFilter === "term1-paid") enriched = enriched.filter((s) => s.termBreakdown.term1.status === "paid");
    if (termFilter === "term2-due") enriched = enriched.filter((s) => s.termBreakdown.term2.status === "due" || s.termBreakdown.term2.status === "partial");
    if (termFilter === "term2-paid") enriched = enriched.filter((s) => s.termBreakdown.term2.status === "paid");
    if (termFilter === "term3-due") enriched = enriched.filter((s) => s.termBreakdown.term3.status === "due" || s.termBreakdown.term3.status === "partial");
    if (termFilter === "term3-paid") enriched = enriched.filter((s) => s.termBreakdown.term3.status === "paid");

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
  gender?: string;
  branchId: string;
  classId?: string;
  sectionId?: string;
  parentName?: string;
  parentPhone?: string;
  tuitionFee: number;
  admissionFee?: number;
  transportFee?: number;
  concession?: number;
  feeStructureId?: string;
  discountTypeId?: string;
}) {
  try {
    const identity = await requireIdentity();

    if (!input.firstName?.trim()) {
      return { success: false as const, error: "Student name is required." };
    }

    const phone = normalizeIndianPhone(input.parentPhone);
    if (phone.error) {
      return { success: false as const, error: phone.error };
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

    const branch = await prisma.branch.findFirst({
      where: { id: effectiveBranchId, schoolId: identity.schoolId },
      select: { id: true, schoolId: true },
    });
    if (!branch) {
      return { success: false as const, error: "Branch not found." };
    }

    const admissionNumber = `TMP${Date.now().toString().slice(-8)}`;
    const tuitionFee = Number(input.tuitionFee) || 0;
    const concession = Number(input.concession) || 0;
    const netTuition = Math.max(tuitionFee - concession, 0);
    // Same 50% / 25% / 25% split the legacy system has always used (see
    // computeTermBreakdown in shared.ts) — stored here as the pre-discount
    // base, matching how the legacy admission flow populates these columns.
    const term1Amount = Math.round(tuitionFee * 0.5);
    const term2Amount = Math.round(tuitionFee * 0.25);
    const term3Amount = Math.round(tuitionFee * 0.25);

    // NOTE: the tenancy extension only auto-injects schoolId/branchId on the
    // TOP-LEVEL write it's called with — nested relation writes (academic/
    // family/financial below, all created in this same `student.create` call)
    // are never separately intercepted, so they need schoolId set explicitly
    // here or they'd be left untagged regardless of role.
    const student = await prisma.student.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName?.trim() || null,
        gender: input.gender || null,
        admissionNumber,
        studentCode: admissionNumber,
        schoolId: identity.schoolId,
        branchId: effectiveBranchId,
        status: "ACTIVE",
        ...(input.classId
          ? {
              academic: {
                create: {
                  admissionDate: new Date(),
                  academicYear: new Date().getFullYear().toString(),
                  classId: input.classId,
                  sectionId: input.sectionId || null,
                  schoolId: identity.schoolId,
                  branchId: effectiveBranchId,
                },
              },
            }
          : {}),
        ...(input.parentName || phone.value
          ? {
              family: {
                create: {
                  fatherName: input.parentName?.trim() || null,
                  fatherPhone: phone.value,
                  schoolId: identity.schoolId,
                  branchId: effectiveBranchId,
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
            term1Amount,
            term2Amount,
            term3Amount,
            paymentType: "Term-wise",
            feeStructureId: input.feeStructureId || null,
            schoolId: identity.schoolId,
            branchId: effectiveBranchId,
          },
        },
      } as any,
      select: { id: true },
    });

    // A picked discount TYPE (vs. the flat manual `concession` number) creates
    // a real, auditable Discount row and recomputes totalDiscount/netTuition
    // from it — see fee-master-actions.ts. Done as a second step because it
    // needs the FinancialRecord id that only exists after the create above.
    if (input.discountTypeId) {
      const { applyDiscountToStudent } = await import("./fee-master-actions");
      await applyDiscountToStudent({ studentId: student.id, discountTypeId: input.discountTypeId });
    }

    revalidatePath("/simple/students");
    return { success: true as const, studentId: student.id, admissionNumber };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not add student." };
  }
}

/** Editable fields for one student, for the edit form. */
export async function getStudentForEdit(studentId: string) {
  try {
    const identity = await requireIdentity();
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: identity.schoolId },
      include: {
        academic: { select: { classId: true, sectionId: true } },
        family: { select: { fatherName: true, fatherPhone: true } },
        financial: {
          select: {
            tuitionFee: true,
            totalDiscount: true,
            admissionFee: true,
            transportFee: true,
            term1Amount: true,
            term2Amount: true,
            term3Amount: true,
          },
        },
        branch: { select: { id: true, name: true } },
      },
    });
    if (!student) return { success: false as const, error: "Student not found." };

    return {
      success: true as const,
      data: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName ?? "",
        gender: student.gender ?? "",
        branchId: student.branch?.id ?? "",
        branchName: student.branch?.name ?? "",
        classId: student.academic?.classId ?? "",
        sectionId: student.academic?.sectionId ?? "",
        parentName: student.family?.fatherName ?? "",
        parentPhone: (student.family?.fatherPhone ?? "").replace(/\.0$/, ""),
        tuitionFee: toNumber(student.financial?.tuitionFee),
        concession: toNumber(student.financial?.totalDiscount),
        admissionFee: toNumber(student.financial?.admissionFee),
        transportFee: toNumber(student.financial?.transportFee),
        term1Amount: toNumber(student.financial?.term1Amount),
        term2Amount: toNumber(student.financial?.term2Amount),
        term3Amount: toNumber(student.financial?.term3Amount),
      },
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load student." };
  }
}

export async function updateStudent(
  studentId: string,
  input: {
    firstName: string;
    lastName?: string;
    gender?: string;
    branchId?: string;
    classId?: string;
    sectionId?: string;
    parentName?: string;
    parentPhone?: string;
    tuitionFee: number;
    admissionFee?: number;
    transportFee?: number;
    concession?: number;
    term1Amount?: number;
    term2Amount?: number;
    term3Amount?: number;
  }
) {
  try {
    const identity = await requireIdentity();

    if (!input.firstName?.trim()) {
      return { success: false as const, error: "Student name is required." };
    }

    const phone = normalizeIndianPhone(input.parentPhone);
    if (phone.error) {
      return { success: false as const, error: phone.error };
    }

    const existing = await prisma.student.findFirst({
      where: { id: studentId, schoolId: identity.schoolId },
      select: { id: true, branchId: true },
    });
    if (!existing) return { success: false as const, error: "Student not found." };

    // Same rule as createStudent: only OWNER/DEVELOPER/PLATFORM_ADMIN may move
    // a student to a different branch; STAFF/PRINCIPAL keep the student's
    // existing branch no matter what the form submitted.
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch && input.branchId ? input.branchId : existing.branchId!;

    const tuitionFee = Number(input.tuitionFee) || 0;
    const concession = Number(input.concession) || 0;
    const netTuition = Math.max(tuitionFee - concession, 0);
    // Same 50% / 25% / 25% split as createStudent (see computeTermBreakdown
    // in shared.ts) unless the form explicitly overrides one of the terms.
    const term1Amount = input.term1Amount != null ? Number(input.term1Amount) || 0 : Math.round(tuitionFee * 0.5);
    const term2Amount = input.term2Amount != null ? Number(input.term2Amount) || 0 : Math.round(tuitionFee * 0.25);
    const term3Amount = input.term3Amount != null ? Number(input.term3Amount) || 0 : Math.round(tuitionFee * 0.25);

    await prisma.student.update({
      where: { id: existing.id },
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName?.trim() || null,
        gender: input.gender || null,
        ...(canPickBranch ? { branchId: effectiveBranchId } : {}),
        ...(input.classId
          ? {
              academic: {
                upsert: {
                  create: {
                    admissionDate: new Date(),
                    academicYear: new Date().getFullYear().toString(),
                    classId: input.classId,
                    sectionId: input.sectionId || null,
                    schoolId: identity.schoolId,
                    branchId: effectiveBranchId,
                  },
                  update: { classId: input.classId, sectionId: input.sectionId || null },
                },
              },
            }
          : {}),
        ...(input.parentName || phone.value
          ? {
              family: {
                upsert: {
                  create: {
                    fatherName: input.parentName?.trim() || null,
                    fatherPhone: phone.value,
                    schoolId: identity.schoolId,
                    branchId: effectiveBranchId,
                  },
                  update: {
                    fatherName: input.parentName?.trim() || null,
                    fatherPhone: phone.value,
                  },
                },
              },
            }
          : {}),
        financial: {
          update: {
            annualTuition: tuitionFee,
            tuitionFee,
            totalDiscount: concession,
            netTuition,
            admissionFee: Number(input.admissionFee) || 0,
            transportFee: Number(input.transportFee) || 0,
            term1Amount,
            term2Amount,
            term3Amount,
          },
        },
      } as any,
    });

    revalidatePath(`/simple/students/${existing.id}`);
    revalidatePath("/simple/students");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not update student." };
  }
}

export type BulkStudentFieldChanges = Partial<{
  firstName: string;
  lastName: string;
  parentName: string;
  parentPhone: string;
  tuitionFee: number;
  admissionFee: number;
  transportFee: number;
  concession: number;
}>;

/**
 * Applied by the "View as Excel" grid (ExcelView) — one row per student, only
 * the cells that actually changed. Reuses updateStudent for each row (rather
 * than writing FinancialRecord columns directly) so the same netTuition/term
 * recompute and tenancy checks apply whether a student is edited one-by-one
 * on their own page or in bulk here.
 */
export async function bulkUpdateStudentFields(rows: { id: string; changes: BulkStudentFieldChanges }[]) {
  const results: { id: string; success: boolean; error?: string }[] = [];
  for (const row of rows) {
    const current = await getStudentForEdit(row.id);
    if (!current.success) {
      results.push({ id: row.id, success: false, error: current.error });
      continue;
    }
    const merged = { ...current.data, ...row.changes };
    const res = await updateStudent(row.id, {
      firstName: merged.firstName,
      lastName: merged.lastName,
      parentName: merged.parentName,
      parentPhone: merged.parentPhone,
      tuitionFee: merged.tuitionFee,
      admissionFee: merged.admissionFee,
      transportFee: merged.transportFee,
      concession: merged.concession,
    });
    results.push({ id: row.id, success: res.success, error: res.success ? undefined : res.error });
  }

  const failed = results.filter((r) => !r.success);
  revalidatePath("/simple/students");
  return {
    success: failed.length === 0,
    saved: results.length - failed.length,
    failed: failed.length,
    errors: failed.map((f) => `${f.id}: ${f.error}`),
  };
}
