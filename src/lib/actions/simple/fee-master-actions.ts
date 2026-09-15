"use server";

/**
 * FEE MASTER + DISCOUNTS — new, additive module for the "/simple" frontend.
 *
 * Reuses the real FeeStructure/FeeTemplateComponent/FeeComponentMaster and
 * DiscountType/Discount tables that already exist in the schema (confirmed
 * populated for VIVES: 30 real FeeStructure rows, 14 real DiscountTypes) —
 * this does NOT reinvent a parallel "fee master", it's a simple management
 * UI + auto-populate wiring on top of what already exists.
 *
 * Deliberately does NOT reuse the legacy `alignStudentToClassTemplate`
 * (fee-actions.ts) to push a FeeStructure onto a student: that function sets
 * FinancialRecord.netTuition to the template's *combined* totalAmount AND
 * creates one StudentFeeComponent row per template component — /simple's
 * getStudentBalance would then double-count (netTuition already includes
 * admission fee, then the admission-fee StudentFeeComponent row gets added
 * again as an "extra component"). Instead, the Fee Master's per-component
 * amounts are mapped onto FinancialRecord's own fixed columns (tuitionFee,
 * admissionFee, transportFee) — the same columns /simple has always used —
 * so there is exactly one number for each of those, never two.
 */

import prisma from "../../prisma";
import { requireIdentity, toNumber } from "./shared";
import { revalidatePath } from "next/cache";

const MANAGER_ROLES = new Set(["OWNER", "DEVELOPER", "PLATFORM_ADMIN"]);

async function getCurrentAcademicYear(schoolId: string) {
  return prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
}

export async function listAcademicYears() {
  try {
    const identity = await requireIdentity();
    const years = await prisma.academicYear.findMany({
      where: { schoolId: identity.schoolId },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, isCurrent: true },
    });
    return { success: true as const, data: years };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load academic years." };
  }
}

/** Every Fee Master (FeeStructure) row this identity can see, for the management page. */
export async function listFeeMaster(branchId?: string, q?: string) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = MANAGER_ROLES.has(identity.role);
    const effectiveBranchId = canPickBranch ? branchId : identity.branchId;

    const rows = await prisma.feeStructure.findMany({
      where: {
        schoolId: identity.schoolId,
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        ...(q ? { class: { name: { contains: q, mode: "insensitive" } } } : {}),
      },
      include: {
        branch: { select: { name: true } },
        class: { select: { name: true, level: true } },
        section: { select: { name: true } },
        academicYear: { select: { name: true, isCurrent: true } },
        components: { include: { masterComponent: { select: { name: true } } } },
      },
      orderBy: [{ branchId: "asc" }],
    });

    const data = rows
      .map((r) => {
        const byName = (needle: string) =>
          r.components.find((c) => c.masterComponent?.name?.toLowerCase().includes(needle))?.amount;
        return {
          id: r.id,
          branchName: r.branch?.name ?? "—",
          className: r.class?.name ?? "—",
          classLevel: r.class?.level ?? 999,
          sectionName: r.section?.name ?? null,
          yearName: r.academicYear?.name ?? "—",
          isCurrentYear: r.academicYear?.isCurrent ?? false,
          isActive: r.isActive,
          tuitionFee: toNumber(byName("tuition")),
          admissionFee: toNumber(byName("admission")),
          transportFee: toNumber(byName("transport")),
          totalAmount: toNumber(r.totalAmount),
        };
      })
      .sort((a, b) => (a.branchName.localeCompare(b.branchName) || a.classLevel - b.classLevel || (a.sectionName || "").localeCompare(b.sectionName || "")));

    return { success: true as const, data };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the fee master." };
  }
}

