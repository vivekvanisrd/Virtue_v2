import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * MASTER GENESIS V4 - ENTERPRISE BACKBONE
 * Provisions the institutional logic for Priority Allocation 
 * and Audit Versioning.
 */
async function main() {
  const SCHOOL_ID = "VIVES";
  const BRANCH_ID = "VIVES-MAIN";

  console.log("🛡️ [MASTER_GENESIS_V4] Initializing Enterprise Protocols...");

  try {
    // 1. Seed Allocation Priorities (Configurable SaaS Logic)
    console.log("--- Seeding Allocation Priorities ---");
    const priorities = [
      { type: "TRANSPORT", order: 10 },
      { type: "TUTION", order: 20 },
      { type: "ADMISSION", order: 30 },
      { type: "OTHER", order: 100 }
    ];

    for (const p of priorities) {
      await prisma.allocationPriority.upsert({
        where: { schoolId_componentType: { schoolId: SCHOOL_ID, componentType: p.type } },
        update: { priority: p.order },
        create: { schoolId: SCHOOL_ID, componentType: p.type, priority: p.order }
      });
      console.log(`✅ [PRIORITY] ${p.type} set to Priority ${p.order}`);
    }

    // 2. Seed Late Fee Rules (Audit Ready)
    console.log("--- Seeding Late Fee Registry ---");
    await prisma.lateFeeRule.upsert({
      where: { schoolId_componentType: { schoolId: SCHOOL_ID, componentType: "TUTION" } },
      update: { graceDays: 5, type: "FIXED", value: 0 }, // optional as per user
      create: { 
        schoolId: SCHOOL_ID, 
        componentType: "TUTION", 
        graceDays: 5, 
        type: "FIXED", 
        value: 0 
      }
    });
    console.log("✅ [LATE_FEE] Tuition Rule: 5-Day Grace Period (Optional) provisioned.");

    // 3. Seed Financial Period (FY 2026-27)
    console.log("--- Seeding Financial Period ---");
    await prisma.financialPeriod.upsert({
      where: { schoolId_year: { schoolId: SCHOOL_ID, year: "2026-27" } },
      update: {},
      create: {
        schoolId: SCHOOL_ID,
        year: "2026-27",
        isLocked: false
      }
    });
    console.log("✅ [PERIOD] Financial Year 2026-27 is now ACTIVE.");

    console.log("🏁 [MASTER_GENESIS_COMPLETE] Enterprise Backbone is officially LIVE and LOCKED.");
  } catch (error) {
    console.error("❌ GENESIS_V4_FAILED:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
