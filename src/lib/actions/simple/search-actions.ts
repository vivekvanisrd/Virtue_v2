"use server";

/**
 * Universal search — the header search box. Looks across every domain
 * /simple currently has (students, payments/receipts, fee master, discount
 * types) and returns a small set of top matches per category. Kept as one
 * function (not one per domain) so adding a new domain later means adding
 * one more Promise.all branch here, not touching the header component.
 */

import prisma from "../../prisma";
import { requireIdentity, toNumber } from "./shared";

export type UniversalSearchResults = {
  students: { id: string; name: string; admissionNumber: string | null; className: string | null }[];
  collections: { id: string; receiptNumber: string; bookReceiptNo: string | null; studentName: string; amountPaid: number }[];
  feeMaster: { id: string; label: string }[];
  discountTypes: { id: string; name: string }[];
};

export async function universalSearch(query: string): Promise<
  { success: true; data: UniversalSearchResults } | { success: false; error: string }
> {
  try {
    const identity = await requireIdentity();
    const q = query.trim();
    if (q.length < 2) {
      return { success: true, data: { students: [], collections: [], feeMaster: [], discountTypes: [] } };
    }

    const [students, collections, feeStructures, discountTypes] = await Promise.all([
      prisma.student.findMany({
        where: {
          schoolId: identity.schoolId,
          isDeleted: false,
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { admissionNumber: { contains: q, mode: "insensitive" } },
            { family: { fatherName: { contains: q, mode: "insensitive" } } },
            { family: { fatherPhone: { contains: q, mode: "insensitive" } } },
          ],
        },
        include: { academic: { include: { class: true } } },
        take: 6,
      }),
      prisma.collection.findMany({
        where: {
          schoolId: identity.schoolId,
          isDeleted: false,
          OR: [
            { receiptNumber: { contains: q, mode: "insensitive" } },
            { bookReceiptNo: { contains: q, mode: "insensitive" } },
          ],
        },
        include: { student: { select: { firstName: true, lastName: true } } },
        take: 6,
        orderBy: { paymentDate: "desc" },
      }),
      prisma.feeStructure.findMany({
        where: {
          schoolId: identity.schoolId,
          OR: [{ name: { contains: q, mode: "insensitive" } }, { class: { name: { contains: q, mode: "insensitive" } } }],
        },
        include: { class: { select: { name: true } }, branch: { select: { name: true } }, section: { select: { name: true } } },
        take: 6,
      }),
      prisma.discountType.findMany({
        where: { schoolId: identity.schoolId, name: { contains: q, mode: "insensitive" } },
        take: 6,
      }),
    ]);

    return {
      success: true,
      data: {
        students: students.map((s) => ({
          id: s.id,
          name: [s.firstName, s.lastName].filter(Boolean).join(" "),
          admissionNumber: s.admissionNumber,
          className: s.academic?.class?.name ?? null,
        })),
        collections: collections.map((c) => ({
          id: c.id,
          receiptNumber: c.receiptNumber,
          bookReceiptNo: c.bookReceiptNo,
          studentName: [c.student.firstName, c.student.lastName].filter(Boolean).join(" "),
          amountPaid: toNumber(c.amountPaid),
        })),
        feeMaster: feeStructures.map((f) => ({
          id: f.id,
          label: [f.branch?.name, f.class?.name, f.section?.name ? `Section ${f.section.name}` : null].filter(Boolean).join(" · "),
        })),
        discountTypes: discountTypes.map((d) => ({ id: d.id, name: d.name })),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message ?? "Search failed." };
  }
}