export async function listSectionsForClass(classId: string) {
  try {
    const identity = await requireIdentity();
    const sections = await prisma.section.findMany({
      where: { schoolId: identity.schoolId, classId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { success: true as const, data: sections };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load sections." };
  }
}

/**
 * Used by the admission form: every current-year Fee Master option for one
 * branch+class. Usually this is a single class-wide entry (sectionId null);
 * when a class has genuinely different fees per section (e.g. RCB 2nd Grade
 * Section A vs B), it returns one option per section instead, and the form
 * asks staff to pick a section rather than guessing.
 */
export async function getFeeStructureForClass(branchId: string, classId: string) {
  try {
    const identity = await requireIdentity();
    const year = await getCurrentAcademicYear(identity.schoolId);
    if (!year) return { success: true as const, data: [] };

    const structures = await prisma.feeStructure.findMany({
      where: { schoolId: identity.schoolId, branchId, classId, academicYearId: year.id, isActive: true },
      include: {
        components: { include: { masterComponent: { select: { name: true } } } },
        section: { select: { id: true, name: true } },
      },
    });

    const data = structures.map((structure) => {
      const byName = (needle: string) =>
        structure.components.find((c) => c.masterComponent?.name?.toLowerCase().includes(needle))?.amount;
      return {
        feeStructureId: structure.id,
        sectionId: structure.section?.id ?? null,
        sectionName: structure.section?.name ?? null,
        tuitionFee: toNumber(byName("tuition")),
        admissionFee: toNumber(byName("admission")),
        transportFee: toNumber(byName("transport")),
      };
    });

    return { success: true as const, data };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the class fee." };
  }
}

async function findOrCreateComponentMaster(schoolId: string, branchId: string, name: string, type: "CORE" | "ANCILLARY") {
  const existing = await prisma.feeComponentMaster.findFirst({ where: { schoolId, name } });
  if (existing) return existing.id;
  const created = await prisma.feeComponentMaster.create({
    data: { schoolId, branchId, name, type, isOneTime: false },
  });
  return created.id;
}

/** Create or update one branch+class(+optional section)'s Fee Master entry for the current academic year. */
export async function saveFeeMaster(input: {
  id?: string;
  branchId: string;
  classId: string;
  sectionId?: string | null;
  tuitionFee: number;
  admissionFee?: number;
  transportFee?: number;
}) {
  try {
    const identity = await requireIdentity();
    if (!MANAGER_ROLES.has(identity.role)) {
      return { success: false as const, error: "Only owners/admins can edit the Fee Master." };
    }
    const year = await getCurrentAcademicYear(identity.schoolId);
    if (!year) return { success: false as const, error: "No active academic year is configured yet." };

    const branch = await prisma.branch.findFirst({ where: { id: input.branchId, schoolId: identity.schoolId } });
    if (!branch) return { success: false as const, error: "Branch not found." };
    const klass = await prisma.class.findFirst({ where: { id: input.classId, schoolId: identity.schoolId } });
    if (!klass) return { success: false as const, error: "Class not found." };
    const sectionId = input.sectionId || null;
    const section = sectionId ? await prisma.section.findFirst({ where: { id: sectionId, schoolId: identity.schoolId } }) : null;

    const tuitionFee = Math.max(0, Number(input.tuitionFee) || 0);
    const admissionFee = Math.max(0, Number(input.admissionFee) || 0);
    const transportFee = Math.max(0, Number(input.transportFee) || 0);
    const totalAmount = tuitionFee + admissionFee + transportFee;

    const [tuitionComponentId, admissionComponentId, transportComponentId] = await Promise.all([
      findOrCreateComponentMaster(identity.schoolId, input.branchId, "Tuition Fee", "CORE"),
      findOrCreateComponentMaster(identity.schoolId, input.branchId, "Admission Fee", "CORE"),
      findOrCreateComponentMaster(identity.schoolId, input.branchId, "Transport Fee", "ANCILLARY"),
    ]);

    const existing = input.id
      ? await prisma.feeStructure.findFirst({ where: { id: input.id, schoolId: identity.schoolId } })
      : await prisma.feeStructure.findFirst({
          where: { schoolId: identity.schoolId, branchId: input.branchId, classId: input.classId, academicYearId: year.id, sectionId },
        });

    const structure = existing
      ? await prisma.feeStructure.update({
          where: { id: existing.id },
          data: { totalAmount, isActive: true, sectionId },
        })
      : await prisma.feeStructure.create({
          data: {
            branchId: input.branchId,
            classId: input.classId,
            sectionId,
            academicYearId: year.id,
            schoolId: identity.schoolId,
            name: section ? `${klass.name} (${section.name}) - ${year.name}` : `${klass.name} - ${year.name}`,
            totalAmount,
            isActive: true,
          },
        });

    await prisma.feeTemplateComponent.deleteMany({ where: { templateId: structure.id, schoolId: identity.schoolId } });
    await prisma.feeTemplateComponent.createMany({
      data: [
        { templateId: structure.id, componentId: tuitionComponentId, amount: tuitionFee, scheduleType: "TERM", schoolId: identity.schoolId, branchId: input.branchId },
        ...(admissionFee > 0
          ? [{ templateId: structure.id, componentId: admissionComponentId, amount: admissionFee, scheduleType: "ONE_TIME", schoolId: identity.schoolId, branchId: input.branchId }]
          : []),
        ...(transportFee > 0
          ? [{ templateId: structure.id, componentId: transportComponentId, amount: transportFee, scheduleType: "TERM", schoolId: identity.schoolId, branchId: input.branchId }]
          : []),
      ],
    });

    revalidatePath("/simple/fee-master");
    return { success: true as const, id: structure.id };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not save the fee master." };
  }
}

export type BulkFeeMasterChanges = Partial<{ tuitionFee: number; admissionFee: number; transportFee: number }>;

/** Applied by the Fee Master page's "View as Excel" grid — one row per class/section. */
export async function bulkUpdateFeeMaster(rows: { id: string; changes: BulkFeeMasterChanges }[]) {
  const identity = await requireIdentity();
  if (!MANAGER_ROLES.has(identity.role)) {
    return { success: false as const, saved: 0, failed: rows.length, errors: ["Only owners/admins can edit the Fee Master."] };
  }

  const results: { id: string; success: boolean; error?: string }[] = [];
  for (const row of rows) {
    const existing = await prisma.feeStructure.findFirst({
      where: { id: row.id, schoolId: identity.schoolId },
      include: { components: { include: { masterComponent: { select: { name: true } } } } },
    });
    if (!existing) {
      results.push({ id: row.id, success: false, error: "Not found" });
      continue;
    }
    const byName = (needle: string) =>
      existing.components.find((c) => c.masterComponent?.name?.toLowerCase().includes(needle))?.amount;
    const res = await saveFeeMaster({
      id: existing.id,
      branchId: existing.branchId,
      classId: existing.classId!,
      sectionId: existing.sectionId,
      tuitionFee: row.changes.tuitionFee ?? toNumber(byName("tuition")),
      admissionFee: row.changes.admissionFee ?? toNumber(byName("admission")),
      transportFee: row.changes.transportFee ?? toNumber(byName("transport")),
    });
    results.push({ id: row.id, success: res.success, error: res.success ? undefined : res.error });
  }

  const failed = results.filter((r) => !r.success);
  revalidatePath("/simple/fee-master");
  return {
    success: failed.length === 0,
    saved: results.length - failed.length,
    failed: failed.length,
    errors: failed.map((f) => `${f.id}: ${f.error}`),
  };
}

export async function setFeeMasterActive(id: string, isActive: boolean) {
  try {
    const identity = await requireIdentity();
    if (!MANAGER_ROLES.has(identity.role)) {
      return { success: false as const, error: "Only owners/admins can edit the Fee Master." };
    }
    await prisma.feeStructure.update({ where: { id, schoolId: identity.schoolId } as any, data: { isActive } });
    revalidatePath("/simple/fee-master");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not update the fee master." };
  }
}

// ---------- Discount Types (the catalog) ----------

export async function listDiscountTypes(branchId?: string, q?: string) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = MANAGER_ROLES.has(identity.role);
    const effectiveBranchId = canPickBranch ? branchId : identity.branchId;

    const rows = await prisma.discountType.findMany({
      where: {
        schoolId: identity.schoolId,
        ...(effectiveBranchId ? { OR: [{ branchId: effectiveBranchId }, { branchId: null }] } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      include: { branch: { select: { name: true } } },
      orderBy: { name: "asc" },
    });

    return {
      success: true as const,
      data: rows.map((d) => ({
        id: d.id,
        name: d.name,
        amount: d.amount ? toNumber(d.amount) : null,
        percentage: d.percentage ? toNumber(d.percentage) : null,
        kind: d.percentage != null ? ("percentage" as const) : ("amount" as const),
        value: d.percentage != null ? toNumber(d.percentage) : toNumber(d.amount),
        branchName: d.branch?.name ?? "All branches",
        isActive: d.isActive,
      })),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load discount types." };
  }
}

export async function saveDiscountType(input: {
  id?: string;
  name: string;
  kind: "amount" | "percentage";
  value: number;
  branchId?: string;
}) {
  try {
    const identity = await requireIdentity();
    if (!MANAGER_ROLES.has(identity.role)) {
      return { success: false as const, error: "Only owners/admins can manage discount types." };
    }
    const name = input.name.trim();
    if (!name) return { success: false as const, error: "Name is required." };
    const value = Math.max(0, Number(input.value) || 0);

    const data = {
      name,
      amount: input.kind === "amount" ? value : null,
      percentage: input.kind === "percentage" ? value : null,
      branchId: input.branchId || null,
      schoolId: identity.schoolId,
      isActive: true,
    };

    if (input.id) {
      await prisma.discountType.update({ where: { id: input.id, schoolId: identity.schoolId } as any, data });
    } else {
      await prisma.discountType.create({ data });
    }

    revalidatePath("/simple/discounts");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not save the discount type." };
  }
}

export async function setDiscountTypeActive(id: string, isActive: boolean) {
  try {
    const identity = await requireIdentity();
    if (!MANAGER_ROLES.has(identity.role)) {
      return { success: false as const, error: "Only owners/admins can manage discount types." };
    }
    await prisma.discountType.update({ where: { id, schoolId: identity.schoolId } as any, data: { isActive } });
    revalidatePath("/simple/discounts");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not update the discount type." };
  }
}

/**
 * Applied by the Discounts page's "View as Excel" grid — edits name and the
 * single "Value" column, kept as whichever kind (₹ amount or %) the type
 * already is; switching a type between amount-based and percentage-based
 * stays a deliberate action on the add/edit form, not a spreadsheet edit.
 */
export async function bulkUpdateDiscountTypes(
  rows: { id: string; changes: Partial<{ name: string; value: number }> }[]
) {
  const identity = await requireIdentity();
  if (!MANAGER_ROLES.has(identity.role)) {
    return { success: false as const, saved: 0, failed: rows.length, errors: ["Only owners/admins can manage discount types."] };
  }

  const results: { id: string; success: boolean; error?: string }[] = [];
  for (const row of rows) {
    try {
      const existing = await prisma.discountType.findFirst({ where: { id: row.id, schoolId: identity.schoolId } });
      if (!existing) {
        results.push({ id: row.id, success: false, error: "Not found" });
        continue;
      }
      const data: Record<string, any> = {};
      if (row.changes.name !== undefined) data.name = row.changes.name.trim();
      if (row.changes.value !== undefined) {
        const value = Math.max(0, Number(row.changes.value) || 0);
        if (existing.percentage != null) data.percentage = value;
        else data.amount = value;
      }
      await prisma.discountType.update({ where: { id: row.id }, data });
      results.push({ id: row.id, success: true });
    } catch (error: any) {
      results.push({ id: row.id, success: false, error: error.message });
    }
  }

  const failed = results.filter((r) => !r.success);
  revalidatePath("/simple/discounts");
  return {
    success: failed.length === 0,
    saved: results.length - failed.length,
    failed: failed.length,
    errors: failed.map((f) => `${f.id}: ${f.error}`),
  };
}

// ---------- Applying a discount to one student ----------

async function recomputeStudentDiscount(financialRecordId: string, schoolId: string) {
  const [financial, discounts] = await Promise.all([
    prisma.financialRecord.findFirst({ where: { id: financialRecordId, schoolId } }),
    prisma.discount.findMany({ where: { studentFinancialId: financialRecordId, schoolId, status: { not: "Rejected" } } }),
  ]);
  if (!financial) return;
  const totalDiscount = discounts.reduce((sum, d) => sum + toNumber(d.amount), 0);
  const tuitionFee = toNumber(financial.tuitionFee);
  const netTuition = Math.max(tuitionFee - totalDiscount, 0);
  await prisma.financialRecord.update({ where: { id: financialRecordId }, data: { totalDiscount, netTuition } });
}

/** Every discount currently applied to one student, for the student detail page. */
export async function listStudentDiscounts(studentId: string) {
  try {
    const identity = await requireIdentity();
    const financial = await prisma.financialRecord.findFirst({ where: { studentId, schoolId: identity.schoolId } });
    if (!financial) return { success: true as const, data: [] };

    const discounts = await prisma.discount.findMany({
      where: { studentFinancialId: financial.id, schoolId: identity.schoolId },
      include: { discountType: { select: { name: true } } },
      orderBy: { id: "desc" },
    });

    return {
      success: true as const,
      data: discounts.map((d) => ({
        id: d.id,
        name: d.discountType?.name ?? "Discount",
        amount: toNumber(d.amount),
        reason: d.reason,
        status: d.status,
      })),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load discounts." };
  }
}

export async function applyDiscountToStudent(input: { studentId: string; discountTypeId: string; reason?: string }) {
  try {
    const identity = await requireIdentity();

    const student = await prisma.student.findFirst({
      where: { id: input.studentId, schoolId: identity.schoolId },
      select: { id: true, financial: { select: { id: true, tuitionFee: true } } },
    });
    if (!student || !student.financial) {
      return { success: false as const, error: "Student (or their fee record) not found." };
    }

    const discountType = await prisma.discountType.findFirst({
      where: { id: input.discountTypeId, schoolId: identity.schoolId },
    });
    if (!discountType) return { success: false as const, error: "Discount type not found." };

    const amount = discountType.amount
      ? toNumber(discountType.amount)
      : discountType.percentage
        ? Math.round((toNumber(discountType.percentage) / 100) * toNumber(student.financial.tuitionFee))
        : 0;

    await prisma.discount.create({
      data: {
        schoolId: identity.schoolId,
        branchId: identity.branchId || undefined,
        studentFinancialId: student.financial.id,
        discountTypeId: discountType.id,
        amount,
        status: "Approved",
        reason: input.reason?.trim() || `${discountType.name} applied via /simple`,
      } as any,
    });

    await recomputeStudentDiscount(student.financial.id, identity.schoolId);

    revalidatePath(`/simple/students/${input.studentId}`);
    return { success: true as const, amount };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not apply the discount." };
  }
}

export async function removeDiscountFromStudent(discountId: string, studentId: string) {
  try {
    const identity = await requireIdentity();
    const discount = await prisma.discount.findFirst({ where: { id: discountId, schoolId: identity.schoolId } });
    if (!discount) return { success: false as const, error: "Discount not found." };

    await prisma.discount.delete({ where: { id: discountId } });
    await recomputeStudentDiscount(discount.studentFinancialId, identity.schoolId);

    revalidatePath(`/simple/students/${studentId}`);
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not remove the discount." };
  }
}
