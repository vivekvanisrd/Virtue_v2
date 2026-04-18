import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * SOVEREIGN FEE IMPORT 2026-27 (Hardened v2)
 * Provisions the institutional hierarchy and fee templates
 * for VIVES school. Includes schema workarounds for non-unique tables.
 */
async function main() {
  const SCHOOL_ID = "VIVES";
  const BRANCH_ID = "VIVES-RCB";
  const AY_ID = "AY-2026-27-VIVES";
  const TUITION_COMP_ID = "b66c4461-6b95-4928-a313-3d69d4dce604";
  const ADMISSION_COMP_ID = "eb86ef87-3fe5-4326-9669-19b1352190e5";

  console.log("🛡️ [FEE_IMPORT_2026] Initiating Hardened Provisioning...");

  const data = [
    { name: "Day Care", level: -5, fee: 1000, schedule: "MONTHLY" as const },
    { name: "Play Group", level: -4, fee: 25000, schedule: "TERM" as const, addAdmission: true },
    { name: "Nursery", level: -3, fee: 25500, schedule: "TERM" as const },
    { name: "LKG", level: -2, fee: 25500, schedule: "TERM" as const },
    { name: "UKG", level: -1, fee: 27500, schedule: "TERM" as const },
    { name: "1st Grade", level: 1, fee: 33000, schedule: "TERM" as const },
    { name: "2nd Grade", level: 2, fee: 33000, schedule: "TERM" as const },
    { name: "3rd Grade", level: 3, fee: 35500, schedule: "TERM" as const },
    { name: "4th Grade", level: 4, fee: 35500, schedule: "TERM" as const },
    { name: "5th Grade", level: 5, fee: 37500, schedule: "TERM" as const },
    { name: "6th Grade", level: 6, fee: 37500, schedule: "TERM" as const },
    { name: "7th Grade", level: 7, fee: 38500, schedule: "TERM" as const },
    { name: "8th Grade", level: 8, fee: 38500, schedule: "TERM" as const },
    { name: "9th Grade", level: 9, fee: 42000, schedule: "TERM" as const },
    { name: "10th Grade", level: 10, fee: 46000, schedule: "TERM" as const },
    { name: "11th Grade", level: 11, fee: 55000, schedule: "TERM" as const },
    { name: "12th Grade", level: 12, fee: 60000, schedule: "TERM" as const },
  ];

  try {
    for (const item of data) {
      // 1. Handle Class (Sovereign Manual Sync)
      let cls = await prisma.class.findFirst({
        where: { schoolId: SCHOOL_ID, branchId: BRANCH_ID, name: item.name }
      });

      if (cls) {
        cls = await prisma.class.update({
          where: { id: cls.id },
          data: { level: item.level }
        });
      } else {
        cls = await prisma.class.create({
          data: { schoolId: SCHOOL_ID, branchId: BRANCH_ID, name: item.name, level: item.level }
        });
      }

      // 2. Create Fee Structure Template (Using Unified Code)
      const structureCode = `${SCHOOL_ID}-2026-${item.name.replace(/\s+/g, '-').toUpperCase()}`;
      const structure = await prisma.feeStructure.upsert({
        where: { schoolId_structureCode: { schoolId: SCHOOL_ID, structureCode } },
        update: { 
          totalAmount: item.fee + (item.addAdmission ? 5000 : 0),
          classId: cls.id,
          academicYearId: AY_ID,
          name: `${item.name} - Standard 2026`,
          description: "If fully paid, free books & uniform"
        },
        create: {
          schoolId: SCHOOL_ID,
          branchId: BRANCH_ID,
          classId: cls.id,
          academicYearId: AY_ID,
          name: `${item.name} - Standard 2026`,
          structureCode: structureCode,
          totalAmount: item.fee + (item.addAdmission ? 5000 : 0),
          description: "If fully paid, free books & uniform"
        }
      });

      // 3. Provision Components
      await prisma.feeTemplateComponent.deleteMany({ where: { templateId: structure.id } });
      
      const components = [
        {
          schoolId: SCHOOL_ID,
          templateId: structure.id,
          componentId: TUITION_COMP_ID,
          amount: item.fee,
          scheduleType: item.schedule
        }
      ];

      if (item.addAdmission) {
        components.push({
          schoolId: SCHOOL_ID,
          templateId: structure.id,
          componentId: ADMISSION_COMP_ID,
          amount: 5000,
          scheduleType: "ONE_TIME"
        });
      }

      await prisma.feeTemplateComponent.createMany({ data: components });
      
      console.log(`✅ [HARD-LOCKED] ${item.name}: ₹${item.fee} (${item.schedule})`);
    }

    console.log("🏁 [IMPORT_COMPLETE] Institutional 2026-27 Fee Architecture is LIVE and SYNCED.");
  } catch (error) {
    console.error("❌ IMPORT_FAILED:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
