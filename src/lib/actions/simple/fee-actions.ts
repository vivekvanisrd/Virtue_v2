"use server";

/**
 * SIMPLE FEE ENGINE — new, additive module for the "/simple" frontend.
 *
 * Why this exists: the existing fee-calculation code (finance-actions.ts and
 * friends) has four coexisting generations of logic and known, recurring bugs
 * around discount double-counting and totalPaid fallbacks. Rather than touch
 * that code (and risk the existing frontend that depends on it), this is a
 * single, independent source of truth used only by the new "/simple" routes.
 *
 * Reality check performed against the live database before writing this:
 * FeeInvoice/FeeInvoiceItem (the fully-normalized invoice system) has ZERO
 * rows in production — every real student's charges live on FinancialRecord
 * (fixed fee-amount columns) plus, for a small number of students, extra
 * StudentFeeComponent rows. So this module deliberately does not touch the
 * FeeInvoice subsystem at all; it computes directly from what's actually
 * populated.
 *
 * Balance = (net tuition + every populated ancillary fee column on
 * FinancialRecord + any applicable StudentFeeComponent net amounts)
 * minus (sum of Collection.amountPaid for that student, successful & not
 * deleted). Deliberately uses `amountPaid`, never the ambiguous `totalPaid`
 * field (totalPaid also includes late fees/convenience fees, which is the
 * exact field the existing code has had recurring "totalPaid fallback" bugs
 * around).
 */

import prisma from "../../prisma";
import { CounterService } from "../../services/counter-service";
import { serializeDecimal } from "../../utils/serialization";
import { revalidatePath } from "next/cache";
import { requireIdentity, toNumber, computeTuitionAndAncillary, computeTermBreakdown } from "./shared";
import type { PaymentMode } from "./payment-modes";
import { broadcastBranchUpdate } from "./realtime";

/**
 * Returns a full, correct balance breakdown for one student.
 * Tenancy is enforced by the shared `prisma` client (see src/lib/prisma.ts) —
 * a STAFF/PRINCIPAL identity querying a student outside their branch simply
 * gets null back, because the tenancy extension injects branchId into the
 * where clause before this ever reaches the database.
 */
/**
 * Slim summary for the hover-card popup — name/class/branch/parent contact
 * plus total/paid/balance, nothing else. Deliberately not the full
 * getStudentBalance() payload (no payment history, no term breakdown): this
 * runs on every hover, so it stays cheap.
 */
export async function getStudentQuickInfo(studentId: string) {
  try {
    const identity = await requireIdentity();
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: identity.schoolId },
      include: {
        financial: { include: { components: true } },
        academic: { include: { class: true, section: true } },
        branch: { select: { name: true } },
        family: { select: { fatherName: true, fatherPhone: true } },
        collections: { where: { status: "Success", isDeleted: false }, select: { amountPaid: true } },
      },
    });
    if (!student) return { success: false as const, error: "Student not found." };

    const { tuition, ancillary } = computeTuitionAndAncillary(student.financial as any);
    const extra = (student.financial?.components ?? [])
      .filter((c) => c.isApplicable)
      .reduce((sum, c) => sum + toNumber(c.baseAmount) - toNumber(c.waiverAmount) - toNumber(c.discountAmount), 0);
    const totalCharges = tuition + ancillary.reduce((sum, r) => sum + r.amount, 0) + extra;
    const paid = student.collections.reduce((sum, c) => sum + toNumber(c.amountPaid), 0);

    return {
      success: true as const,
      data: {
        id: student.id,
        name: [student.firstName, student.lastName].filter(Boolean).join(" "),
        admissionNumber: student.admissionNumber,
        gender: student.gender ?? null,
        className: student.academic?.class?.name ?? null,
        sectionName: student.academic?.section?.name ?? null,
        branchName: student.branch?.name ?? null,
        parentName: student.family?.fatherName ?? null,
        parentPhone: (student.family?.fatherPhone ?? "").replace(/\.0$/, "") || null,
        totalCharges,
        paid,
        balance: totalCharges - paid,
      },
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load student details." };
  }
}

