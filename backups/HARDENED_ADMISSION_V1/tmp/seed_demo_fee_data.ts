import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function seedDemoFeeData() {
  console.log("🚀 Seeding Professional Demo Data for 2026-27 Ledger...");

  try {
    const school = await prisma.school.findFirst();
    if (!school) throw new Error("No school found.");
    const schoolId = school.id;

    // 1. Register Professional Component Master
    console.log("📦 Registering Fee Components...");
    const tuition = await prisma.feeComponentMaster.upsert({
      where: { schoolId_name: { schoolId, name: "Tuition Fee" } },
      update: {},
      create: { schoolId, name: "Tuition Fee", type: "CORE", isOneTime: false }
    });

    const admission = await prisma.feeComponentMaster.upsert({
      where: { schoolId_name: { schoolId, name: "Admission Fee" } },
      update: {},
      create: { schoolId, name: "Admission Fee", type: "ANCILLARY", isOneTime: true }
    });

    const sports = await prisma.feeComponentMaster.upsert({
      where: { schoolId_name: { schoolId, name: "Library & Sports Fee" } },
      update: {},
      create: { schoolId, name: "Library & Sports Fee", type: "ANCILLARY", isOneTime: false }
    });

    // 2. Identify a Template to Upgrade (Class 10)
    console.log("🎨 Upgrading Class 10 Template to Modular Architecture...");
    const template = await prisma.feeStructure.findFirst({
      where: { name: { contains: "Class 10" } }
    });

    if (template) {
      // Attach components to this legacy structure
      await prisma.feeTemplateComponent.deleteMany({ where: { templateId: template.id } });
      await prisma.feeTemplateComponent.createMany({
        data: [
          { templateId: template.id, componentId: tuition.id, amount: 45000, scheduleType: "TERM" },
          { templateId: template.id, componentId: admission.id, amount: 5000, scheduleType: "ONE_TIME" },
          { templateId: template.id, componentId: sports.id, amount: 5000, scheduleType: "TERM" }
        ]
      });
      console.log(`✅ Template '${template.name}' is now Modular.`);
    }

    // 3. Align a Test Student (The Adjustment Layer)
    const student = await prisma.student.findFirst({ where: { schoolId } });
    if (student && template) {
      console.log(`👤 Aligning Test Student: ${student.name}`);
      const financial = await prisma.financialRecord.upsert({
        where: { studentId: student.id },
        update: { annualTuition: 55000, feeStructureId: template.id, netTuition: 55000 },
        create: { studentId: student.id, schoolId, annualTuition: 55000, feeStructureId: template.id, netTuition: 55000 }
      });

      await prisma.studentFeeComponent.deleteMany({ where: { studentFinancialId: financial.id } });
      await prisma.studentFeeComponent.createMany({
        data: [
          { studentFinancialId: financial.id, componentId: tuition.id, baseAmount: 45000, waiverAmount: 0, discountAmount: 0, isApplicable: true },
          { studentFinancialId: financial.id, componentId: admission.id, baseAmount: 5000, waiverAmount: 0, discountAmount: 0, isApplicable: true },
          { studentFinancialId: financial.id, componentId: sports.id, baseAmount: 5000, waiverAmount: 2000, discountAmount: 0, isApplicable: true, waiverReason: "Sports Achievement Waiver" }
        ]
      });
      console.log("✨ Student Ledger (Adjustment Layer) Initialized with a Waiver.");
    }

    console.log("\n🚀 DEMO SEEDED. Check the output below.");

  } catch (error) {
    console.error("❌ Seeding Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoFeeData();
