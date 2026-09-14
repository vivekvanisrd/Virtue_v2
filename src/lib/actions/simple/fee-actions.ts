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
import { requireIdentity, toNumber, computeTuitionAndAncillary } from "./shared";

/**
 * Returns a full, correct balance breakdown for one student.
 * Tenancy is enforced by the shared `prisma` client (see src/lib/prisma.ts) —
 * a STAFF/PRINCIPAL identity querying a student outside their branch simply
 * gets null back, because the tenancy extension injects branchId into the
 * where clause before this ever reaches the database.
 */
export async function getStudentBalance(studentId: string) {
  try {
    await requireIdentity();

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        financial: {
          include: {
            components: { include: { masterComponent: true } },
          },
        },
        academic: { include: { class: true, section: true } },
        family: true,
        branch: { select: { name: true, code: true } },
      },
    });

    if (!student) {
      return { success: false as const, error: "Student not found (or not in your branch)." };
    }

    const { tuition, ancillary } = computeTuitionAndAncillary(
      student.financial as unknown as FinancialRecordLike
    );

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
      where: { studentId, status: "Success", isDeleted: false },
      orderBy: { paymentDate: "desc" },
      select: {
        id: true,
        receiptNumber: true,
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

    return {
      success: true as const,
      data: serializeDecimal({
        student: {
          id: student.id,
          name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
          admissionNumber: student.admissionNumber,
          studentCode: student.studentCode,
          className: student.academic?.class?.name ?? null,
          sectionName: student.academic?.section?.name ?? null,
          branchName: student.branch?.name ?? null,
          parentName: student.family?.fatherName || student.family?.motherName || null,
          parentPhone: student.family?.fatherPhone || student.family?.motherPhone || null,
        },
        charges: {
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
    await requireIdentity();
    const q = query.trim();
    if (q.length < 2) return { success: true as const, data: [] };

    const students = await prisma.student.findMany({
      where: {
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
  mode: "Cash" | "Online";
  reference?: string;
  feeHead?: string;
}) {
  try {
    const identity = await requireIdentity();

    if (!input.amount || input.amount <= 0) {
      return { success: false as const, error: "Enter an amount greater than zero." };
    }

    // NOTE: the shared tenancy extension (src/lib/prisma-tenancy.ts) strips the
    // scalar `schoolId`/`branchId` fields off every returned row as a PII/leak
    // guard — that's intentional shared behavior, not a bug. Read the ids off
    // the nested school/branch relations instead (their own `id` field is not
    // on the strip list).
    const student = await prisma.student.findUnique({
      where: { id: input.studentId },
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
        studentId: student.id,
        financialYearId: financialYear.id,
        amountPaid: input.amount,
        totalPaid: input.amount,
        paymentMode: input.mode,
        paymentReference: input.reference?.trim() || null,
        paymentDate: new Date(),
        collectedBy: identity.name || identity.role,
        status: "Success",
        allocatedTo: {
          terms: [feeHead],
          feeHead,
          auditMeta: {
            cash: input.mode === "Cash" ? input.amount : 0,
            online: input.mode === "Online" ? input.amount : 0,
          },
        },
      } as any,
    });

    revalidatePath(`/simple/students/${student.id}`);

    const refreshed = await getStudentBalance(student.id);
    return { success: true as const, receiptNumber, balance: refreshed.success ? refreshed.data.balance : null };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Failed to record payment." };
  }
}
