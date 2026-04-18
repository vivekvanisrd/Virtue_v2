"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";
import { revalidatePath } from "next/cache";

/**
 * getTransportHubAction
 * 
 * Fetches all Active Routes and their associated Stops for the current School/Branch.
 */
export async function getTransportHubAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const routes = await prisma.transportRoute.findMany({
      where: { schoolId: context.schoolId, isActive: true },
      include: { stops: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' }
    });
    
    return { success: true, data: routes };
  } catch (error: any) {
    return { success: false, error: "Failed to fetch transport data: " + error.message };
  }
}

/**
 * upsertTransportRouteAction
 */
export async function upsertTransportRouteAction(data: {
  id?: string;
  name: string;
  vehicleNo: string;
  driverName?: string;
  capacity?: number;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const route = await prisma.transportRoute.upsert({
      where: { id: data.id || 'new-route' },
      update: {
        name: data.name,
        vehicleNo: data.vehicleNo,
        driverName: data.driverName,
        capacity: data.capacity
      },
      create: {
        schoolId: context.schoolId,
        branchId: context.branchId,
        name: data.name,
        vehicleNo: data.vehicleNo,
        driverName: data.driverName,
        capacity: data.capacity
      }
    });
    
    revalidatePath("/admin/transport");
    return { success: true, data: route };
  } catch (error: any) {
    return { success: false, error: "Failed to save route: " + error.message };
  }
}

/**
 * upsertTransportStopAction
 */
export async function upsertTransportStopAction(data: {
  id?: string;
  routeId: string;
  name: string;
  fare: number;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    
    const stop = await prisma.transportStop.upsert({
      where: { id: data.id || 'new-stop' },
      update: {
        name: data.name,
        fare: data.fare
      },
      create: {
        routeId: data.routeId,
        name: data.name,
        fare: data.fare
      }
    });
    
    revalidatePath("/admin/transport");
    return { success: true, data: stop };
  } catch (error: any) {
    return { success: false, error: "Failed to save stop: " + error.message };
  }
}

/**
 * getStudentTransportAction
 */
export async function getStudentTransportAction(studentId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    
    const assignment = await prisma.transportAssignment.findUnique({
      where: { studentId },
      include: { route: true, stop: true }
    });
    return { success: true, data: assignment };
  } catch (error: any) {
    return { success: false, error: "Failed to fetch student transport: " + error.message };
  }
}

/**
 * recordTransportCollectionAction
 * 
 * Independent Transport Receipt Generation (TS-...)
 */
export async function recordTransportCollectionAction(enquiryId: string, amount: number, remarks?: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    
    // 1. Generate TS Receipt Number
    const count = await prisma.transportCollection.count({ where: { schoolId: context.schoolId } });
    const receiptNo = `TS-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    // 2. Atomic Record
    const result = await prisma.$transaction(async (tx: any) => {
      const collection = await tx.transportCollection.create({
        data: {
          studentId: enquiryId, // Stored as reference for conversion gate
          amount: amount,
          receiptNo,
          remarks: remarks,
          schoolId: context.schoolId,
          branchId: context.branchId
        }
      });

      // 3. Accounting: Debit Cash (1110), Credit Transport Rev (4100)
      const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1110" } });
      const transRevAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4100" } });

      if (cashAcc && transRevAcc) {
        await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
            financialYearId: "FY2026", // Strict mapping for ERP V3
            entryType: "RECEIPT",
            totalDebit: amount,
            totalCredit: amount,
            description: `Transport Fee - Receipt: ${receiptNo}`,
            lines: {
              create: [
                { accountId: cashAcc.id, debit: amount, credit: 0 },
                { accountId: transRevAcc.id, debit: 0, credit: amount },
              ]
            }
          }
        });
        
        await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { increment: amount } } });
        await tx.chartOfAccount.update({ where: { id: transRevAcc.id }, data: { currentBalance: { increment: Number(amount) } } });
      }

      return collection;
    });

    revalidatePath("/admin/transport");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: "Transport collection failure: " + error.message };
  }
}
