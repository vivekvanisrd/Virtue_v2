"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";

/**
 * getManagementFinancialsAction
 * 
 * High-Density Analytics for Owners/Correspondents (Universal Oversight).
 * Captures Concession Impacts, Void Audits, and Reconciliation Health.
 */
export async function getManagementFinancialsAction(targetBranchId?: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const isOwner = ["OWNER", "CORRESPONDENT", "DEVELOPER"].includes(context.role);
    const isPrincipal = ["PRINCIPAL"].includes(context.role);

    if (!isOwner && !isPrincipal) {
        throw new Error("Access Denied: This dashboard is reserved for Group Management only.");
    }
    
    // 1. Resolve Scope (Branch Specific vs. Consolidated Group)
    const scope = (isOwner && !targetBranchId) 
        ? { schoolId: context.schoolId } 
        : { schoolId: context.schoolId, branchId: targetBranchId || context.branchId };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 2-5. Fetch all reports parallel via Promise.all with prismaBypass
    const [collections, cashAccount, voidedCollections, discounts, financialRecords] = await Promise.all([
      prismaBypass.collection.findMany({
        where: { ...scope, paymentDate: { gte: today }, isDeleted: false, status: "Success" }
      }),
      prismaBypass.chartOfAccount.findFirst({
        where: { ...scope, accountCode: "1110" }
      }),
      prismaBypass.collection.findMany({
        where: { ...scope, isDeleted: true, deletedAt: { gte: thirtyDaysAgo } },
        include: { school: true, student: { select: { firstName: true, lastName: true } } }
      }),
      prismaBypass.discount.findMany({
        where: { ...scope, status: "Approved" },
        include: { discountType: true }
      }),
      prismaBypass.studentFinancial.findMany({
        where: scope,
        select: { annualTuition: true, totalDiscount: true }
      })
    ]);
    
    // Split daily collections into Academic vs Transport buckets
    const academicTotal = collections
      .filter((c: any) => !(c.allocatedTo as any)?.ancillaryPaid?.some((a: any) => a?.key?.includes("transport")))
      .reduce((s: number, c: any) => s + Number(c.totalPaid), 0);
    const transportTotal = collections
      .filter((c: any) => (c.allocatedTo as any)?.ancillaryPaid?.some((a: any) => a?.key?.includes("transport")))
      .reduce((s: number, c: any) => s + Number(c.totalPaid), 0);

    const dailyStats = {
      total: collections.reduce((s: number, c: any) => s + Number(c.totalPaid), 0),
      academic: academicTotal,
      transport: transportTotal,
      byMode: collections.reduce((acc: any, c: any) => {
        acc[c.paymentMode] = (acc[c.paymentMode] || 0) + Number(c.totalPaid);
        return acc;
      }, {})
    };

    const vaultHealth = {
        ledgerBalance: Number(cashAccount?.currentBalance || 0),
        status: cashAccount ? "SYNCHRONIZED" : "ACCOUNT_MISSING"
    };

    // Impact: gross potential vs total concessions granted
    const grossPotential = financialRecords.reduce((s: number, r: any) => s + Number(r.annualTuition || 0), 0);
    const totalDiscounts = discounts.reduce((s: number, d: any) => s + Number(d.amount || 0), 0);
    const impact = { grossPotential, totalDiscounts };

    // Risk Flags: elevated void activity signals potential irregularity
    const riskFlags = voidedCollections.length > 3
      ? voidedCollections.slice(0, 5).map((c: any) => ({
          id: c.id.slice(-6).toUpperCase(),
          staff: c.collectedBy || "Staff",
          reason: `Receipt ${c.receiptNumber} voided (${(c.allocatedTo as any)?.waiverReason || "Administrative"})`,
          severity: voidedCollections.length > 10 ? "HIGH" : "MEDIUM"
        }))
      : [];

    return { 
      success: true, 
      data: { 
          dailyStats, 
          vaultHealth, 
          impact,
          riskFlags,
          discountBreakdown: discounts.reduce((acc: any, d: any) => {
            const cat = d.discountType?.name || "General";
            acc[cat] = (acc[cat] || 0) + Number(d.amount);
            return acc;
          }, {}),
          scopeType: (isOwner && !targetBranchId) ? "CONSOLIDATED" : "BRANCH_SPECIFIC"
      } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
