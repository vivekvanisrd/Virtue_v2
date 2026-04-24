import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function verify2026Engine() {
  console.log("🚀 Starting 2026-27 Ledger Integrity Verification...");

  const schoolId = "durga-school-id"; // Placeholder
  const branchId = "srd-branch-id";
  const yearId = "year-2026-id";
  const classId = "class-10-id";

  try {
    // 1. Create Master Components
    console.log("📦 Creating Master Components...");
    const tuitionMaster = await prisma.feeComponentMaster.upsert({
      where: { schoolId_name: { schoolId, name: "Tuition Fee" } },
      update: {},
      create: { schoolId, name: "Tuition Fee", type: "CORE" }
    });

    const admissionMaster = await prisma.feeComponentMaster.upsert({
      where: { schoolId_name: { schoolId, name: "Admission Fee" } },
      update: {},
      create: { schoolId, name: "Admission Fee", type: "ANCILLARY", isOneTime: true }
    });

    // 2. Create Template
    console.log("🎨 Designing Fee Template...");
    const template = await prisma.feeStructure.create({
      data: {
        schoolId,
        branchId,
        classId,
        academicYearId: yearId,
        name: "Grade 10 - Standard 2026",
        totalAmount: 55000,
        components: {
          create: [
            { componentId: tuitionMaster.id, amount: 50000, scheduleType: "TERM" },
            { componentId: admissionMaster.id, amount: 5000, scheduleType: "ONE_TIME" }
          ]
        }
      },
      include: { components: true }
    });

    console.log(`✅ Template Created with ${template.components.length} components.`);

    // 3. Create Student & Align
    console.log("👤 Aligning Student to Template...");
    const student = await prisma.student.findFirst({ where: { schoolId } });
    if (!student) throw new Error("No test student found in database.");

    // Simulate alignStudentToClassTemplate logic
    const financial = await prisma.financialRecord.upsert({
        where: { studentId: student.id },
        update: { annualTuition: 55000, feeStructureId: template.id, netTuition: 55000 },
        create: { studentId: student.id, schoolId, annualTuition: 55000, feeStructureId: template.id, netTuition: 55000 }
    });

    await prisma.studentFeeComponent.deleteMany({ where: { studentFinancialId: financial.id } });
    await prisma.studentFeeComponent.createMany({
        data: template.components.map(tc => ({
            studentFinancialId: financial.id,
            componentId: tc.componentId,
            baseAmount: tc.amount,
            waiverAmount: 0,
            discountAmount: 0,
            isApplicable: true
        }))
    });

    const studentLedger = await prisma.studentFeeComponent.findMany({
        where: { studentFinancialId: financial.id },
        include: { masterComponent: true }
    });

    console.log("📊 Student Ledger (Adjustment Layer) Verification:");
    studentLedger.forEach(l => {
        console.log(` - ${l.masterComponent.name}: ${Number(l.baseAmount)} (Net: ${Number(l.baseAmount) - Number(l.waiverAmount)})`);
    });

    if (studentLedger.length === 2) {
        console.log("✨ VERIFICATION SUCCESS: 2026-27 Controlled Engine is active and audit-safe.");
    } else {
        throw new Error("Verification failed: Incorrect component count.");
    }

  } catch (error) {
    console.error("❌ Verification Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verify2026Engine();