export async function getStudentBalance(studentId: string) {
  try {
    const identity = await requireIdentity();

    // Explicit schoolId: DEVELOPER/PLATFORM_ADMIN bypass the tenancy
    // extension's auto-scoping (see dashboard-actions.ts), so this tool
    // (scoped to one school by design, unlike the platform-wide admin
    // panels) must filter by school itself rather than rely on that.
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: identity.schoolId },
      include: {
        financial: {
          include: {
            components: { include: { masterComponent: true } },
          },
        },
        academic: { include: { class: true, section: true } },
        family: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    if (!student) {
      return { success: false as const, error: "Student not found (or not in your branch)." };
    }

    const { tuition, ancillary } = computeTuitionAndAncillary(student.financial as any);
    const grossTuition = toNumber(student.financial?.tuitionFee) || tuition;
    const discount = toNumber(student.financial?.totalDiscount);

    const extraComponents = (student.financial?.components ?? [])
      .filter((c) => c.isApplicable)
      .map((c) => ({
        label: c.masterComponent?.name ?? "Additional fee",
        amount: toNumber(c.baseAmount) - toNumber(c.waiverAmount) - toNumber(c.discountAmount),
      }))
      .filter((row) => row.amount !== 0);

    const totalCharges =
      tuition +
      ancillary.reduce((sum, row) => sum + row.amount, 0) +
      extraComponents.reduce((sum, row) => sum + row.amount, 0);

    const collections = await prisma.collection.findMany({
      where: { studentId, schoolId: identity.schoolId, status: "Success", isDeleted: false },
      orderBy: { paymentDate: "desc" },
      select: {
        id: true,
        receiptNumber: true,
        bookReceiptNo: true,
        amountPaid: true,
        paymentMode: true,
        paymentReference: true,
        paymentDate: true,
        collectedBy: true,
        allocatedTo: true,
      },
    });

    const totalPaid = collections.reduce((sum, c) => sum + toNumber(c.amountPaid), 0);
    const balance = totalCharges - totalPaid;
    const termBreakdown = computeTermBreakdown(student.financial as any, collections);

    return {
      success: true as const,
      data: serializeDecimal({
        termBreakdown,
        student: {
          id: student.id,
          name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
          admissionNumber: student.admissionNumber,
          studentCode: student.studentCode,
          className: student.academic?.class?.name ?? null,
          sectionName: student.academic?.section?.name ?? null,
          branchId: student.branch?.id ?? null,
          branchName: student.branch?.name ?? null,
          parentName: student.family?.fatherName || student.family?.motherName || null,
          parentPhone: student.family?.fatherPhone || student.family?.motherPhone || null,
          family: student.family
            ? {
                fatherName: student.family.fatherName,
                fatherPhone: student.family.fatherPhone,
                fatherOccupation: student.family.fatherOccupation,
                motherName: student.family.motherName,
                motherPhone: student.family.motherPhone,
                motherOccupation: student.family.motherOccupation,
                whatsappNumber: student.family.whatsappNumber,
                emergencyName: student.family.emergencyName,
                emergencyPhone: student.family.emergencyPhone,
                emergencyRelation: student.family.emergencyRelation,
              }
            : null,
        },
        charges: {
          grossTuition,
          discount,
          tuition,
          ancillary,
          extraComponents,
          totalCharges,
        },
        totalPaid,
        balance,
        payments: collections,
      }),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Failed to load balance." };
  }
}

/** Branch-safe (auto-scoped) search — used by the student picker. */
export async function searchStudents(query: string) {
  try {
    const identity = await requireIdentity();
    const q = query.trim();
    if (q.length < 2) return { success: true as const, data: [] };

    const students = await prisma.student.findMany({
      where: {
        schoolId: identity.schoolId,
        isDeleted: false,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { admissionNumber: { contains: q, mode: "insensitive" } },
          { studentCode: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 25,
      include: { academic: { include: { class: true } }, branch: { select: { name: true } } },
      orderBy: { firstName: "asc" },
    });

    return {
      success: true as const,
      data: students.map((s) => ({
        id: s.id,
        name: [s.firstName, s.lastName].filter(Boolean).join(" "),
        admissionNumber: s.admissionNumber,
        className: s.academic?.class?.name ?? null,
        branchName: s.branch?.name ?? null,
      })),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Search failed." };
  }
}

export async function recordPayment(input: {
  studentId: string;
  amount: number;
  mode: PaymentMode;
  reference?: string;
  feeHead?: string;
  manualReceiptNumber?: string;
  /** Sheet-sync only: preserves the real collecting staff's name from the
   * imported source instead of attributing the payment to whoever runs the
   * sync. Omitted (default) for the normal live Collect-a-fee flow, where
   * `identity.name` is correct because the logged-in user IS the collector. */
  collectedByOverride?: string;
}) {
  try {
    const identity = await requireIdentity();

    if (!input.amount || input.amount <= 0) {
      return { success: false as const, error: "Enter an amount greater than zero." };
    }

    // Matches the legacy system's rule: every non-cash mode (Online/UPI/Card/
    // Cheque/Bank Transfer) needs a reference/transaction ID for
    // reconciliation — Cash is the only mode that doesn't need one.
    if (input.mode !== "Cash" && !input.reference?.trim()) {
      return { success: false as const, error: `Enter a transaction reference / ID for a ${input.mode} payment.` };
    }

    // NOTE: the shared tenancy extension (src/lib/prisma-tenancy.ts) strips the
    // scalar `schoolId`/`branchId` fields off every returned row as a PII/leak
    // guard — that's intentional shared behavior, not a bug. Read the ids off
    // the nested school/branch relations instead (their own `id` field is not
    // on the strip list).
    const student = await prisma.student.findFirst({
      where: { id: input.studentId, schoolId: identity.schoolId },
      select: {
        id: true,
        school: { select: { id: true, code: true } },
        branch: { select: { id: true, code: true } },
      },
    });
    if (!student || !student.school || !student.branch) {
      return { success: false as const, error: "Student not found (or not in your branch)." };
    }

    const financialYear = await prisma.financialYear.findFirst({
      where: { schoolId: student.school.id, isCurrent: true },
    });
    if (!financialYear) {
      return { success: false as const, error: "No active financial year is configured for this school yet." };
    }

    const year = new Date().getFullYear().toString();
    const receiptNumber = await CounterService.generateReceiptNumber({
      schoolId: student.school.id,
      schoolCode: student.school.code,
      branchId: student.branch.id,
      branchCode: student.branch.code,
      year,
    });

    const feeHead = input.feeHead?.trim() || "General";

    await prisma.collection.create({
      data: {
        receiptNumber,
        bookReceiptNo: input.manualReceiptNumber?.trim() || null,
        studentId: student.id,
        schoolId: student.school.id,
        branchId: student.branch.id,
        financialYearId: financialYear.id,
        amountPaid: input.amount,
        totalPaid: input.amount,
        paymentMode: input.mode,
        paymentReference: input.reference?.trim() || null,
        paymentDate: new Date(),
        collectedBy: input.collectedByOverride?.trim() || identity.name || identity.role,
        status: "Success",
        allocatedTo: {
          terms: [feeHead],
          feeHead,
          auditMeta: {
            cash: input.mode === "Cash" ? input.amount : 0,
            online: input.mode !== "Cash" ? input.amount : 0,
          },
        },
      } as any,
    });

    revalidatePath(`/simple/students/${student.id}`);
    broadcastBranchUpdate(student.branch.id).catch(() => {});

    const refreshed = await getStudentBalance(student.id);
    return { success: true as const, receiptNumber, balance: refreshed.success ? refreshed.data.balance : null };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Failed to record payment." };
  }
}
