const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const SCHOOL_ID = "VIVES";
  const BRANCH_ID = "VIVES-RCB";
  const AY_ID = "AY-2025-26-VIVES";
  const TUITION_COMP_ID = "b66c4461-6b95-4928-a313-3d69d4dce604";
  const ADMISSION_COMP_ID = "eb86ef87-3fe5-4326-9669-19b1352190e5";

  console.log("🛡️ [FEE_IMPORT_2025] Initiating Fee Structure Provisioning for AY 2025-26...");

  const data = [
    { name: "Play Group", level: -4, fee: 25000, schedule: "TERM", addAdmission: true },
    { name: "Nursery", level: -3, fee: 25200, schedule: "TERM" },
    { name: "LKG", level: -2, fee: 25300, schedule: "TERM" },
    { name: "UKG", level: -1, fee: 27500, schedule: "TERM" },
    { name: "1st Grade", level: 1, fee: 33000, schedule: "TERM" },
    { name: "2nd Grade", level: 2, fee: 33000, schedule: "TERM" },
    { name: "3rd Grade", level: 3, fee: 35200, schedule: "TERM" },
    { name: "4th Grade", level: 4, fee: 35200, schedule: "TERM" },
    { name: "5th Grade", level: 5, fee: 37400, schedule: "TERM" },
    { name: "6th Grade", level: 6, fee: 37400, schedule: "TERM" },
    { name: "7th Grade", level: 7, fee: 38500, schedule: "TERM" },
    { name: "8th Grade", level: 8, fee: 38500, schedule: "TERM" },
    { name: "9th Grade", level: 9, fee: 42000, schedule: "TERM" }
  ];

  try {
    for (const item of data) {
      // 1. Get or Create Class
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

      // 2. Create Fee Structure Template for 2025-26
      const structureCode = `${SCHOOL_ID}-2025-${item.name.replace(/\s+/g, '-').toUpperCase()}`;
      const totalAmount = item.fee + (item.addAdmission ? 5000 : 0);

      const structure = await prisma.feeStructure.upsert({
        where: { schoolId_structureCode: { schoolId: SCHOOL_ID, structureCode } },
        update: { 
          totalAmount,
          classId: cls.id,
          academicYearId: AY_ID,
          name: `${item.name} - Standard 2025`,
          description: "If fully paid, free books & uniform"
        },
        create: {
          schoolId: SCHOOL_ID,
          branchId: BRANCH_ID,
          classId: cls.id,
          academicYearId: AY_ID,
          name: `${item.name} - Standard 2025`,
          structureCode: structureCode,
          totalAmount,
          description: "If fully paid, free books & uniform"
        }
      });

      // 3. Provision Template Components
      await prisma.feeTemplateComponent.deleteMany({ where: { templateId: structure.id } });
      
      const templateComponents = [
        {
          schoolId: SCHOOL_ID,
          templateId: structure.id,
          componentId: TUITION_COMP_ID,
          amount: item.fee,
          scheduleType: item.schedule
        }
      ];

      if (item.addAdmission) {
        templateComponents.push({
          schoolId: SCHOOL_ID,
          templateId: structure.id,
          componentId: ADMISSION_COMP_ID,
          amount: 5000,
          scheduleType: "ONE_TIME"
        });
      }

      await prisma.feeTemplateComponent.createMany({ data: templateComponents });
      console.log(`✅ [FEE_STRUCTURE] ${item.name}: Tuition: ₹${item.fee}, Admission: ₹${item.addAdmission ? 5000 : 0}`);

      // 4. Align all Students in this class for 2025-26 to this Fee Structure
      const academicRecords = await prisma.academicRecord.findMany({
        where: {
          schoolId: SCHOOL_ID,
          branchId: BRANCH_ID,
          academicYear: AY_ID,
          classId: cls.id
        }
      });

      let studentCount = 0;
      for (const record of academicRecords) {
        // Calculate Term Split: 50% / 25% / 25%
        const t1 = Math.round(item.fee * 0.50);
        const t2 = Math.round(item.fee * 0.25);
        const t3 = item.fee - t1 - t2; // Remaining balance for perfect rounding

        const financial = await prisma.financialRecord.upsert({
          where: { studentId: record.studentId, schoolId: SCHOOL_ID },
          update: {
            annualTuition: totalAmount,
            tuitionFee: item.fee,
            netTuition: totalAmount,
            admissionFee: item.addAdmission ? 5000 : null,
            feeStructureId: structure.id,
            paymentType: "Term-wise",
            term1Amount: t1,
            term2Amount: t2,
            term3Amount: t3,
            branchId: BRANCH_ID
          },
          create: {
            studentId: record.studentId,
            schoolId: SCHOOL_ID,
            annualTuition: totalAmount,
            tuitionFee: item.fee,
            netTuition: totalAmount,
            admissionFee: item.addAdmission ? 5000 : null,
            feeStructureId: structure.id,
            paymentType: "Term-wise",
            term1Amount: t1,
            term2Amount: t2,
            term3Amount: t3,
            branchId: BRANCH_ID
          }
        });

        // Sync Student Fee Components
        await prisma.studentFeeComponent.deleteMany({
          where: { studentFinancialId: financial.id, schoolId: SCHOOL_ID }
        });

        const studentComponents = [
          {
            schoolId: SCHOOL_ID,
            branchId: BRANCH_ID,
            studentFinancialId: financial.id,
            componentId: TUITION_COMP_ID,
            baseAmount: item.fee,
            waiverAmount: 0,
            discountAmount: 0,
            isApplicable: true
          }
        ];

        if (item.addAdmission) {
          studentComponents.push({
            schoolId: SCHOOL_ID,
            branchId: BRANCH_ID,
            studentFinancialId: financial.id,
            componentId: ADMISSION_COMP_ID,
            baseAmount: 5000,
            waiverAmount: 0,
            discountAmount: 0,
            isApplicable: true
          });
        }

        await prisma.studentFeeComponent.createMany({ data: studentComponents });
        studentCount++;
      }

      if (studentCount > 0) {
        console.log(`   ➡️ Aligned ${studentCount} students of ${item.name} to fee template.`);
      }
    }

    console.log("🏁 [IMPORT_COMPLETE] 2025-26 Fee Architecture is live and all students are aligned!");
  } catch (error) {
    console.error("❌ IMPORT_FAILED:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
